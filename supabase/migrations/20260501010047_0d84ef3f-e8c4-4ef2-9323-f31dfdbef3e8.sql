-- ============================================================
-- LUCKY NEXEL — RESET E NOVAS TABELAS
-- ============================================================

-- 1. RESET (começar do zero, mantém NexelGolds da loja)
TRUNCATE public.spins;
TRUNCATE public.spin_purchases;

-- 2. WALLET (saldo real em R$, separado da economia de apostas)
CREATE TABLE IF NOT EXISTS public.wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_brl numeric(12,2) NOT NULL DEFAULT 0,
  total_earned numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own wallet" ON public.wallet FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "users insert own wallet" ON public.wallet FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. CATÁLOGO DE PRÊMIOS
CREATE TABLE IF NOT EXISTS public.lucky_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL, -- gold, boost, visual, vip, ticket, box, pix
  rarity text NOT NULL DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  label text NOT NULL,
  value_min integer NOT NULL DEFAULT 0,
  value_max integer NOT NULL DEFAULT 0,
  probability numeric(7,4) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lucky_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards public" ON public.lucky_rewards FOR SELECT USING (true);

-- 4. HISTÓRICO DE GIROS
CREATE TABLE IF NOT EXISTS public.lucky_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_code text NOT NULL,
  reward_type text NOT NULL,
  reward_label text NOT NULL,
  reward_value numeric(12,2) NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lucky_spins ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lucky_spins_user ON public.lucky_spins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lucky_spins_week ON public.lucky_spins(created_at DESC);
CREATE POLICY "spins public read" ON public.lucky_spins FOR SELECT USING (true);

-- 5. PAGAMENTOS PIX (entrada)
CREATE TABLE IF NOT EXISTS public.mp_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mp_payment_id text UNIQUE,
  amount_brl numeric(10,2) NOT NULL,
  spins integer NOT NULL,
  bonus_spins integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  expires_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own payments" ON public.mp_payments FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));
CREATE POLICY "users create own payments" ON public.mp_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. SAQUES PIX (saída)
CREATE TABLE IF NOT EXISTS public.mp_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pix_key text NOT NULL,
  pix_key_type text NOT NULL DEFAULT 'random', -- cpf, email, phone, random
  beneficiary_name text NOT NULL,
  amount_brl numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, paid, failed, blocked
  mp_transfer_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.mp_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own payouts" ON public.mp_payouts FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 7. INVENTÁRIO LUCKY (caixas, itens)
CREATE TABLE IF NOT EXISTS public.lucky_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL, -- box_rare, box_epic, box_legendary, visual_item
  item_label text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);
ALTER TABLE public.lucky_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own lucky inv" ON public.lucky_inventory FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 8. BOOSTS ATIVOS
CREATE TABLE IF NOT EXISTS public.lucky_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  boost_type text NOT NULL, -- xp_boost, gold_boost, luck_boost
  multiplier numeric(4,2) NOT NULL DEFAULT 2.0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lucky_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own boosts" ON public.lucky_boosts FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 9. VIPS ATIVOS
CREATE TABLE IF NOT EXISTS public.lucky_vips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  days integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lucky_vips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own vips" ON public.lucky_vips FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 10. TICKETS MATCHCW
CREATE TABLE IF NOT EXISTS public.lucky_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
ALTER TABLE public.lucky_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own tickets" ON public.lucky_tickets FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'superadmin'::app_role));

-- 11. AUDIT LOG (anti-fraude)
CREATE TABLE IF NOT EXISTS public.lucky_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL, -- spin, payment_create, payment_approve, payout_request, payout_paid, fraud_block
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lucky_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit superadmin" ON public.lucky_audit FOR SELECT
  USING (has_role(auth.uid(),'superadmin'::app_role));

