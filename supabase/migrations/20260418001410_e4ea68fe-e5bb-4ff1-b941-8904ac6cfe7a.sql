-- 1. Enum para cargos do clã
DO $$ BEGIN
  CREATE TYPE public.clan_role AS ENUM ('leader', 'co_leader', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabela clan_members
CREATE TABLE IF NOT EXISTS public.clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.clan_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clan_id, user_id)
);

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON public.clan_members(user_id);

-- Helper: verifica se user é leader/co_leader do clã (security definer evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_clan_admin(_user_id uuid, _clan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clan_members
    WHERE user_id = _user_id AND clan_id = _clan_id AND role IN ('leader','co_leader')
  )
$$;

CREATE POLICY "Clan members viewable by everyone"
  ON public.clan_members FOR SELECT USING (true);

CREATE POLICY "Clan admins manage members - insert"
  ON public.clan_members FOR INSERT
  WITH CHECK (
    public.is_clan_admin(auth.uid(), clan_id)
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Clan admins manage members - update"
  ON public.clan_members FOR UPDATE
  USING (
    public.is_clan_admin(auth.uid(), clan_id)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Clan admins or self can remove"
  ON public.clan_members FOR DELETE
  USING (
    public.is_clan_admin(auth.uid(), clan_id)
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- Backfill: criar leader entry para cada clã existente que tenha owner_id
INSERT INTO public.clan_members (clan_id, user_id, role)
SELECT id, owner_id, 'leader'::clan_role
FROM public.clans
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. RPC: promover membro a co_leader
CREATE OR REPLACE FUNCTION public.promote_clan_member(_target_user uuid, _clan_id uuid, _new_role clan_role)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT (public.is_clan_admin(auth.uid(), _clan_id) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes podem alterar cargos';
  END IF;
  IF _new_role = 'leader' THEN
    RAISE EXCEPTION 'Não é possível promover a líder por essa função';
  END IF;

  UPDATE public.clan_members
     SET role = _new_role
   WHERE clan_id = _clan_id AND user_id = _target_user;

  IF NOT FOUND THEN
    -- Se ainda não é membro, insere
    INSERT INTO public.clan_members (clan_id, user_id, role)
    VALUES (_clan_id, _target_user, _new_role);
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user, 'role', _new_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_clan_member(uuid, uuid, clan_role) TO authenticated;

-- 4. Tabela friends
DO $$ BEGIN
  CREATE TYPE public.friend_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status public.friend_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);

CREATE POLICY "Users see their own friend rows"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users create own friend requests"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update friendship if involved"
  ON public.friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users delete own friend rows"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Tabela promo_codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  reward integer NOT NULL DEFAULT 0,
  uses integer NOT NULL DEFAULT 0,
  max_uses integer,                            -- NULL = ilimitado
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active codes meta"
  ON public.promo_codes FOR SELECT USING (true);

CREATE POLICY "Superadmin manages codes - insert"
  ON public.promo_codes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin manages codes - update"
  ON public.promo_codes FOR UPDATE
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin manages codes - delete"
  ON public.promo_codes FOR DELETE
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- 6. Tabela promo_code_redemptions
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

-- 7. RPC: redeem_promo_code
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _promo public.promo_codes%ROWTYPE;
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

  -- Credita reward
  UPDATE public.profiles
     SET gold = COALESCE(gold,0) + _promo.reward,
         updated_at = now()
   WHERE user_id = _user_id;

  UPDATE public.promo_codes
     SET uses = uses + 1
   WHERE id = _promo.id;

  INSERT INTO public.promo_code_redemptions (promo_code_id, user_id, reward)
  VALUES (_promo.id, _user_id, _promo.reward);

  RETURN jsonb_build_object('success', true, 'reward', _promo.reward, 'code', _promo.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;