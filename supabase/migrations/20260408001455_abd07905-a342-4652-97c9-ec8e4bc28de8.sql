
-- Create sequence
CREATE SEQUENCE IF NOT EXISTS profile_unique_id_seq START WITH 100001;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superadmin');

-- Create updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== USER ROLES (must come first for has_role) ==========
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);

-- Now create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles management
CREATE POLICY "Superadmins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'superadmin')
);
CREATE POLICY "Superadmins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'superadmin'));

-- ========== CLANS ==========
CREATE TABLE public.clans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo TEXT,
  banner TEXT,
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_code TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clans viewable by everyone" ON public.clans FOR SELECT USING (true);
CREATE POLICY "Clan owners can update" ON public.clans FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Auth users can create clans" ON public.clans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Clan owners can delete" ON public.clans FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'superadmin'));
CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON public.clans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  unique_id TEXT NOT NULL DEFAULT lpad(nextval('profile_unique_id_seq'::regclass)::text, 6, '0'),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  game_nick TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  avatar TEXT,
  gold INTEGER DEFAULT 0,
  free_spins INTEGER DEFAULT 0,
  clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
  team_id UUID,
  badges TEXT[] DEFAULT '{}',
  colored_nick BOOLEAN DEFAULT false,
  nick_color_id TEXT,
  frame_id TEXT,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  mvps INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== TEAMS ==========
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
  players UUID[] DEFAULT '{}',
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Clan admins insert teams" ON public.teams FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE POLICY "Clan admins update teams" ON public.teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE POLICY "Clan admins delete teams" ON public.teams FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== MATCHES ==========
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  match_date TEXT NOT NULL,
  match_time TEXT DEFAULT '',
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
  player_stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Clan admins insert matches" ON public.matches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE POLICY "Clan admins update matches" ON public.matches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== TRAININGS ==========
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  training_date TEXT NOT NULL,
  training_time TEXT DEFAULT '',
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
  player_stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainings viewable by clan" ON public.trainings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.clan_id = trainings.clan_id) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE POLICY "Clan admins insert trainings" ON public.trainings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE POLICY "Clan admins update trainings" ON public.trainings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.clans c WHERE c.id = clan_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'superadmin')
);
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== NEWS ==========
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News viewable by everyone" ON public.news FOR SELECT USING (true);
CREATE POLICY "Admins insert news" ON public.news FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins update news" ON public.news FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins delete news" ON public.news FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- ========== CHAT MESSAGES ==========
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat viewable by everyone" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Auth users send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));

-- ========== WITHDRAWALS ==========
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  game_nick TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  pix_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  user_unique_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update withdrawals" ON public.withdrawals FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- ========== SPIN PURCHASES ==========
CREATE TABLE public.spin_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  spins INTEGER NOT NULL,
  bonus_spins INTEGER DEFAULT 0,
  method TEXT DEFAULT 'pix' CHECK (method IN ('pix', 'stripe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own purchases" ON public.spin_purchases FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Users create purchases" ON public.spin_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update purchases" ON public.spin_purchases FOR UPDATE USING (public.has_role(auth.uid(), 'superadmin'));

-- ========== NOTIFICATIONS ==========
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('withdrawal', 'news', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ========== TRANSFERS ==========
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
  transfer_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transfers viewable by everyone" ON public.transfers FOR SELECT USING (true);
CREATE POLICY "Admins insert transfers" ON public.transfers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- ========== PAYMENTS ==========
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  payment_date TEXT NOT NULL,
  championship TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins insert payments" ON public.payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins update payments" ON public.payments FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- ========== TRIGGER: Auto-create profile on signup ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, game_nick, whatsapp, clan_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'game_nick', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    CASE WHEN NEW.raw_user_meta_data->>'clan_id' IS NOT NULL THEN (NEW.raw_user_meta_data->>'clan_id')::uuid ELSE NULL END
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== STORAGE ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Avatars publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