-- 12. RATE LIMIT (5 giros / minuto)
CREATE TABLE IF NOT EXISTS public.lucky_rate_limit (
  user_id uuid PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.lucky_rate_limit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED CATÁLOGO DE PRÊMIOS
-- ============================================================
INSERT INTO public.lucky_rewards (code, type, rarity, label, value_min, value_max, probability) VALUES
('gold_main', 'gold', 'common', 'NexelGolds', 5, 50, 30.70),
('boost_main', 'boost', 'uncommon', 'Boost Temporário', 0, 0, 18.35),
('visual_main', 'visual', 'rare', 'Item Visual', 0, 0, 23.86),
('vip_1d', 'vip', 'common', 'VIP 1 Dia', 1, 1, 8.29),
('vip_5d', 'vip', 'uncommon', 'VIP 5 Dias', 5, 5, 5.27),
('vip_10d', 'vip', 'rare', 'VIP 10 Dias', 10, 10, 3.22),
('ticket_cw', 'ticket', 'rare', 'Ticket MatchCW', 1, 1, 3.49),
('box_rare', 'box', 'rare', 'Caixa Rara', 0, 0, 2.45),
('box_epic', 'box', 'epic', 'Caixa Épica', 0, 0, 2.25),
('box_legendary', 'box', 'legendary', 'Caixa Lendária', 0, 0, 1.12),
('pix_real', 'pix', 'legendary', 'PIX em Reais', 100, 1000, 1.00)
ON CONFLICT (code) DO UPDATE SET
  probability = EXCLUDED.probability,
  value_min = EXCLUDED.value_min,
  value_max = EXCLUDED.value_max,
  label = EXCLUDED.label;

-- ============================================================
-- TRIGGERS DE updated_at
-- ============================================================
CREATE TRIGGER trg_wallet_upd BEFORE UPDATE ON public.wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_payments_upd BEFORE UPDATE ON public.mp_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_payouts_upd BEFORE UPDATE ON public.mp_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RPC: lucky_nexel_spin
-- Sorteio com probabilidades exatas + rate limit + auditoria
-- ============================================================
CREATE OR REPLACE FUNCTION public.lucky_nexel_spin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _rl public.lucky_rate_limit%ROWTYPE;
  _r numeric; -- 0..10000 (basis points x100)
  _code text;
  _type text;
  _rarity text;
  _label text;
  _value numeric := 0;
  _meta jsonb := '{}'::jsonb;
  _pix_sub numeric;
  _gold_amount integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- RATE LIMIT: 5 giros / minuto
  SELECT * INTO _rl FROM public.lucky_rate_limit WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.lucky_rate_limit(user_id, window_start, count) VALUES (_uid, now(), 0);
    SELECT * INTO _rl FROM public.lucky_rate_limit WHERE user_id = _uid FOR UPDATE;
  END IF;
  IF _rl.window_start < now() - interval '1 minute' THEN
    UPDATE public.lucky_rate_limit SET window_start = now(), count = 0 WHERE user_id = _uid;
    _rl.count := 0;
  END IF;
  IF _rl.count >= 5 THEN
    INSERT INTO public.lucky_audit(user_id, action, details)
      VALUES (_uid, 'fraud_block', jsonb_build_object('reason','rate_limit_5_per_min'));
    RAISE EXCEPTION 'Limite de 5 giros por minuto atingido. Aguarde.';
  END IF;
  UPDATE public.lucky_rate_limit SET count = count + 1 WHERE user_id = _uid;

  -- VALIDA GIRO DISPONÍVEL
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  IF COALESCE(_profile.free_spins, 0) <= 0 THEN
    RAISE EXCEPTION 'Você não tem giros disponíveis';
  END IF;
  UPDATE public.profiles SET free_spins = free_spins - 1, updated_at = now() WHERE user_id = _uid;

  -- SORTEIO (basis points x100 → 0..10000 representando %)
  _r := random() * 10000;

  IF _r < 3070 THEN
    -- 30.70% NexelGolds (5..50 random)
    _code := 'gold_main'; _type := 'gold'; _rarity := 'common'; _label := 'NexelGolds';
    _gold_amount := 5 + floor(random() * 46)::int;
    _value := _gold_amount;
    UPDATE public.profiles SET gold = COALESCE(gold,0) + _gold_amount, updated_at = now() WHERE user_id = _uid;

  ELSIF _r < 3070 + 1835 THEN
    -- 18.35% Boost (2x XP, 24h)
    _code := 'boost_main'; _type := 'boost'; _rarity := 'uncommon'; _label := 'Boost 2x (24h)';
    _value := 2;
    INSERT INTO public.lucky_boosts(user_id, boost_type, multiplier, expires_at)
      VALUES (_uid, 'xp_boost', 2.0, now() + interval '24 hours');

  ELSIF _r < 3070 + 1835 + 2386 THEN
    -- 23.86% Item Visual (entra no inventário)
    _code := 'visual_main'; _type := 'visual'; _rarity := 'rare'; _label := 'Item Visual Aleatório';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity, metadata)
      VALUES (_uid, 'visual_item', 'Item Visual Surpresa', 'rare', jsonb_build_object('source','spin'));

  ELSIF _r < 3070 + 1835 + 2386 + 829 THEN
    -- 8.29% VIP 1 dia
    _code := 'vip_1d'; _type := 'vip'; _rarity := 'common'; _label := 'VIP 1 Dia'; _value := 1;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 1, now() + interval '1 day');

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 THEN
    -- 5.27% VIP 5 dias
    _code := 'vip_5d'; _type := 'vip'; _rarity := 'uncommon'; _label := 'VIP 5 Dias'; _value := 5;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 5, now() + interval '5 days');

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 + 322 THEN
    -- 3.22% VIP 10 dias
    _code := 'vip_10d'; _type := 'vip'; _rarity := 'rare'; _label := 'VIP 10 Dias'; _value := 10;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 10, now() + interval '10 days');

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 + 322 + 349 THEN
    -- 3.49% Ticket MatchCW
    _code := 'ticket_cw'; _type := 'ticket'; _rarity := 'rare'; _label := 'Ticket MatchCW'; _value := 1;
    INSERT INTO public.lucky_tickets(user_id) VALUES (_uid);

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 + 322 + 349 + 245 THEN
    -- 2.45% Caixa Rara
    _code := 'box_rare'; _type := 'box'; _rarity := 'rare'; _label := 'Caixa Rara';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_rare', 'Caixa Rara', 'rare');

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 + 322 + 349 + 245 + 225 THEN
    -- 2.25% Caixa Épica
    _code := 'box_epic'; _type := 'box'; _rarity := 'epic'; _label := 'Caixa Épica';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_epic', 'Caixa Épica', 'epic');

  ELSIF _r < 3070 + 1835 + 2386 + 829 + 527 + 322 + 349 + 245 + 225 + 112 THEN
    -- 1.12% Caixa Lendária
    _code := 'box_legendary'; _type := 'box'; _rarity := 'legendary'; _label := 'Caixa Lendária';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_legendary', 'Caixa Lendária', 'legendary');

  ELSE
    -- 1.00% PIX REAL — sub-sorteio dentro de 100 basis points
    _pix_sub := random() * 100;
    INSERT INTO public.wallet(user_id, balance_brl) VALUES (_uid, 0)
      ON CONFLICT (user_id) DO NOTHING;
    IF _pix_sub < 30 THEN
      _value := 1.00; _rarity := 'common';
    ELSIF _pix_sub < 55 THEN
      _value := 1.75; _rarity := 'uncommon';
    ELSIF _pix_sub < 75 THEN
      _value := 3.00; _rarity := 'rare';
    ELSIF _pix_sub < 90 THEN
      _value := 5.00; _rarity := 'epic';
    ELSE
      _value := 10.00; _rarity := 'legendary';
    END IF;
    _code := 'pix_real'; _type := 'pix'; _label := 'PIX R$ ' || _value;
    UPDATE public.wallet SET balance_brl = balance_brl + _value,
      total_earned = total_earned + _value, updated_at = now() WHERE user_id = _uid;
  END IF;

  -- HISTÓRICO + AUDIT
  INSERT INTO public.lucky_spins(user_id, reward_code, reward_type, reward_label, reward_value, rarity, metadata)
    VALUES (_uid, _code, _type, _label, _value, _rarity, _meta);
  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_uid, 'spin', jsonb_build_object('code',_code,'value',_value,'rarity',_rarity));

  RETURN jsonb_build_object(
    'success', true,
    'code', _code,
    'type', _type,
    'rarity', _rarity,
    'label', _label,
    'value', _value
  );
