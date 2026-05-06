
-- ============================================================
-- 1) Schema updates
-- ============================================================
ALTER TABLE public.lucky_inventory ADD COLUMN IF NOT EXISTS sold boolean NOT NULL DEFAULT false;
ALTER TABLE public.lucky_inventory ADD COLUMN IF NOT EXISTS sold_at timestamptz;
ALTER TABLE public.lucky_inventory ADD COLUMN IF NOT EXISTS sold_for integer DEFAULT 0;

ALTER TABLE public.lucky_boosts ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false;
ALTER TABLE public.lucky_boosts ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE public.lucky_boosts ADD COLUMN IF NOT EXISTS consumed_at timestamptz;

-- Seed do desconto VIP
INSERT INTO public.admin_settings(key, value)
VALUES ('vip_discount_percent', jsonb_build_object('percent', 0))
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2) lucky_nexel_spin — 15/45s + boost active + visual único + VIP novo
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
  _r numeric;
  _code text; _type text; _rarity text; _label text;
  _value numeric := 0;
  _meta jsonb := '{}'::jsonb;
  _pix_sub numeric;
  _gold_amount integer;
  _boost_id uuid;
  _boost_shift numeric := 0; -- 0..1000 basis points to push toward rare+
  _visual_label text;
  _visual_rarity text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- RATE LIMIT: 15 giros / 45 segundos
  SELECT * INTO _rl FROM public.lucky_rate_limit WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.lucky_rate_limit(user_id, window_start, count) VALUES (_uid, now(), 0);
    SELECT * INTO _rl FROM public.lucky_rate_limit WHERE user_id = _uid FOR UPDATE;
  END IF;
  IF _rl.window_start < now() - interval '45 seconds' THEN
    UPDATE public.lucky_rate_limit SET window_start = now(), count = 0 WHERE user_id = _uid;
    _rl.count := 0;
  END IF;
  IF _rl.count >= 15 THEN
    INSERT INTO public.lucky_audit(user_id, action, details)
      VALUES (_uid, 'fraud_block', jsonb_build_object('reason','rate_limit_15_per_45s'));
    RAISE EXCEPTION 'Limite de 15 giros a cada 45 segundos atingido. Aguarde.';
  END IF;
  UPDATE public.lucky_rate_limit SET count = count + 1 WHERE user_id = _uid;

  -- VALIDA GIRO DISPONÍVEL
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  IF COALESCE(_profile.free_spins, 0) <= 0 THEN
    RAISE EXCEPTION 'Você não tem giros disponíveis';
  END IF;
  UPDATE public.profiles SET free_spins = free_spins - 1, updated_at = now() WHERE user_id = _uid;

  -- BOOST ATIVO (consome 1 booster por giro): empurra _r para baixo (mais raro+)
  SELECT id INTO _boost_id FROM public.lucky_boosts
   WHERE user_id = _uid AND active = true AND consumed_at IS NULL
     AND expires_at > now()
   ORDER BY activated_at ASC LIMIT 1;
  IF _boost_id IS NOT NULL THEN
    -- até 10% de shift = 1000 basis points
    _boost_shift := 1000;
    UPDATE public.lucky_boosts
      SET active = false, consumed_at = now()
      WHERE id = _boost_id;
    _meta := _meta || jsonb_build_object('boost_used', true);
  END IF;

  -- SORTEIO
  _r := random() * 10000 - _boost_shift;
  IF _r < 0 THEN _r := 0; END IF;

  IF _r < 3070 THEN
    _code := 'gold_main'; _type := 'gold'; _rarity := 'common'; _label := 'NexelGolds';
    _gold_amount := 5 + floor(random() * 46)::int;
    _value := _gold_amount;
    UPDATE public.profiles SET gold = COALESCE(gold,0) + _gold_amount, updated_at = now() WHERE user_id = _uid;

  ELSIF _r < 4905 THEN
    _code := 'boost_main'; _type := 'boost'; _rarity := 'uncommon'; _label := 'Boost +10% (24h)';
    _value := 1;
    -- Verifica se atingiu limite de 6 no inventário
    IF (SELECT COUNT(*) FROM public.lucky_boosts
        WHERE user_id = _uid AND consumed_at IS NULL AND expires_at > now()) >= 6 THEN
      -- converte em 100g
      UPDATE public.profiles SET gold = COALESCE(gold,0) + 100 WHERE user_id = _uid;
      _label := 'Boost convertido (+100g)'; _type := 'gold'; _value := 100; _rarity := 'common';
      _code := 'gold_main';
    ELSE
      INSERT INTO public.lucky_boosts(user_id, boost_type, multiplier, expires_at, active)
        VALUES (_uid, 'rare_boost', 1.10, now() + interval '24 hours', false);
    END IF;

  ELSIF _r < 7291 THEN
    -- Visual aleatório com nome único auto-gerado (raro 70% / comum 30%)
    IF random() < 0.7 THEN
      _visual_rarity := 'rare';
      _visual_label := 'Visual Raro #' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    ELSE
      _visual_rarity := 'common';
      _visual_label := 'Visual Comum #' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    END IF;
    _code := 'visual_main'; _type := 'visual'; _rarity := _visual_rarity; _label := _visual_label;
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity, metadata)
      VALUES (_uid, 'visual_item', _visual_label, _visual_rarity,
              jsonb_build_object('source','spin','auto_generated', true));

  ELSIF _r < 8120 THEN
    _code := 'vip_24h'; _type := 'vip'; _rarity := 'common'; _label := 'VIP 24h'; _value := 1;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 1, now() + interval '24 hours');

  ELSIF _r < 8350 THEN
    _code := 'vip_1h'; _type := 'vip'; _rarity := 'common'; _label := 'VIP 1h'; _value := 0;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 0, now() + interval '1 hour');

  ELSIF _r < 8647 THEN
    _code := 'vip_5h'; _type := 'vip'; _rarity := 'uncommon'; _label := 'VIP 5h'; _value := 0;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 0, now() + interval '5 hours');

  ELSIF _r < 8859 THEN
    _code := 'vip_10h'; _type := 'vip'; _rarity := 'rare'; _label := 'VIP 10h'; _value := 0;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 0, now() + interval '10 hours');

  ELSIF _r < 9050 THEN
    _code := 'vip_3d'; _type := 'vip'; _rarity := 'rare'; _label := 'VIP 3 Dias'; _value := 3;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 3, now() + interval '3 days');

  ELSIF _r < 9181 THEN
    _code := 'vip_5d'; _type := 'vip'; _rarity := 'epic'; _label := 'VIP 5 Dias'; _value := 5;
    INSERT INTO public.lucky_vips(user_id, days, expires_at) VALUES (_uid, 5, now() + interval '5 days');

  ELSIF _r < 9530 THEN
    _code := 'ticket_cw'; _type := 'ticket'; _rarity := 'rare'; _label := 'Ticket MatchCW'; _value := 1;
    INSERT INTO public.lucky_tickets(user_id) VALUES (_uid);

  ELSIF _r < 9775 THEN
    _code := 'box_rare'; _type := 'box'; _rarity := 'rare'; _label := 'Caixa Rara';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_rare', 'Caixa Rara', 'rare');

  ELSIF _r < 9900 THEN
    _code := 'box_epic'; _type := 'box'; _rarity := 'epic'; _label := 'Caixa Épica';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_epic', 'Caixa Épica', 'epic');

  ELSIF _r < 9988 THEN
    _code := 'box_legendary'; _type := 'box'; _rarity := 'legendary'; _label := 'Caixa Lendária';
    INSERT INTO public.lucky_inventory(user_id, item_type, item_label, rarity)
      VALUES (_uid, 'box_legendary', 'Caixa Lendária', 'legendary');

  ELSE
    _pix_sub := random() * 100;
    INSERT INTO public.wallet(user_id, balance_brl) VALUES (_uid, 0)
      ON CONFLICT (user_id) DO NOTHING;
    IF _pix_sub < 30 THEN _value := 1.00; _rarity := 'common';
    ELSIF _pix_sub < 55 THEN _value := 1.75; _rarity := 'uncommon';
    ELSIF _pix_sub < 75 THEN _value := 3.00; _rarity := 'rare';
    ELSIF _pix_sub < 90 THEN _value := 5.00; _rarity := 'epic';
    ELSE _value := 10.00; _rarity := 'legendary';
    END IF;
    _code := 'pix_real'; _type := 'pix'; _label := 'PIX R$ ' || _value;
    UPDATE public.wallet SET balance_brl = balance_brl + _value,
      total_earned = total_earned + _value, updated_at = now() WHERE user_id = _uid;
  END IF;

  INSERT INTO public.lucky_spins(user_id, reward_code, reward_type, reward_label, reward_value, rarity, metadata)
    VALUES (_uid, _code, _type, _label, _value, _rarity, _meta);
  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_uid, 'spin', jsonb_build_object('code',_code,'value',_value,'rarity',_rarity,'boost_used',_boost_id IS NOT NULL));

  RETURN jsonb_build_object(
    'success', true,
    'code', _code,
    'type', _type,
    'rarity', _rarity,
    'label', _label,
    'value', _value,
    'boost_consumed', _boost_id IS NOT NULL
  );
