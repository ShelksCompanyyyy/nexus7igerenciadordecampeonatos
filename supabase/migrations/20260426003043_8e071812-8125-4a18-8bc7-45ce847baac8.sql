-- Drop existing restrictive insert/update policies and recreate them allowing clan admins
DROP POLICY IF EXISTS "Clan admins insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Clan admins update trainings" ON public.trainings;
DROP POLICY IF EXISTS "Clan admins delete trainings" ON public.trainings;

CREATE POLICY "Clan admins insert trainings"
ON public.trainings
FOR INSERT
TO public
WITH CHECK (
  public.is_clan_admin(auth.uid(), clan_id)
  OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = trainings.clan_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Clan admins update trainings"
ON public.trainings
FOR UPDATE
TO public
USING (
  public.is_clan_admin(auth.uid(), clan_id)
  OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = trainings.clan_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Clan admins delete trainings"
ON public.trainings
FOR DELETE
TO public
USING (
  public.is_clan_admin(auth.uid(), clan_id)
  OR EXISTS (SELECT 1 FROM public.clans c WHERE c.id = trainings.clan_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'superadmin'::app_role)
);