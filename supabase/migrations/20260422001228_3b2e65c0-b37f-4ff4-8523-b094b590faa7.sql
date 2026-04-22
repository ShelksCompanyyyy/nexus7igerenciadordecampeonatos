
-- 1) Vice-líder de line
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_co_leader_id uuid;

CREATE OR REPLACE FUNCTION public.is_team_leader_or_co(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = _team_id 
      AND (team_leader_id = _user_id OR team_co_leader_id = _user_id)
  )
$$;

-- Atualizar RPCs para considerar vice-líder
CREATE OR REPLACE FUNCTION public.update_player_stats(_target_user uuid, _kills integer, _deaths integer, _assists integer, _mvps integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _target_clan uuid;
  _target_team uuid;
  _allowed boolean := false;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Acesso negado: não autenticado'; END IF;
  SELECT clan_id, team_id INTO _target_clan, _target_team FROM public.profiles WHERE user_id = _target_user;
  IF _target_clan IS NULL THEN RAISE EXCEPTION 'Acesso negado: jogador alvo sem clã'; END IF;

  IF has_role(_actor, 'superadmin'::app_role) THEN _allowed := true;
  ELSIF is_clan_admin(_actor, _target_clan) THEN _allowed := true;
  ELSIF _target_team IS NOT NULL AND is_team_leader_or_co(_actor, _target_team) THEN _allowed := true;
  END IF;

  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado: você não tem permissão para editar este jogador'; END IF;

  UPDATE public.profiles SET kills = COALESCE(_kills,kills), deaths = COALESCE(_deaths,deaths),
    assists = COALESCE(_assists,assists), mvps = COALESCE(_mvps,mvps), updated_at = now()
   WHERE user_id = _target_user;
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.manage_team_player(_team_id uuid, _target_user uuid, _action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _team_clan uuid;
  _target_clan uuid;
  _players uuid[];
  _allowed boolean := false;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Acesso negado: não autenticado'; END IF;
  IF _action NOT IN ('add','remove') THEN RAISE EXCEPTION 'Ação inválida'; END IF;

  SELECT clan_id, COALESCE(players,'{}'::uuid[]) INTO _team_clan, _players FROM public.teams WHERE id = _team_id;
  IF _team_clan IS NULL THEN RAISE EXCEPTION 'Line não encontrada'; END IF;

  SELECT clan_id INTO _target_clan FROM public.profiles WHERE user_id = _target_user;
  IF _target_clan IS NULL OR _target_clan <> _team_clan THEN
    RAISE EXCEPTION 'Acesso negado: jogador não pertence ao mesmo clã da line';
  END IF;

  IF has_role(_actor, 'superadmin'::app_role) THEN _allowed := true;
  ELSIF is_clan_admin(_actor, _team_clan) THEN _allowed := true;
  ELSIF is_team_leader_or_co(_actor, _team_id) THEN _allowed := true;
  END IF;

  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado: você não tem permissão sobre esta line'; END IF;

  IF _action = 'add' THEN
    IF array_length(_players,1) >= 5 THEN RAISE EXCEPTION 'Line cheia (máx 5)'; END IF;
    IF _target_user = ANY(_players) THEN RAISE EXCEPTION 'Jogador já está na line'; END IF;
    UPDATE public.teams SET players = array_append(_players,_target_user), updated_at = now() WHERE id = _team_id;
    UPDATE public.profiles SET team_id = _team_id, updated_at = now() WHERE user_id = _target_user;
  ELSE
    UPDATE public.teams SET players = array_remove(_players,_target_user), updated_at = now() WHERE id = _team_id;
    UPDATE public.profiles SET team_id = NULL, updated_at = now() WHERE user_id = _target_user;
  END IF;

  RETURN jsonb_build_object('success', true);
END; $$;

-- 2) MatchCW: novos campos
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS proposed_date text;
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS proposed_time text;
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS proposed_rounds integer DEFAULT 1;
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS is_bet_match boolean NOT NULL DEFAULT false;
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS bet_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS bet_status text DEFAULT 'none';
ALTER TABLE public.matchcw ADD COLUMN IF NOT EXISTS winner_clan_id uuid;

-- 3) Tabela de apostas (escrow)
CREATE TABLE IF NOT EXISTS public.matchcw_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matchcw_id uuid NOT NULL REFERENCES public.matchcw(id) ON DELETE CASCADE,
  clan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.matchcw_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bets viewable by clan leaders"