END;
$$;

-- ============================================================
-- RPC: lucky_open_box
-- ============================================================
CREATE OR REPLACE FUNCTION public.lucky_open_box(_inv_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.lucky_inventory%ROWTYPE;
  _r numeric;
  _label text; _type text; _rarity text;
  _value numeric := 0;
  _gold integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _inv FROM public.lucky_inventory WHERE id = _inv_id AND user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrada'; END IF;
  IF _inv.opened THEN RAISE EXCEPTION 'Caixa já aberta'; END IF;
  IF _inv.item_type NOT IN ('box_rare','box_epic','box_legendary') THEN
    RAISE EXCEPTION 'Item não é uma caixa';
  END IF;

  _r := random() * 100;

  IF _inv.item_type = 'box_rare' THEN
    -- visual raro / matchcw / booster / golds 5..50
    IF _r < 30 THEN
      _label := 'Visual Raro'; _type := 'visual'; _rarity := 'rare';
      INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
        VALUES (_uid,'visual_item','Visual Raro','rare');
    ELSIF _r < 50 THEN
      _label := 'Ticket MatchCW'; _type := 'ticket'; _rarity := 'rare';
      INSERT INTO public.lucky_tickets(user_id) VALUES (_uid);
    ELSIF _r < 70 THEN
      _label := 'Boost 2x 24h'; _type := 'boost'; _rarity := 'uncommon';
      INSERT INTO public.lucky_boosts(user_id, boost_type, multiplier, expires_at)
        VALUES (_uid,'xp_boost',2.0, now()+interval '24 hours');
    ELSE
      _gold := 5 + floor(random()*46)::int; _value := _gold;
      _label := _gold || ' NexelGolds'; _type := 'gold'; _rarity := 'common';
      UPDATE public.profiles SET gold = COALESCE(gold,0)+_gold WHERE user_id = _uid;
    END IF;

  ELSIF _inv.item_type = 'box_epic' THEN
    IF _r < 30 THEN
      _label := 'Visual Épico'; _type := 'visual'; _rarity := 'epic';
      INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
        VALUES (_uid,'visual_item','Visual Épico','epic');
    ELSIF _r < 50 THEN
      _gold := 10 + floor(random()*91)::int; _value := _gold;
      _label := _gold || ' NexelGolds'; _type := 'gold'; _rarity := 'uncommon';
      UPDATE public.profiles SET gold = COALESCE(gold,0)+_gold WHERE user_id = _uid;
    ELSIF _r < 70 THEN
      _label := 'VIP 10 Dias'; _type := 'vip'; _rarity := 'rare'; _value := 10;
      INSERT INTO public.lucky_vips(user_id,days,expires_at) VALUES (_uid,10,now()+interval '10 days');
    ELSIF _r < 88 THEN
      _label := 'VIP 15 Dias'; _type := 'vip'; _rarity := 'epic'; _value := 15;
      INSERT INTO public.lucky_vips(user_id,days,expires_at) VALUES (_uid,15,now()+interval '15 days');
    ELSE
      _label := 'VIP 20 Dias'; _type := 'vip'; _rarity := 'epic'; _value := 20;
      INSERT INTO public.lucky_vips(user_id,days,expires_at) VALUES (_uid,20,now()+interval '20 days');
    END IF;

  ELSE -- box_legendary → garantia de PIX
    INSERT INTO public.wallet(user_id, balance_brl) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
    IF _r < 35 THEN _value := 1.00; _rarity := 'common';
    ELSIF _r < 60 THEN _value := 1.75; _rarity := 'uncommon';
    ELSIF _r < 80 THEN _value := 3.00; _rarity := 'rare';
    ELSE _value := 5.00; _rarity := 'epic';
    END IF;
    _label := 'PIX R$ ' || _value; _type := 'pix';
    UPDATE public.wallet SET balance_brl = balance_brl + _value,
      total_earned = total_earned + _value WHERE user_id = _uid;
  END IF;

  UPDATE public.lucky_inventory SET opened = true, opened_at = now(),
    metadata = metadata || jsonb_build_object('result_label',_label,'result_type',_type,'result_value',_value,'result_rarity',_rarity)
    WHERE id = _inv_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_uid, 'open_box', jsonb_build_object('box',_inv.item_type,'reward',_label,'value',_value));

  RETURN jsonb_build_object('success',true,'label',_label,'type',_type,'rarity',_rarity,'value',_value);
