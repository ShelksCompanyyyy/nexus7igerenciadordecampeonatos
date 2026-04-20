-- =========================================================
-- 1) TEAM LEADER + helper
-- =========================================================
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_leader_id uuid;

CREATE OR REPLACE FUNCTION public.is_team_leader(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams WHERE id = _team_id AND team_leader_id = _user_id
  )
$$;

-- Permitir que líder de line atualize sua própria line (logo, players)
DROP POLICY IF EXISTS "Team leaders update own team" ON public.teams;
CREATE POLICY "Team leaders update own team"
ON public.teams FOR UPDATE
USING (
  team_leader_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = teams.clan_id AND c.owner_id = auth.uid())
  OR is_clan_admin(auth.uid(), teams.clan_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- =========================================================
-- 2) MATCHCW (clã vs clã)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.matchcw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_a_id uuid NOT NULL,
  clan_b_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined | confirmed | finalized
  scheduled_date text,
  scheduled_time text,
  rounds integer DEFAULT 1,
  notes text,
  score_a integer DEFAULT 0,
  score_b integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matchcw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MatchCW viewable by everyone"
ON public.matchcw FOR SELECT USING (true);

CREATE POLICY "Clan leaders create matchcw"
ON public.matchcw FOR INSERT
WITH CHECK (
  is_clan_admin(auth.uid(), clan_a_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Clan leaders update matchcw"
ON public.matchcw FOR UPDATE
USING (
  is_clan_admin(auth.uid(), clan_a_id)
  OR is_clan_admin(auth.uid(), clan_b_id)
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE TRIGGER trg_matchcw_updated_at
BEFORE UPDATE ON public.matchcw
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3) MATCHCW MESSAGES (chat de coordenação - só líderes/vices)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.matchcw_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchcw_id uuid NOT NULL REFERENCES public.matchcw(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text NOT NULL,
  clan_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matchcw_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MatchCW chat readable by leaders"
ON public.matchcw_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matchcw m
    WHERE m.id = matchcw_messages.matchcw_id
      AND (
        is_clan_admin(auth.uid(), m.clan_a_id)
        OR is_clan_admin(auth.uid(), m.clan_b_id)
        OR has_role(auth.uid(), 'superadmin'::app_role)
      )
  )
);

CREATE POLICY "MatchCW chat writable by leaders"
ON public.matchcw_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.matchcw m
    WHERE m.id = matchcw_messages.matchcw_id
      AND m.status IN ('accepted','pending')
      AND (
        is_clan_admin(auth.uid(), m.clan_a_id)
        OR is_clan_admin(auth.uid(), m.clan_b_id)
      )
  )
);