ON public.matchcw_bets FOR SELECT
USING (
  is_clan_admin(auth.uid(), clan_id) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- 4) request_matchcw atualizado
CREATE OR REPLACE FUNCTION public.request_matchcw(
  _clan_a uuid,
  _clan_b uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _date text DEFAULT NULL,
  _time text DEFAULT NULL,
  _rounds integer DEFAULT 1,
  _is_bet boolean DEFAULT false,
  _bet_amount numeric DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _today_count integer;
  _new_id uuid;
  _balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _clan_a) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã podem enviar pedidos de MatchCW';
  END IF;
  IF _clan_b IS NOT NULL AND _clan_a = _clan_b THEN RAISE EXCEPTION 'Clãs devem ser diferentes'; END IF;

  SELECT COUNT(*) INTO _today_count FROM public.matchcw
   WHERE (clan_a_id = _clan_a OR clan_b_id = _clan_a)
     AND created_at::date = current_date AND status NOT IN ('declined');
  IF _today_count >= 10 THEN RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido'; END IF;

  -- Se for aposta, validar saldo do solicitante (economia)
  IF _is_bet THEN
    IF _bet_amount IS NULL OR _bet_amount <= 0 THEN RAISE EXCEPTION 'Valor de aposta inválido'; END IF;
    SELECT COALESCE(balance,0) INTO _balance FROM public.economy WHERE user_id = auth.uid();
    IF _balance < _bet_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente. Deposite R$ % primeiro', _bet_amount;
    END IF;
  END IF;

  INSERT INTO public.matchcw(clan_a_id, clan_b_id, requested_by, notes, status,
    proposed_date, proposed_time, proposed_rounds, is_bet_match, bet_amount, bet_status)
  VALUES (_clan_a, _clan_b, auth.uid(), _notes, 'pending',
    _date, _time, COALESCE(_rounds,1), COALESCE(_is_bet,false), COALESCE(_bet_amount,0),
    CASE WHEN _is_bet THEN 'pending' ELSE 'none' END)
  RETURNING id INTO _new_id;

  -- Se aposta: debita do solicitante e cria registro escrow
  IF _is_bet THEN
    UPDATE public.economy SET balance = balance - _bet_amount, updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.matchcw_bets(matchcw_id, clan_id, user_id, amount, status)
    VALUES (_new_id, _clan_a, auth.uid(), _bet_amount, 'locked');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', _new_id);
END; $$;