END;
$$;

-- ============================================================
-- RPC: request_pix_withdrawal (saque PIX)
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_pix_withdrawal(
  _pix_key text, _pix_key_type text, _beneficiary_name text, _amount numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance numeric;
  _recent_payouts integer;
  _payout_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _amount < 50 THEN RAISE EXCEPTION 'Saque mínimo: R$ 50,00'; END IF;
  IF length(coalesce(_beneficiary_name,'')) < 3 THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
  IF length(coalesce(_pix_key,'')) < 4 THEN RAISE EXCEPTION 'Chave PIX obrigatória'; END IF;

  -- ANTI-FRAUDE: bloquear se 3+ saques em últimas 24h
  SELECT COUNT(*) INTO _recent_payouts FROM public.mp_payouts
   WHERE user_id = _uid AND created_at > now() - interval '24 hours'
     AND status NOT IN ('failed');
  IF _recent_payouts >= 3 THEN
    INSERT INTO public.lucky_audit(user_id, action, details)
      VALUES (_uid,'fraud_block', jsonb_build_object('reason','too_many_withdrawals_24h','count',_recent_payouts));
    RAISE EXCEPTION 'Limite de saques atingido (3 em 24h). Tente novamente mais tarde.';
  END IF;

  SELECT COALESCE(balance_brl,0) INTO _balance FROM public.wallet WHERE user_id = _uid FOR UPDATE;
  IF _balance < _amount THEN RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', _balance; END IF;

  -- Debita imediatamente (escrow); estorna se falhar
  UPDATE public.wallet SET balance_brl = balance_brl - _amount, updated_at = now() WHERE user_id = _uid;

  INSERT INTO public.mp_payouts(user_id, pix_key, pix_key_type, beneficiary_name, amount_brl, status)
  VALUES (_uid, _pix_key, _pix_key_type, _beneficiary_name, _amount, 'pending')
  RETURNING id INTO _payout_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_uid,'payout_request', jsonb_build_object('payout_id',_payout_id,'amount',_amount));

  RETURN jsonb_build_object('success',true,'payout_id',_payout_id);
