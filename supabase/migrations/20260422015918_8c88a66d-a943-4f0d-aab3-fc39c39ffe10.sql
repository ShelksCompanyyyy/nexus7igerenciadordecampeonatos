
-- 1) Remove old request_matchcw overload (3-arg) so the 8-arg version is unambiguous
DROP FUNCTION IF EXISTS public.request_matchcw(uuid, uuid, text);

-- 2) Deposits table for real-money top-ups (PIX manual + Stripe future)
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  proof_url text,
  pix_key text,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own deposits" ON public.deposits;
CREATE POLICY "Users view own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Users create own deposits" ON public.deposits;
CREATE POLICY "Users create own deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Superadmin update deposits" ON public.deposits;
CREATE POLICY "Superadmin update deposits" ON public.deposits
  FOR UPDATE USING (has_role(auth.uid(), 'superadmin'::app_role));

DROP TRIGGER IF EXISTS trg_deposits_updated_at ON public.deposits;
CREATE TRIGGER trg_deposits_updated_at BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RPC: superadmin approves a deposit and credits economy.balance
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _d public.deposits%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmin';
  END IF;
  SELECT * INTO _d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Depósito não encontrado'; END IF;
  IF _d.status <> 'pending' THEN RAISE EXCEPTION 'Depósito já processado'; END IF;

  IF _approve THEN
    -- Garante linha em economy
    INSERT INTO public.economy(user_id, balance) VALUES (_d.user_id, 0)
      ON CONFLICT DO NOTHING;
    UPDATE public.economy SET balance = balance + _d.amount, updated_at = now()
     WHERE user_id = _d.user_id;
    UPDATE public.deposits SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
     WHERE id = _deposit_id;
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (_d.user_id, '💰 Depósito aprovado!', 'R$ ' || _d.amount || ' creditado no seu saldo MatchCW.', 'deposit');
  ELSE
    UPDATE public.deposits SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
     WHERE id = _deposit_id;
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (_d.user_id, '❌ Depósito recusado', 'Seu depósito foi recusado. Entre em contato com o ADM.', 'deposit');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END);
END; $$;

-- 4) Allow user economy upsert for new users (idempotent insert)
DROP POLICY IF EXISTS "System can insert economy" ON public.economy;
CREATE POLICY "System can insert economy" ON public.economy
  FOR INSERT WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'superadmin'::app_role));

-- 5) Realtime + replica identity for live feeds
ALTER TABLE public.spins REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.matchcw REPLICA IDENTITY FULL;
ALTER TABLE public.matchcw_bets REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.spins; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matchcw; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matchcw_bets; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 6) Storage bucket for deposit proofs (public-read; users upload their own folder)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-proofs', 'deposit-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view deposit proofs" ON storage.objects;
CREATE POLICY "Public can view deposit proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs');

DROP POLICY IF EXISTS "Users upload own deposit proofs" ON storage.objects;
CREATE POLICY "Users upload own deposit proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
