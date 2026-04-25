-- ============= 1. CORRIGIR CHECK CONSTRAINT DE NOTIFICATIONS =============
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ============= 2. ADICIONAR COLUNAS DE LINE NO MATCHCW =============
ALTER TABLE public.matchcw
  ADD COLUMN IF NOT EXISTS line_a_id uuid,
  ADD COLUMN IF NOT EXISTS line_b_id uuid,
  ADD COLUMN IF NOT EXISTS line_a_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS line_b_confirmed boolean DEFAULT false;

-- ============= 3. TABELAS DE SUPORTE =============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tickets or staff sees all"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or staff updates ticket"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Read messages of own ticket or staff"
  ON public.support_messages FOR SELECT
  USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_messages.ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Insert message in own ticket or as staff"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'superadmin'::app_role) OR
      EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_messages.ticket_id AND t.user_id = auth.uid())
    )
  );

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= 4. CORRIGIR promote_clan_member PARA ACEITAR 'leader' =============
CREATE OR REPLACE FUNCTION public.promote_clan_member(_target_user uuid, _clan_id uuid, _new_role clan_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT (public.is_clan_admin(auth.uid(), _clan_id) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes podem alterar cargos';
  END IF;

  -- Se promovendo a leader, garante que só superadmin OU dono do clã pode
  IF _new_role = 'leader' THEN
    IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR EXISTS (
      SELECT 1 FROM public.clans WHERE id = _clan_id AND owner_id = auth.uid()
    )) THEN
      RAISE EXCEPTION 'Apenas o dono do clã ou Criador podem promover a líder';
    END IF;
  END IF;

  UPDATE public.clan_members SET role = _new_role
   WHERE clan_id = _clan_id AND user_id = _target_user;

  IF NOT FOUND THEN
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (_clan_id, _target_user, _new_role);
  END IF;

  -- Se promovido a leader/co_leader, garante que role app é 'admin' para acesso ao painel
  IF _new_role IN ('leader','co_leader') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    -- Se já existir um registro com role diferente, faz upgrade
    UPDATE public.user_roles SET role = 'admin'::app_role
     WHERE user_id = _target_user AND role = 'user'::app_role;
  ELSIF _new_role = 'member' THEN
    -- Rebaixar: remove role admin se ele não é dono de outro clã nem superadmin
    IF NOT has_role(_target_user, 'superadmin'::app_role)
       AND NOT EXISTS (SELECT 1 FROM public.clans WHERE owner_id = _target_user)
       AND NOT EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = _target_user AND role IN ('leader','co_leader') AND clan_id <> _clan_id)
       AND NOT EXISTS (SELECT 1 FROM public.teams WHERE (team_leader_id = _target_user OR team_co_leader_id = _target_user))
    THEN
      UPDATE public.user_roles SET role = 'user'::app_role
       WHERE user_id = _target_user AND role = 'admin'::app_role;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user, 'role', _new_role);
END;
$$;

-- ============= 5. PROMOTE/DEMOTE LINE LEADER (líder/vice de line) =============
CREATE OR REPLACE FUNCTION public.set_team_role(_team_id uuid, _target_user uuid, _role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_clan uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _role NOT IN ('leader','co_leader','member') THEN RAISE EXCEPTION 'Cargo inválido'; END IF;

  SELECT clan_id INTO _team_clan FROM public.teams WHERE id = _team_id;
  IF _team_clan IS NULL THEN RAISE EXCEPTION 'Line não encontrada'; END IF;

  IF NOT (is_clan_admin(auth.uid(), _team_clan) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã podem alterar cargos da line';
  END IF;

  IF _role = 'leader' THEN
    UPDATE public.teams SET team_leader_id = _target_user, updated_at = now() WHERE id = _team_id;
  ELSIF _role = 'co_leader' THEN
    UPDATE public.teams SET team_co_leader_id = _target_user, updated_at = now() WHERE id = _team_id;
  ELSE
    -- remove cargo se for ele
    UPDATE public.teams
       SET team_leader_id = CASE WHEN team_leader_id = _target_user THEN NULL ELSE team_leader_id END,
           team_co_leader_id = CASE WHEN team_co_leader_id = _target_user THEN NULL ELSE team_co_leader_id END,
           updated_at = now()
     WHERE id = _team_id;
  END IF;

  -- Se virou líder/vice de line, vira admin para acessar /admin
  IF _role IN ('leader','co_leader') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    UPDATE public.user_roles SET role = 'admin'::app_role
     WHERE user_id = _target_user AND role = 'user'::app_role;
  ELSIF _role = 'member' THEN
    -- Rebaixar: tira admin se não for líder/vice de outra line nem clã admin nem dono
    IF NOT has_role(_target_user, 'superadmin'::app_role)
       AND NOT EXISTS (SELECT 1 FROM public.clans WHERE owner_id = _target_user)
       AND NOT EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = _target_user AND role IN ('leader','co_leader'))
       AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id <> _team_id AND (team_leader_id = _target_user OR team_co_leader_id = _target_user))
    THEN
      UPDATE public.user_roles SET role = 'user'::app_role
       WHERE user_id = _target_user AND role = 'admin'::app_role;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============= 6. REQUEST_MATCHCW COM SUPORTE A LINE =============
