-- 1) promo_codes: adicionar reward_type e free_spins
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS free_spins integer NOT NULL DEFAULT 0;

-- Validar valores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_reward_type_check'
  ) THEN
    ALTER TABLE public.promo_codes
      ADD CONSTRAINT promo_codes_reward_type_check
      CHECK (reward_type IN ('gold', 'free_spins'));
  END IF;
END $$;

-- 2) spin_roulette: novas probabilidades (em /10000 para precisão)
-- 5(2431) 10(2083) 15(1736) 20(1389) 25(1042) 50(694) 100(347) 150(208) 200(70)
CREATE OR REPLACE FUNCTION public.spin_roulette()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _spin_cost integer := 0; -- removido custo em Gold; só usa free_spins
  _used_free boolean := false;
  _r integer;
  _reward integer;
  _spin_type text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  IF COALESCE(_profile.free_spins, 0) <= 0 THEN
    RAISE EXCEPTION 'Você precisa de uma roleta grátis para girar';
  END IF;
  _used_free := true;
  _spin_type := 'free';

  -- Sortear prêmio com novas probabilidades em /10000
  _r := floor(random() * 10000)::int;
  IF _r < 2431 THEN
    _reward := 5;
  ELSIF _r < 4514 THEN
    _reward := 10;
  ELSIF _r < 6250 THEN
    _reward := 15;
  ELSIF _r < 7639 THEN
    _reward := 20;
  ELSIF _r < 8681 THEN
    _reward := 25;
  ELSIF _r < 9375 THEN
    _reward := 50;
  ELSIF _r < 9722 THEN
    _reward := 100;
  ELSIF _r < 9930 THEN
    _reward := 150;
  ELSE
    _reward := 200;
  END IF;

  UPDATE public.profiles
     SET free_spins = free_spins - 1,
         gold = COALESCE(gold, 0) + _reward,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.spins (user_id, cost, reward, spin_type)
  VALUES (_user_id, 0, _reward, _spin_type);

  RETURN jsonb_build_object(
    'reward', _reward,
    'cost', 0,
    'spin_type', _spin_type
  );
END;
$function$;

-- 3) reset_user_golds: aceitar opcionalmente _user_id (jogador único)
CREATE OR REPLACE FUNCTION public.reset_user_golds(
  _clan_id uuid DEFAULT NULL,
  _exclude_admins boolean DEFAULT true,
  _user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _affected integer;
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Apenas o Criador pode executar esta ação';
  END IF;

  WITH updated AS (
    UPDATE public.profiles p
       SET gold = 0, updated_at = now()
     WHERE (_user_id IS NULL OR p.user_id = _user_id)
       AND (_clan_id IS NULL OR p.clan_id = _clan_id)
       AND (
         NOT _exclude_admins
         OR NOT EXISTS (
           SELECT 1 FROM public.user_roles ur
           WHERE ur.user_id = p.user_id
             AND ur.role IN ('admin', 'superadmin')
         )
       )
    RETURNING 1
  )
  SELECT COUNT(*) INTO _affected FROM updated;

  RETURN _affected;
END;
$function$;

-- 4) redeem_promo_code: suportar reward_type free_spins
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _promo public.promo_codes%ROWTYPE;
  _credited_gold integer := 0;
  _credited_spins integer := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _promo FROM public.promo_codes
   WHERE lower(code) = lower(trim(_code))
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF NOT _promo.is_active THEN RAISE EXCEPTION 'Código desativado'; END IF;
  IF _promo.expires_at IS NOT NULL AND _promo.expires_at < now() THEN
    RAISE EXCEPTION 'Código expirado';
  END IF;
  IF _promo.max_uses IS NOT NULL AND _promo.uses >= _promo.max_uses THEN
    RAISE EXCEPTION 'Código esgotado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.promo_code_redemptions WHERE promo_code_id = _promo.id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Você já resgatou este código';
  END IF;

  IF _promo.reward_type = 'free_spins' THEN
    _credited_spins := COALESCE(_promo.free_spins, 0);
    UPDATE public.profiles
       SET free_spins = COALESCE(free_spins, 0) + _credited_spins,
           updated_at = now()
     WHERE user_id = _user_id;
  ELSE
    _credited_gold := COALESCE(_promo.reward, 0);
    UPDATE public.profiles
       SET gold = COALESCE(gold, 0) + _credited_gold,
           updated_at = now()
     WHERE user_id = _user_id;
  END IF;

  UPDATE public.promo_codes
     SET uses = uses + 1
   WHERE id = _promo.id;

  INSERT INTO public.promo_code_redemptions (promo_code_id, user_id, reward)
  VALUES (_promo.id, _user_id, COALESCE(NULLIF(_credited_gold,0), _credited_spins));

  RETURN jsonb_build_object(
    'success', true,
    'reward_type', _promo.reward_type,
    'reward', _credited_gold,
    'free_spins', _credited_spins,
    'code', _promo.code
  );
END;
$function$;

-- 5) Função para deletar usuário (Criador exclui conta)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Apenas o Criador pode excluir contas';
  END IF;
  IF _target_user = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir a si mesmo';
  END IF;

  -- Limpar dados relacionados (mantém integridade)
  DELETE FROM public.clan_members WHERE user_id = _target_user;
  DELETE FROM public.friends WHERE user_id = _target_user OR friend_id = _target_user;
  DELETE FROM public.notifications WHERE user_id = _target_user;
  DELETE FROM public.spins WHERE user_id = _target_user;
  DELETE FROM public.spin_purchases WHERE user_id = _target_user;
  DELETE FROM public.withdrawals WHERE user_id = _target_user;
  DELETE FROM public.promo_code_redemptions WHERE user_id = _target_user;
  DELETE FROM public.chat_messages WHERE user_id = _target_user;
  DELETE FROM public.user_roles WHERE user_id = _target_user;
  DELETE FROM public.economy WHERE user_id = _target_user;
  DELETE FROM public.profiles WHERE user_id = _target_user;
  -- Apaga do auth.users (cascata para auth)
  DELETE FROM auth.users WHERE id = _target_user;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user);
END;
$function$;

-- 6) Permitir o Criador transferir jogadores (atualizar profile.clan_id e team_id)
-- Não cria policy nova: profiles UPDATE já permite superadmin via "Users update own profile" usando has_role superadmin.
-- (já existe na policy: ((auth.uid() = user_id) OR has_role(auth.uid(), 'superadmin'::app_role)))

-- 7) Permitir notificações terem deleção em massa pelo dono (já existe DELETE policy own).
-- Garantir que clientes possam atualizar/marcar como lida (já existe UPDATE policy own).