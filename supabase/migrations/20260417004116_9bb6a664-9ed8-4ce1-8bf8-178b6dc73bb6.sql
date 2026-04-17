-- 1. Tabela economy
CREATE TABLE IF NOT EXISTS public.economy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.economy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own economy"
ON public.economy FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins update economy"
ON public.economy FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert economy"
ON public.economy FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_economy_updated_at
BEFORE UPDATE ON public.economy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Atualizar handle_new_user para também criar economy + sanitizar clan_id vazio
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _clan_id uuid;
  _clan_text text;
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

  INSERT INTO public.profiles (user_id, username, email, game_nick, whatsapp, clan_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'game_nick', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    _clan_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));

  INSERT INTO public.economy (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$function$;

-- 3. Backfill economy para usuários existentes
INSERT INTO public.economy (user_id, balance)
SELECT user_id, 0 FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.economy)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Garantir que o trigger handle_new_user existe em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();