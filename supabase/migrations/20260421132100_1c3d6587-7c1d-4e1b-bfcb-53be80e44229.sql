-- 1) Permitir clan_b_id nullable em matchcw (matchmaking aberto)
ALTER TABLE public.matchcw ALTER COLUMN clan_b_id DROP NOT NULL;

-- 2) Recriar request_matchcw aceitando clan_b opcional
CREATE OR REPLACE FUNCTION public.request_matchcw(_clan_a uuid, _clan_b uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _today_count integer;
  _new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _clan_a) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã podem enviar pedidos de MatchCW';
  END IF;
  IF _clan_b IS NOT NULL AND _clan_a = _clan_b THEN
    RAISE EXCEPTION 'Clãs devem ser diferentes';
  END IF;

  SELECT COUNT(*) INTO _today_count
  FROM public.matchcw
  WHERE (clan_a_id = _clan_a OR clan_b_id = _clan_a)
    AND created_at::date = current_date
    AND status NOT IN ('declined');
  IF _today_count >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido para este clã';
  END IF;

  INSERT INTO public.matchcw(clan_a_id, clan_b_id, requested_by, notes, status)
  VALUES (_clan_a, _clan_b, auth.uid(), _notes, 'pending')
  RETURNING id INTO _new_id;

  -- Notificar líderes do clã B (se especificado)
  IF _clan_b IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT cm.user_id,
           '⚔️ Novo desafio MatchCW',
           'Seu clã recebeu um pedido de MatchCW. Acesse a aba MatchCW para responder.',
           'matchcw'
    FROM public.clan_members cm
    WHERE cm.clan_id = _clan_b AND cm.role IN ('leader','co_leader');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', _new_id);
END;
$function$;

-- 3) Recriar respond_matchcw para aceitar pedidos abertos (claim)
CREATE OR REPLACE FUNCTION public.respond_matchcw(_match_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _m public.matchcw%ROWTYPE;
  _actor_clan uuid;
  _today_count integer;
BEGIN
  SELECT * INTO _m FROM public.matchcw WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MatchCW não encontrado'; END IF;
  IF _m.status <> 'pending' THEN RAISE EXCEPTION 'Pedido já foi respondido'; END IF;

  -- Pedido direcionado: apenas líderes do clã B
  IF _m.clan_b_id IS NOT NULL THEN
    IF NOT (is_clan_admin(auth.uid(), _m.clan_b_id) OR has_role(auth.uid(),'superadmin'::app_role)) THEN
      RAISE EXCEPTION 'Apenas líderes do clã desafiado podem responder';
    END IF;
    UPDATE public.matchcw
       SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
           updated_at = now()
     WHERE id = _match_id;
  ELSE
    -- Pedido aberto: qualquer líder de outro clã pode aceitar (claim)
    SELECT clan_id INTO _actor_clan FROM public.clan_members
     WHERE user_id = auth.uid() AND role IN ('leader','co_leader')
     LIMIT 1;
    IF _actor_clan IS NULL AND NOT has_role(auth.uid(),'superadmin'::app_role) THEN
      RAISE EXCEPTION 'Apenas líderes de clã podem aceitar';
    END IF;
    IF _actor_clan = _m.clan_a_id THEN
      RAISE EXCEPTION 'Você não pode aceitar o próprio pedido';
    END IF;

    IF _accept THEN
      -- Verifica limite diário do clã que está aceitando
      SELECT COUNT(*) INTO _today_count
      FROM public.matchcw
      WHERE (clan_a_id = _actor_clan OR clan_b_id = _actor_clan)
        AND created_at::date = current_date
        AND status NOT IN ('declined');
      IF _today_count >= 10 THEN
        RAISE EXCEPTION 'Limite de 10 MatchCW por dia atingido para o seu clã';
      END IF;

      UPDATE public.matchcw
         SET clan_b_id = _actor_clan,
             status = 'accepted',
             updated_at = now()
       WHERE id = _match_id;
    ELSE
      -- Recusa em pedido aberto não faz sentido — ignora
      RETURN jsonb_build_object('success', false, 'reason', 'open_request_cannot_be_declined');
    END IF;
  END IF;

  -- Notificar quem pediu
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (
    _m.requested_by,
    CASE WHEN _accept THEN '✅ MatchCW aceito' ELSE '❌ MatchCW recusado' END,
    CASE WHEN _accept THEN 'Seu pedido foi aceito! Abra o chat para coordenar.' ELSE 'O clã desafiado recusou.' END,
    'matchcw'
  );

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN _accept THEN 'accepted' ELSE 'declined' END);
END;
$function$;

-- 4) Adicionar campos extras em trainings
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS participant_names text[] DEFAULT '{}'::text[];

-- 5) Bucket público para fotos de treino
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-photos', 'training-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: leitura pública, escrita por usuários autenticados
DROP POLICY IF EXISTS "Training photos public read" ON storage.objects;
CREATE POLICY "Training photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-photos');

DROP POLICY IF EXISTS "Auth users upload training photos" ON storage.objects;
CREATE POLICY "Auth users upload training photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users update own training photos" ON storage.objects;
CREATE POLICY "Auth users update own training photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Auth users delete own training photos" ON storage.objects;
CREATE POLICY "Auth users delete own training photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-photos' AND auth.uid() IS NOT NULL);