-- 5) respond_matchcw — quem aceita também precisa cobrir aposta
CREATE OR REPLACE FUNCTION public.respond_matchcw(_match_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
  _actor_clan uuid;
  _today_count integer;
  _balance numeric;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MatchCW não encontrado'; END IF;
  IF _m.status <> 'pending' THEN RAISE EXCEPTION 'Pedido já foi respondido'; END IF;

  IF _m.clan_b_id IS NOT NULL THEN
    IF NOT (is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
      RAISE EXCEPTION 'Apenas líderes do clã desafiado podem responder';
    END IF;
    _actor_clan := _m.clan_b_id;
  ELSE
    SELECT clan_id INTO _actor_clan FROM public.clan_members
     WHERE user_id = auth.uid() AND role IN ('leader','co_leader') LIMIT 1;
    IF _actor_clan IS NULL AND NOT has_role(auth.uid(),'superadmin'::app_role) THEN
      RAISE EXCEPTION 'Apenas líderes de clã podem aceitar';
    END IF;
    IF _actor_clan = _m.clan_a_id THEN RAISE EXCEPTION 'Você não pode aceitar o próprio pedido'; END IF;
  END IF;

  IF NOT _accept THEN
    -- Recusa: devolve aposta do solicitante se houver
    IF _m.is_bet_match AND _m.bet_status = 'pending' THEN
      UPDATE public.economy SET balance = balance + _m.bet_amount, updated_at = now()
       WHERE user_id = _m.requested_by;
      UPDATE public.matchcw_bets SET status = 'refunded' WHERE matchcw_id = _match_id;
    END IF;
    UPDATE public.matchcw SET status = 'declined', bet_status = CASE WHEN is_bet_match THEN 'cancelled' ELSE bet_status END, updated_at = now()
     WHERE id = _match_id;
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (_m.requested_by, '❌ MatchCW recusado', 'Seu pedido foi recusado.', 'matchcw');
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;

  -- Aceitar: validar limite e aposta
  SELECT COUNT(*) INTO _today_count FROM public.matchcw
   WHERE (clan_a_id = _actor_clan OR clan_b_id = _actor_clan)
     AND created_at::date = current_date AND status NOT IN ('declined');
  IF _today_count >= 10 THEN RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido'; END IF;

  IF _m.is_bet_match THEN
    SELECT COALESCE(balance,0) INTO _balance FROM public.economy WHERE user_id = auth.uid();
    IF _balance < _m.bet_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente para cobrir a aposta de R$ %', _m.bet_amount;
    END IF;
    UPDATE public.economy SET balance = balance - _m.bet_amount, updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.matchcw_bets(matchcw_id, clan_id, user_id, amount, status)
    VALUES (_match_id, _actor_clan, auth.uid(), _m.bet_amount, 'locked');
  END IF;

  UPDATE public.matchcw
     SET clan_b_id = COALESCE(clan_b_id, _actor_clan),
         status = 'accepted',
         bet_status = CASE WHEN is_bet_match THEN 'locked' ELSE bet_status END,
         updated_at = now()
   WHERE id = _match_id;

  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (_m.requested_by, '✅ MatchCW aceito', 'Seu pedido foi aceito! Abra o chat para coordenar.', 'matchcw');

  RETURN jsonb_build_object('success', true, 'status', 'accepted');
END; $$;

-- 6) Finalizar match e processar aposta (15% para o site, 85% ao vencedor)
CREATE OR REPLACE FUNCTION public.finalize_matchcw(
  _match_id uuid,
  _score_a integer,
  _score_b integer,
  _winner_clan uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _m public.matchcw%ROWTYPE;
  _total numeric;
  _site_fee numeric;
  _winner_payout numeric;
  _winner_user uuid;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MatchCW não encontrado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _m.clan_a_id) OR is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF _m.status NOT IN ('confirmed','accepted') THEN RAISE EXCEPTION 'Match não pode ser finalizado'; END IF;
  IF _winner_clan NOT IN (_m.clan_a_id, _m.clan_b_id) THEN RAISE EXCEPTION 'Vencedor inválido'; END IF;

  UPDATE public.matchcw SET status = 'finalized', score_a = _score_a, score_b = _score_b,
    winner_clan_id = _winner_clan, updated_at = now() WHERE id = _match_id;

  -- Processar aposta
  IF _m.is_bet_match AND _m.bet_status = 'locked' THEN
    _total := _m.bet_amount * 2;
    _site_fee := round(_total * 0.15, 2);
    _winner_payout := _total - _site_fee;

    SELECT user_id INTO _winner_user FROM public.matchcw_bets
     WHERE matchcw_id = _match_id AND clan_id = _winner_clan LIMIT 1;

    UPDATE public.economy SET balance = balance + _winner_payout, updated_at = now()
     WHERE user_id = _winner_user;
    UPDATE public.matchcw_bets SET status = 'paid' WHERE matchcw_id = _match_id;
    UPDATE public.matchcw SET bet_status = 'paid' WHERE id = _match_id;

    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (_winner_user, '🏆 Aposta vencida!',
      'Você recebeu R$ ' || _winner_payout || ' (taxa 15% de R$ ' || _site_fee || ' destinada ao site).', 'matchcw');
  END IF;

  RETURN jsonb_build_object('success', true, 'site_fee', COALESCE(_site_fee,0), 'winner_payout', COALESCE(_winner_payout,0));
END; $$;