-- =========================================================
-- 4) RPCs MATCHCW
-- =========================================================
CREATE OR REPLACE FUNCTION public.request_matchcw(_clan_a uuid, _clan_b uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _today_count integer;
  _new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _clan_a) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã podem enviar pedidos de MatchCW';
  END IF;
  IF _clan_a = _clan_b THEN RAISE EXCEPTION 'Clãs devem ser diferentes'; END IF;

  -- Limite de 10 matchs por clã por dia (envolvido)
  SELECT COUNT(*) INTO _today_count
  FROM public.matchcw
  WHERE (clan_a_id = _clan_a OR clan_b_id = _clan_a)
    AND created_at::date = current_date
    AND status NOT IN ('declined');
  IF _today_count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido para este clã';
  END IF;

  INSERT INTO public.matchcw(clan_a_id, clan_b_id, requested_by, notes)
  VALUES (_clan_a, _clan_b, auth.uid(), _notes)
  RETURNING id INTO _new_id;

  -- Notificar líderes do clã B
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT cm.user_id,
         '⚔️ Novo desafio MatchCW',
         'Seu clã recebeu um pedido de MatchCW. Acesse a aba MatchCW para responder.',
         'matchcw'
  FROM public.clan_members cm
  WHERE cm.clan_id = _clan_b AND cm.role IN ('leader','co_leader');

  RETURN jsonb_build_object('success', true, 'id', _new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_matchcw(_match_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MatchCW não encontrado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã desafiado podem responder';
  END IF;
  IF _m.status <> 'pending' THEN RAISE EXCEPTION 'Pedido já foi respondido'; END IF;

  UPDATE public.matchcw
     SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
         updated_at = now()
   WHERE id = _match_id;

  -- Notificar quem pediu
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (
    _m.requested_by,
    CASE WHEN _accept THEN '✅ MatchCW aceito' ELSE '❌ MatchCW recusado' END,
    CASE WHEN _accept THEN 'Seu pedido foi aceito! Abra o chat para coordenar.' ELSE 'O clã desafiado recusou.' END,
    'matchcw'
  );

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN _accept THEN 'accepted' ELSE 'declined' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_matchcw(_match_id uuid, _date text, _time text, _rounds integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MatchCW não encontrado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _m.clan_a_id) OR is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _m.status NOT IN ('accepted') THEN RAISE EXCEPTION 'Match não está aceito'; END IF;

  UPDATE public.matchcw
     SET status = 'confirmed',
         scheduled_date = _date,
         scheduled_time = _time,
         rounds = COALESCE(_rounds,1),
         updated_at = now()
   WHERE id = _match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =========================================================
-- 5) PURCHASE ANNOUNCEMENT (mensagem do sistema no chat geral)
-- =========================================================
CREATE OR REPLACE FUNCTION public.announce_purchase(_item_name text, _category text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _nick text;
  _emoji text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT COALESCE(game_nick, username) INTO _nick FROM public.profiles WHERE user_id = auth.uid();
  _emoji := CASE _category
    WHEN 'nick_color' THEN '🎨'
    WHEN 'frame' THEN '🖼️'
    WHEN 'badge' THEN '🏅'
    ELSE '🛍️' END;

  INSERT INTO public.chat_messages(user_id, username, message)
  VALUES (auth.uid(), 'SISTEMA', _emoji || ' ' || COALESCE(_nick,'Alguém') || ' adquiriu: ' || _item_name || '!');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =========================================================
-- 6) SPIN ROULETTE - retornar winner_index sincronizado
-- =========================================================
CREATE OR REPLACE FUNCTION public.spin_roulette()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _r integer;
  _reward integer;
  _winner_index integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;

  IF COALESCE(_profile.free_spins, 0) <= 0 THEN
    RAISE EXCEPTION 'Você precisa de uma roleta grátis para girar';
  END IF;

  _r := floor(random() * 10000)::int;
  IF _r < 2431 THEN _reward := 5;   _winner_index := 0;
  ELSIF _r < 4514 THEN _reward := 10;  _winner_index := 1;
  ELSIF _r < 6250 THEN _reward := 15;  _winner_index := 2;
  ELSIF _r < 7639 THEN _reward := 20;  _winner_index := 3;
  ELSIF _r < 8681 THEN _reward := 25;  _winner_index := 4;
  ELSIF _r < 9375 THEN _reward := 50;  _winner_index := 5;
  ELSIF _r < 9722 THEN _reward := 100; _winner_index := 6;
  ELSIF _r < 9930 THEN _reward := 150; _winner_index := 7;
  ELSE                _reward := 200; _winner_index := 8;
  END IF;

  UPDATE public.profiles
     SET free_spins = free_spins - 1,
         gold = COALESCE(gold,0) + _reward,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.spins(user_id, cost, reward, spin_type)
  VALUES (_user_id, 0, _reward, 'free');

  RETURN jsonb_build_object('reward', _reward, 'winner_index', _winner_index, 'cost', 0, 'spin_type', 'free');
END;
$$;

-- =========================================================
-- 7) Realtime
-- =========================================================
ALTER TABLE public.matchcw REPLICA IDENTITY FULL;
ALTER TABLE public.matchcw_messages REPLICA IDENTITY FULL;
ALTER TABLE public.spins REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='matchcw') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.matchcw';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='matchcw_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.matchcw_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='spins') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.spins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  END IF;
END $$;