END;
$$;

-- ============================================================
-- RPC: refund_failed_payout (chamado pelo Edge Function se MP falhar)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refund_failed_payout(_payout_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mp_payouts%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(),'superadmin'::app_role) AND auth.uid() IS NOT NULL THEN
    -- só superadmin OU service_role (auth.uid() null no edge)
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT * INTO _p FROM public.mp_payouts WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saque não encontrado'; END IF;
  IF _p.status = 'paid' THEN RAISE EXCEPTION 'Saque já foi pago, não pode estornar'; END IF;
  IF _p.status = 'failed' THEN RETURN jsonb_build_object('already','failed'); END IF;

  UPDATE public.wallet SET balance_brl = balance_brl + _p.amount_brl, updated_at = now()
   WHERE user_id = _p.user_id;
  UPDATE public.mp_payouts SET status = 'failed', failure_reason = _reason,
    processed_at = now(), updated_at = now() WHERE id = _payout_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_p.user_id,'payout_failed', jsonb_build_object('payout_id',_payout_id,'reason',_reason));
  INSERT INTO public.notifications(user_id,title,message,type)
    VALUES (_p.user_id,'❌ Saque PIX falhou','Motivo: '||_reason||'. Saldo estornado.','withdrawal');
  RETURN jsonb_build_object('success',true);
END; $$;

-- ============================================================
-- RPC: confirm_paid_payout (chamado pelo Edge Function quando MP confirma)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_paid_payout(_payout_id uuid, _mp_transfer_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mp_payouts%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.mp_payouts WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Saque não encontrado'; END IF;
  IF _p.status = 'paid' THEN RETURN jsonb_build_object('already','paid'); END IF;

  UPDATE public.mp_payouts SET status='paid', mp_transfer_id=_mp_transfer_id,
    processed_at = now(), updated_at = now() WHERE id = _payout_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_p.user_id,'payout_paid', jsonb_build_object('payout_id',_payout_id,'amount',_p.amount_brl));
  INSERT INTO public.notifications(user_id,title,message,type)
    VALUES (_p.user_id,'✅ Saque PIX pago!','R$ '||_p.amount_brl||' enviado para sua chave.','withdrawal');
  RETURN jsonb_build_object('success',true);
END; $$;

-- ============================================================
-- RPC: credit_spins_after_payment (chamado pelo webhook)
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_spins_after_payment(_payment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.mp_payments%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.mp_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF _p.status = 'approved' THEN RETURN jsonb_build_object('already','approved'); END IF;

  UPDATE public.profiles SET free_spins = COALESCE(free_spins,0) + _p.spins + _p.bonus_spins,
    updated_at = now() WHERE user_id = _p.user_id;
  UPDATE public.mp_payments SET status='approved', approved_at = now(), updated_at = now()
    WHERE id = _payment_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_p.user_id,'payment_approve',
      jsonb_build_object('payment_id',_payment_id,'spins',_p.spins+_p.bonus_spins,'amount',_p.amount_brl));
  INSERT INTO public.notifications(user_id,title,message,type)
    VALUES (_p.user_id,'🎰 Giros creditados!',
      (_p.spins+_p.bonus_spins)||' giros adicionados na sua conta!','payment');
  RETURN jsonb_build_object('success',true,'spins',_p.spins+_p.bonus_spins);
END; $$;