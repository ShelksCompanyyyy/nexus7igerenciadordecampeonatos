
-- 1) Fix notifications type check constraint to allow all types used by RPCs
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'system'::text,
    'news'::text,
    'withdrawal'::text,
    'matchcw'::text,
    'deposit'::text,
    'friend'::text,
    'chat'::text,
    'clan'::text,
    'spin'::text,
    'promo'::text,
    'training'::text
  ]));

-- 2) Fix teams RLS: allow clan leaders/co_leaders (not only owner) to manage teams
DROP POLICY IF EXISTS "Clan admins insert teams" ON public.teams;
CREATE POLICY "Clan admins insert teams" ON public.teams
  FOR INSERT
  WITH CHECK (
    public.is_clan_admin(auth.uid(), clan_id)
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = teams.clan_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

DROP POLICY IF EXISTS "Clan admins update teams" ON public.teams;
CREATE POLICY "Clan admins update teams" ON public.teams
  FOR UPDATE
  USING (
    public.is_clan_admin(auth.uid(), clan_id)
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = teams.clan_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

DROP POLICY IF EXISTS "Clan admins delete teams" ON public.teams;
CREATE POLICY "Clan admins delete teams" ON public.teams
  FOR DELETE
  USING (
    public.is_clan_admin(auth.uid(), clan_id)
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = teams.clan_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );

-- Team leaders/co-leaders may also update their own line (logo, name, leaders)
DROP POLICY IF EXISTS "Team leaders update own team" ON public.teams;
CREATE POLICY "Team leaders update own team" ON public.teams
  FOR UPDATE
  USING (
    team_leader_id = auth.uid()
    OR team_co_leader_id = auth.uid()
    OR public.is_clan_admin(auth.uid(), clan_id)
    OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = teams.clan_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
  );
