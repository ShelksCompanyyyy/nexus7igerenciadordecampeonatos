-- 1. Coluna is_banned em clans
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. Tabela spins (histórico de giros)
CREATE TABLE IF NOT EXISTS public.spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  reward integer NOT NULL DEFAULT 0,
  spin_type text NOT NULL DEFAULT 'free', -- 'free' | 'gold'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spins"
  ON public.spins FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX IF NOT EXISTS idx_spins_user_id ON public.spins(user_id);
CREATE INDEX IF NOT EXISTS idx_spins_created_at ON public.spins(created_at DESC);

-- 3. RPC: spin_roulette()
CREATE OR REPLACE FUNCTION public.spin_roulette()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _profile public.profiles%ROWTYPE;
  _spin_cost integer := 10;
  _used_free boolean := false;
  _r numeric;
  _reward integer;
  _spin_type text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Lock profile row
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  -- Decide custo: free_spin > 0 -> grátis; senão cobra 10 gold
  IF COALESCE(_profile.free_spins, 0) > 0 THEN
    _used_free := true;
    _spin_type := 'free';
  ELSIF COALESCE(_profile.gold, 0) >= _spin_cost THEN
    _used_free := false;
    _spin_type := 'gold';
  ELSE
    RAISE EXCEPTION 'Saldo insuficiente: você precisa de % Gold ou um giro grátis', _spin_cost;
  END IF;

  -- Sortear prêmio: 5(38%) 10(25%) 15(15%) 20(11%) 100(6%) 250(4%) 500(1%)
  _r := random();
  IF _r < 0.38 THEN
    _reward := 5;
  ELSIF _r < 0.63 THEN
    _reward := 10;
  ELSIF _r < 0.78 THEN
    _reward := 15;
  ELSIF _r < 0.89 THEN
    _reward := 20;
  ELSIF _r < 0.95 THEN
    _reward := 100;
  ELSIF _r < 0.99 THEN
    _reward := 250;
  ELSE
    _reward := 500;
  END IF;

  -- Aplicar custo + recompensa atomicamente
  IF _used_free THEN
    UPDATE public.profiles
       SET free_spins = free_spins - 1,
           gold = COALESCE(gold, 0) + _reward,
           updated_at = now()
     WHERE user_id = _user_id;
  ELSE
    UPDATE public.profiles
       SET gold = COALESCE(gold, 0) - _spin_cost + _reward,
           updated_at = now()
     WHERE user_id = _user_id;
  END IF;

  -- Registrar histórico
  INSERT INTO public.spins (user_id, cost, reward, spin_type)
  VALUES (_user_id, CASE WHEN _used_free THEN 0 ELSE _spin_cost END, _reward, _spin_type);

  RETURN jsonb_build_object(
    'reward', _reward,
    'cost', CASE WHEN _used_free THEN 0 ELSE _spin_cost END,
    'spin_type', _spin_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spin_roulette() TO authenticated;

-- 4. RPC: reset_user_golds(filter) - apenas superadmin
CREATE OR REPLACE FUNCTION public.reset_user_golds(
  _clan_id uuid DEFAULT NULL,
  _exclude_admins boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _affected integer;
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Apenas o Criador pode executar esta ação';
  END IF;

  WITH updated AS (
    UPDATE public.profiles p
       SET gold = 0, updated_at = now()
     WHERE (_clan_id IS NULL OR p.clan_id = _clan_id)
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
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_golds(uuid, boolean) TO authenticated;