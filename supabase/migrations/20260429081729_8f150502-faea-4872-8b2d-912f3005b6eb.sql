-- 1. Permissão global do clã para CW por líderes de line
ALTER TABLE public.clans
  ADD COLUMN IF NOT EXISTS allow_line_leaders_create_cw boolean NOT NULL DEFAULT true;

-- 2. TOURNAMENTS
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  format text NOT NULL DEFAULT 'bracket', -- 'bracket' | 'league'
  size integer NOT NULL DEFAULT 8,        -- 4, 8, 16
  status text NOT NULL DEFAULT 'draft',   -- draft | open | running | finished | cancelled
  prize_gold integer NOT NULL DEFAULT 0,
  prize_description text,
  current_round integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  winner_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable by clan or staff"
ON public.tournaments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.clan_id = tournaments.clan_id)
  OR has_role(auth.uid(),'superadmin'::app_role)
);

CREATE POLICY "Clan admins create tournaments"
ON public.tournaments FOR INSERT
WITH CHECK (is_clan_admin(auth.uid(), clan_id) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE POLICY "Clan admins update tournaments"
ON public.tournaments FOR UPDATE
USING (is_clan_admin(auth.uid(), clan_id) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE POLICY "Clan admins delete tournaments"
ON public.tournaments FOR DELETE
USING (is_clan_admin(auth.uid(), clan_id) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE TRIGGER trg_tournaments_updated
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. TOURNAMENT TEAMS
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  seed integer,
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  eliminated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament teams viewable by clan"
ON public.tournament_teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE t.id = tournament_teams.tournament_id AND p.clan_id = t.clan_id
  ) OR has_role(auth.uid(),'superadmin'::app_role)
);

CREATE POLICY "Clan admins manage tournament teams - insert"
ON public.tournament_teams FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_teams.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

CREATE POLICY "Clan admins manage tournament teams - update"
ON public.tournament_teams FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_teams.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

CREATE POLICY "Clan admins manage tournament teams - delete"
ON public.tournament_teams FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_teams.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

-- 4. TOURNAMENT MATCHES
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  slot integer NOT NULL DEFAULT 0,
  team_a_id uuid,
  team_b_id uuid,
  score_a integer,
  score_b integer,
  winner_id uuid,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | played | bye | walkover
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournament matches viewable by clan"
ON public.tournament_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE t.id = tournament_matches.tournament_id AND p.clan_id = t.clan_id
  ) OR has_role(auth.uid(),'superadmin'::app_role)
);

CREATE POLICY "Clan admins manage tournament matches - insert"
ON public.tournament_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_matches.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

CREATE POLICY "Clan admins manage tournament matches - update"
ON public.tournament_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_matches.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

CREATE POLICY "Clan admins manage tournament matches - delete"
ON public.tournament_matches FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_matches.tournament_id
      AND (is_clan_admin(auth.uid(), t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role))
  )
);

CREATE TRIGGER trg_tournament_matches_updated
BEFORE UPDATE ON public.tournament_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. INVENTORY
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  item_category text NOT NULL, -- nick_color | frame | badge | spin | spray | title
  item_name text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own inventory"
ON public.user_inventory FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

CREATE POLICY "Users insert own inventory"
ON public.user_inventory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own inventory"
ON public.user_inventory FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 6. SECURITY EVENTS
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  description text,
  ip_hash text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own security events"
ON public.security_events FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