CREATE OR REPLACE FUNCTION public.request_matchcw(
  _clan_a uuid,
  _clan_b uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _date text DEFAULT NULL,
  _time text DEFAULT NULL,
  _rounds integer DEFAULT 1,
  _is_bet boolean DEFAULT false,
  _bet_amount numeric DEFAULT 0,
  _line_a uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today_count integer;
  _new_id uuid;
  _balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _clan_a) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes/vice do clã podem criar pedidos de MatchCW';
  END IF;
  IF _clan_b IS NOT NULL AND _clan_a = _clan_b THEN RAISE EXCEPTION 'Clãs devem ser diferentes'; END IF;

  SELECT COUNT(*) INTO _today_count FROM public.matchcw
   WHERE (clan_a_id = _clan_a OR clan_b_id = _clan_a)
     AND created_at::date = current_date AND status NOT IN ('declined');
  IF _today_count >= 10 THEN RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido'; END IF;

  IF _is_bet THEN
    IF _bet_amount IS NULL OR _bet_amount <= 0 THEN RAISE EXCEPTION 'Valor de aposta inválido'; END IF;
    SELECT COALESCE(balance,0) INTO _balance FROM public.economy WHERE user_id = auth.uid();
    IF _balance < _bet_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente. Deposite R$ % primeiro', _bet_amount;
    END IF;
  END IF;

  INSERT INTO public.matchcw(clan_a_id, clan_b_id, requested_by, notes, status,
    proposed_date, proposed_time, proposed_rounds, is_bet_match, bet_amount, bet_status, line_a_id)
  VALUES (_clan_a, _clan_b, auth.uid(), _notes, 'pending',
    _date, _time, COALESCE(_rounds,1), COALESCE(_is_bet,false), COALESCE(_bet_amount,0),
    CASE WHEN _is_bet THEN 'pending' ELSE 'none' END, _line_a)
  RETURNING id INTO _new_id;

  IF _is_bet THEN
    UPDATE public.economy SET balance = balance - _bet_amount, updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.matchcw_bets(matchcw_id, clan_id, user_id, amount, status)
    VALUES (_new_id, _clan_a, auth.uid(), _bet_amount, 'locked');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', _new_id);
END;
$$;

-- ============= 7. CONFIRM LINE NO MATCHCW =============
CREATE OR REPLACE FUNCTION public.set_matchcw_line(_match_id uuid, _line_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
  _line_clan uuid;
  _side text;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match não encontrado'; END IF;
  IF _m.status NOT IN ('accepted','confirmed') THEN RAISE EXCEPTION 'Match não está em estado confirmável'; END IF;

  SELECT clan_id INTO _line_clan FROM public.teams WHERE id = _line_id;
  IF _line_clan IS NULL THEN RAISE EXCEPTION 'Line inválida'; END IF;

  IF _line_clan = _m.clan_a_id AND (is_clan_admin(auth.uid(), _m.clan_a_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    UPDATE public.matchcw SET line_a_id = _line_id, line_a_confirmed = true, updated_at = now() WHERE id = _match_id;
    _side := 'a';
  ELSIF _line_clan = _m.clan_b_id AND (is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    UPDATE public.matchcw SET line_b_id = _line_id, line_b_confirmed = true, updated_at = now() WHERE id = _match_id;
    _side := 'b';
  ELSE
    RAISE EXCEPTION 'Sem permissão ou line não pertence aos clãs do match';
  END IF;

  RETURN jsonb_build_object('success', true, 'side', _side);
END;
$$;

-- ============= 8. CANCELAR / DELETAR MATCHCW =============
CREATE OR REPLACE FUNCTION public.cancel_matchcw(_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match não encontrado'; END IF;
  IF _m.status = 'finalized' THEN RAISE EXCEPTION 'Não é possível cancelar um match finalizado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _m.clan_a_id) OR is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes/vice envolvidos podem cancelar';
  END IF;

  -- Devolver apostas se tiver
  IF _m.is_bet_match AND _m.bet_status IN ('pending','locked') THEN
    UPDATE public.economy e
       SET balance = balance + b.amount, updated_at = now()
      FROM public.matchcw_bets b
     WHERE b.matchcw_id = _match_id AND e.user_id = b.user_id;
    UPDATE public.matchcw_bets SET status = 'refunded' WHERE matchcw_id = _match_id;
  END IF;

  DELETE FROM public.matchcw_messages WHERE matchcw_id = _match_id;
  DELETE FROM public.matchcw_bets WHERE matchcw_id = _match_id;
  DELETE FROM public.matchcw WHERE id = _match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Permitir DELETE em matchcw (precisa para a função acima funcionar com RLS)
CREATE POLICY "Clan leaders delete matchcw"
  ON public.matchcw FOR DELETE
  USING (is_clan_admin(auth.uid(), clan_a_id) OR is_clan_admin(auth.uid(), clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role));

-- ============= 9. AUTO-PROMOVER CRIADOR DE CLÃ NO REGISTRO =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clan_id uuid;
  _clan_text text;
  _role app_role;
BEGIN
  _clan_text := NEW.raw_user_meta_data->>'clan_id';
  IF _clan_text IS NOT NULL AND _clan_text <> '' THEN
    BEGIN
      _clan_id := _clan_text::uuid;
    EXCEPTION WHEN others THEN
      _clan_id := NULL;
    END;
  ELSE
    _clan_id := NULL;
  END IF;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user');

  INSERT INTO public.profiles (user_id, username, email, game_nick, whatsapp, clan_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'game_nick', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    _clan_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  INSERT INTO public.economy (user_id, balance) VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$;

-- ============= 10. AUTO-PROMOVER QUEM CRIA CLÃ A LEADER =============
-- Trigger: ao criar um clã, o owner vira leader em clan_members
CREATE OR REPLACE FUNCTION public.handle_new_clan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'leader')
    ON CONFLICT DO NOTHING;
    -- Garante role admin para acessar painel
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    UPDATE public.user_roles SET role = 'admin'::app_role
     WHERE user_id = NEW.owner_id AND role = 'user'::app_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_clan ON public.clans;
CREATE TRIGGER trg_handle_new_clan
  AFTER INSERT ON public.clans
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_clan();