END;
$$;

-- ============================================================
-- 3) RPC: lucky_sell_visual — vende visual common (50g) ou rare (200g)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lucky_sell_visual(_inv_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.lucky_inventory%ROWTYPE;
  _price integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _inv FROM public.lucky_inventory
   WHERE id = _inv_id AND user_id = _uid AND sold = false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado ou já vendido'; END IF;
  IF _inv.item_type <> 'visual_item' THEN RAISE EXCEPTION 'Apenas visuais podem ser vendidos'; END IF;
  IF _inv.rarity = 'common' THEN _price := 50;
  ELSIF _inv.rarity = 'rare' THEN _price := 200;
  ELSE RAISE EXCEPTION 'Apenas visuais comuns ou raros podem ser vendidos';
  END IF;

  UPDATE public.lucky_inventory
    SET sold = true, sold_at = now(), sold_for = _price
    WHERE id = _inv_id;
  UPDATE public.profiles
    SET gold = COALESCE(gold,0) + _price, updated_at = now()
    WHERE user_id = _uid;
  -- desequipa se equipado
  UPDATE public.profiles SET equipped_lucky_id = NULL
   WHERE user_id = _uid AND equipped_lucky_id = _inv_id;

  INSERT INTO public.lucky_audit(user_id, action, details)
    VALUES (_uid, 'sell_visual', jsonb_build_object('inv_id',_inv_id,'price',_price));
  RETURN jsonb_build_object('success', true, 'gold', _price);
END; $$;

-- ============================================================
-- 4) RPC: lucky_activate_boost — ativa booster (max 2 por dia)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lucky_activate_boost(_boost_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _b public.lucky_boosts%ROWTYPE;
  _today_active integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _b FROM public.lucky_boosts
   WHERE id = _boost_id AND user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Boost não encontrado'; END IF;
  IF _b.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'Boost já foi usado'; END IF;
  IF _b.active THEN RAISE EXCEPTION 'Boost já está ativo'; END IF;
  IF _b.expires_at < now() THEN RAISE EXCEPTION 'Boost expirou'; END IF;

  -- Limite: 2 ativações por dia (BRT)
  SELECT COUNT(*) INTO _today_active FROM public.lucky_boosts
   WHERE user_id = _uid
     AND activated_at IS NOT NULL
     AND activated_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo';
  IF _today_active >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 boosters ativados por dia atingido';
  END IF;

  UPDATE public.lucky_boosts SET active = true, activated_at = now() WHERE id = _boost_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- ============================================================
-- 5) RPC: get_vip_discount — leitura simples
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_vip_discount()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((value->>'percent')::int, 0) FROM public.admin_settings WHERE key = 'vip_discount_percent';
$$;