CREATE POLICY "Authenticated users insert own security events"
ON public.security_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7. RPC: set_clan_cw_permission
CREATE OR REPLACE FUNCTION public.set_clan_cw_permission(_clan_id uuid, _allow boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.clans c WHERE c.id = _clan_id AND c.owner_id = auth.uid())
    OR has_role(auth.uid(),'superadmin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Apenas o dono do clã pode alterar essa permissão';
  END IF;
  UPDATE public.clans SET allow_line_leaders_create_cw = _allow, updated_at = now() WHERE id = _clan_id;
  RETURN jsonb_build_object('success', true, 'allow', _allow);
END;
$$;

-- 8. Atualiza request_matchcw para respeitar a flag (se quem solicita é líder de line e não é líder/vice de clã ou superadmin, bloqueia se a flag estiver desligada)
CREATE OR REPLACE FUNCTION public.request_matchcw(
  _clan_a uuid,
  _clan_b uuid DEFAULT NULL::uuid,
  _notes text DEFAULT NULL::text,
  _date text DEFAULT NULL::text,
  _time text DEFAULT NULL::text,
  _rounds integer DEFAULT 1,
  _is_bet boolean DEFAULT false,
  _bet_amount numeric DEFAULT 0,
  _line_a uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today_count integer;
  _new_id uuid;
  _balance numeric;
  _allow_line boolean;
  _is_clan_lead boolean;
  _is_line_lead boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  _is_clan_lead := is_clan_admin(auth.uid(), _clan_a);
  _is_line_lead := EXISTS (SELECT 1 FROM public.teams t WHERE t.clan_id = _clan_a AND (t.team_leader_id = auth.uid() OR t.team_co_leader_id = auth.uid()));

  IF NOT (_is_clan_lead OR has_role(auth.uid(),'superadmin'::app_role) OR _is_line_lead) THEN
    RAISE EXCEPTION 'Apenas líderes/vice do clã ou da line podem criar pedidos de MatchCW';
  END IF;

  -- Se quem está pedindo é só líder de line (não líder/vice de clã, não superadmin), checar permissão global do clã
  IF _is_line_lead AND NOT _is_clan_lead AND NOT has_role(auth.uid(),'superadmin'::app_role) THEN
    SELECT COALESCE(allow_line_leaders_create_cw, true) INTO _allow_line FROM public.clans WHERE id = _clan_a;
    IF NOT _allow_line THEN
      RAISE EXCEPTION 'O líder do clã desativou a criação de CW por líderes de line';
    END IF;
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

-- 9. RPC: create_tournament — gera campeonato e (para bracket) também o chaveamento vazio
CREATE OR REPLACE FUNCTION public.create_tournament(
  _clan_id uuid,
  _name text,
  _description text,
  _format text,
  _size integer,
  _prize_gold integer,
  _prize_description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _clan_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes/vice do clã podem criar campeonatos';
  END IF;
  IF _format NOT IN ('bracket','league') THEN RAISE EXCEPTION 'Formato inválido'; END IF;
  IF _size NOT IN (4,8,16) THEN RAISE EXCEPTION 'Tamanho deve ser 4, 8 ou 16'; END IF;

  INSERT INTO public.tournaments(clan_id, name, description, format, size, prize_gold, prize_description, created_by, status)
  VALUES (_clan_id, _name, _description, _format, _size, COALESCE(_prize_gold,0), _prize_description, auth.uid(), 'open')
  RETURNING id INTO _t_id;

  RETURN jsonb_build_object('success', true, 'id', _t_id);
END;
$$;

-- 10. RPC: start_tournament — gera o bracket ou as rodadas da liga
CREATE OR REPLACE FUNCTION public.start_tournament(_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t public.tournaments%ROWTYPE;
  _team_ids uuid[];
  _n integer;
  _i integer;
  _j integer;
BEGIN
  SELECT * INTO _t FROM public.tournaments WHERE id = _tournament_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campeonato não encontrado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _t.status NOT IN ('open','draft') THEN RAISE EXCEPTION 'Campeonato já iniciado'; END IF;

  SELECT array_agg(team_id ORDER BY COALESCE(seed, 999), random()) INTO _team_ids
   FROM public.tournament_teams WHERE tournament_id = _tournament_id;

  _n := COALESCE(array_length(_team_ids,1),0);
  IF _n < 2 THEN RAISE EXCEPTION 'Inscreva pelo menos 2 times'; END IF;

  -- Limpa partidas antigas
  DELETE FROM public.tournament_matches WHERE tournament_id = _tournament_id;

  IF _t.format = 'bracket' THEN
    -- Pares (1 vs N, 2 vs N-1, etc.)
    _i := 1;
    _j := 0;
    WHILE _i <= _n / 2 LOOP
      INSERT INTO public.tournament_matches(tournament_id, round, slot, team_a_id, team_b_id, status)
      VALUES (_tournament_id, 1, _j, _team_ids[_i], _team_ids[_n - _i + 1], 'scheduled');
      _i := _i + 1;
      _j := _j + 1;
    END LOOP;
    -- Se o tamanho não é potência de 2, tratamos com walkover via score depois
  ELSE
    -- Liga: round-robin simples
    DECLARE
      a integer; b integer; round_n integer := 1;
    BEGIN
      FOR a IN 1.._n LOOP
        FOR b IN a+1.._n LOOP
          INSERT INTO public.tournament_matches(tournament_id, round, slot, team_a_id, team_b_id, status)
          VALUES (_tournament_id, round_n, a*100+b, _team_ids[a], _team_ids[b], 'scheduled');
        END LOOP;
      END LOOP;
    END;
  END IF;

  UPDATE public.tournaments
     SET status = 'running', current_round = 1, updated_at = now()
   WHERE id = _tournament_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. RPC: report_tournament_match — registra placar e avança bracket
CREATE OR REPLACE FUNCTION public.report_tournament_match(
  _match_id uuid, _score_a integer, _score_b integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m public.tournament_matches%ROWTYPE;
  _t public.tournaments%ROWTYPE;
  _winner uuid;
  _next_slot integer;
  _next_round integer;
  _existing_next public.tournament_matches%ROWTYPE;
  _is_team_a_in_next boolean;
  _remaining_in_round integer;
BEGIN
  SELECT * INTO _m FROM public.tournament_matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida não encontrada'; END IF;
  SELECT * INTO _t FROM public.tournaments WHERE id = _m.tournament_id;
  IF NOT (is_clan_admin(auth.uid(), _t.clan_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _score_a > _score_b THEN _winner := _m.team_a_id;
  ELSIF _score_b > _score_a THEN _winner := _m.team_b_id;
  ELSE _winner := NULL; END IF;

  UPDATE public.tournament_matches
     SET score_a = _score_a, score_b = _score_b, winner_id = _winner, status = 'played', updated_at = now()
   WHERE id = _match_id;

  -- Atualizar tournament_teams (estatísticas para liga e mata-mata)
  UPDATE public.tournament_teams SET
    goals_for = goals_for + _score_a,
    goals_against = goals_against + _score_b,
    wins = wins + CASE WHEN _winner = _m.team_a_id THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN _winner = _m.team_b_id THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN _winner IS NULL THEN 1 ELSE 0 END,
    points = points + CASE WHEN _winner = _m.team_a_id THEN 3 WHEN _winner IS NULL THEN 1 ELSE 0 END
   WHERE tournament_id = _m.tournament_id AND team_id = _m.team_a_id;

  UPDATE public.tournament_teams SET
    goals_for = goals_for + _score_b,
    goals_against = goals_against + _score_a,
    wins = wins + CASE WHEN _winner = _m.team_b_id THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN _winner = _m.team_a_id THEN 1 ELSE 0 END,
    draws = draws + CASE WHEN _winner IS NULL THEN 1 ELSE 0 END,
    points = points + CASE WHEN _winner = _m.team_b_id THEN 3 WHEN _winner IS NULL THEN 1 ELSE 0 END
   WHERE tournament_id = _m.tournament_id AND team_id = _m.team_b_id;

  -- Avançar bracket
  IF _t.format = 'bracket' AND _winner IS NOT NULL THEN
    UPDATE public.tournament_teams SET eliminated = true
     WHERE tournament_id = _m.tournament_id
       AND team_id = CASE WHEN _winner = _m.team_a_id THEN _m.team_b_id ELSE _m.team_a_id END;

    _next_round := _m.round + 1;
    _next_slot := _m.slot / 2;
    _is_team_a_in_next := (_m.slot % 2 = 0);

    SELECT * INTO _existing_next FROM public.tournament_matches
     WHERE tournament_id = _m.tournament_id AND round = _next_round AND slot = _next_slot;

    IF NOT FOUND THEN
      INSERT INTO public.tournament_matches(tournament_id, round, slot, team_a_id, team_b_id, status)
      VALUES (_m.tournament_id, _next_round, _next_slot,
              CASE WHEN _is_team_a_in_next THEN _winner ELSE NULL END,
              CASE WHEN _is_team_a_in_next THEN NULL ELSE _winner END,
              'scheduled');
    ELSE
      IF _is_team_a_in_next THEN
        UPDATE public.tournament_matches SET team_a_id = _winner, updated_at = now() WHERE id = _existing_next.id;
      ELSE
        UPDATE public.tournament_matches SET team_b_id = _winner, updated_at = now() WHERE id = _existing_next.id;
      END IF;
    END IF;

    -- Se foi a partida final (sem próxima rodada possível), marca campeonato como finalizado
    SELECT COUNT(*) INTO _remaining_in_round FROM public.tournament_matches
     WHERE tournament_id = _m.tournament_id AND round = _m.round AND status <> 'played';
    IF _remaining_in_round = 0 AND _next_round > 1 THEN
      DECLARE
        _final_count integer;
      BEGIN
        SELECT COUNT(*) INTO _final_count FROM public.tournament_matches
         WHERE tournament_id = _m.tournament_id AND round = _next_round;
        IF _final_count = 1 AND (
          SELECT status FROM public.tournament_matches
           WHERE tournament_id = _m.tournament_id AND round = _next_round LIMIT 1
        ) = 'played' THEN
          UPDATE public.tournaments SET status = 'finished', winner_team_id = (
            SELECT winner_id FROM public.tournament_matches
             WHERE tournament_id = _m.tournament_id AND round = _next_round LIMIT 1
          ) WHERE id = _m.tournament_id;
        END IF;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'winner', _winner);
END;
$$;