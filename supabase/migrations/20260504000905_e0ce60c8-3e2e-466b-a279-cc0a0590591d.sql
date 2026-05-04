
-- Admin settings (key/value)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "settings superadmin write" ON public.admin_settings FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

INSERT INTO public.admin_settings(key, value) VALUES
  ('daily_cw_tickets', '{"count": 3}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Hide finished CW per user
CREATE TABLE IF NOT EXISTS public.cw_history_hidden (
  user_id uuid NOT NULL,
  matchcw_id uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, matchcw_id)
);
ALTER TABLE public.cw_history_hidden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hidden own select" ON public.cw_history_hidden FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hidden own insert" ON public.cw_history_hidden FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hidden own delete" ON public.cw_history_hidden FOR DELETE USING (auth.uid() = user_id);

-- Xtreino trophies catalog
CREATE TABLE IF NOT EXISTS public.xtreino_trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🏆',
  color text NOT NULL DEFAULT '#FFD700',
  kind text NOT NULL DEFAULT 'trophy', -- trophy | banner | medal
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xtreino_trophies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trophies public read" ON public.xtreino_trophies FOR SELECT USING (true);
CREATE POLICY "trophies superadmin write" ON public.xtreino_trophies FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Trophy awards (winners)
CREATE TABLE IF NOT EXISTS public.xtreino_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trophy_id uuid NOT NULL REFERENCES public.xtreino_trophies(id) ON DELETE CASCADE,
  user_id uuid,
  team_id uuid,
  clan_id uuid,
  notes text,
  awarded_by uuid,
  awarded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xtreino_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "winners public read" ON public.xtreino_winners FOR SELECT USING (true);
CREATE POLICY "winners insert by leader/admin" ON public.xtreino_winners FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (clan_id IS NOT NULL AND is_clan_admin(auth.uid(), clan_id))
  );
CREATE POLICY "winners update by leader/admin" ON public.xtreino_winners FOR UPDATE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (clan_id IS NOT NULL AND is_clan_admin(auth.uid(), clan_id))
  );
CREATE POLICY "winners delete by leader/admin" ON public.xtreino_winners FOR DELETE
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (clan_id IS NOT NULL AND is_clan_admin(auth.uid(), clan_id))
  );

CREATE INDEX IF NOT EXISTS idx_winners_user ON public.xtreino_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_clan ON public.xtreino_winners(clan_id);

-- Daily CW tickets table to track grants
CREATE TABLE IF NOT EXISTS public.cw_daily_tickets (
  user_id uuid NOT NULL,
  granted_date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, granted_date)
);
ALTER TABLE public.cw_daily_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cw daily own read" ON public.cw_daily_tickets FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

-- Add cw_tickets column on profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cw_tickets integer NOT NULL DEFAULT 0;

-- Function: claim daily CW tickets
CREATE OR REPLACE FUNCTION public.claim_daily_cw_tickets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_already int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;

  SELECT COALESCE((value->>'count')::int, 3) INTO v_count
  FROM admin_settings WHERE key = 'daily_cw_tickets';
  v_count := COALESCE(v_count, 3);

  SELECT count INTO v_already FROM cw_daily_tickets
   WHERE user_id = v_uid AND granted_date = v_today;
  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed', 'count', v_already);
  END IF;

  INSERT INTO cw_daily_tickets(user_id, granted_date, count) VALUES (v_uid, v_today, v_count);
  UPDATE profiles SET cw_tickets = COALESCE(cw_tickets, 0) + v_count WHERE user_id = v_uid;
  RETURN jsonb_build_object('success', true, 'granted', v_count);
END $$;

-- Function: set admin setting
CREATE OR REPLACE FUNCTION public.set_admin_setting(_key text, _value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO admin_settings(key, value, updated_by, updated_at)
  VALUES (_key, _value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = auth.uid(), updated_at = now();
END $$;

-- Function: clear finished CW from user view
CREATE OR REPLACE FUNCTION public.clear_finished_cw(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO cw_history_hidden(user_id, matchcw_id)
  VALUES (auth.uid(), _match_id)
  ON CONFLICT DO NOTHING;
END $$;

-- Function: clear ALL finished CWs from user view
CREATE OR REPLACE FUNCTION public.clear_all_finished_cw()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  WITH ins AS (
    INSERT INTO cw_history_hidden(user_id, matchcw_id)
    SELECT auth.uid(), m.id FROM matchcw m
     WHERE m.status IN ('finalized','declined')
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_n FROM ins;
  RETURN v_n;
END $$;
