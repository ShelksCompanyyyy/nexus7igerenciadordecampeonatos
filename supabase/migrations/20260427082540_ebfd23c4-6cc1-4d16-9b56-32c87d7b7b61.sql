-- 1) Fix duplicate key on user_roles when promoting team leader/co
CREATE OR REPLACE FUNCTION public.set_team_role(_team_id uuid, _target_user uuid, _role text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _team_clan uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _role NOT IN ('leader','co_leader','member') THEN RAISE EXCEPTION 'Cargo inválido'; END IF;
  SELECT clan_id INTO _team_clan FROM public.teams WHERE id = _team_id;
  IF _team_clan IS NULL THEN RAISE EXCEPTION 'Line não encontrada'; END IF;
  IF NOT (is_clan_admin(auth.uid(), _team_clan) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes do clã podem alterar cargos da line';
  END IF;
  IF _role = 'leader' THEN
    UPDATE public.teams SET team_leader_id = _target_user, updated_at = now() WHERE id = _team_id;
  ELSIF _role = 'co_leader' THEN
    UPDATE public.teams SET team_co_leader_id = _target_user, updated_at = now() WHERE id = _team_id;
  ELSE
    UPDATE public.teams
       SET team_leader_id = CASE WHEN team_leader_id = _target_user THEN NULL ELSE team_leader_id END,
           team_co_leader_id = CASE WHEN team_co_leader_id = _target_user THEN NULL ELSE team_co_leader_id END,
           updated_at = now()
     WHERE id = _team_id;
  END IF;
  IF _role IN ('leader','co_leader') THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target_user AND role IN ('admin','superadmin')) THEN
      BEGIN
        INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, 'admin'::app_role);
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
    UPDATE public.user_roles SET role = 'admin'::app_role
     WHERE user_id = _target_user AND role = 'user'::app_role
       AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = _target_user AND ur2.role = 'admin'::app_role);
  ELSIF _role = 'member' THEN
    IF NOT has_role(_target_user, 'superadmin'::app_role)
       AND NOT EXISTS (SELECT 1 FROM public.clans WHERE owner_id = _target_user)
       AND NOT EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = _target_user AND role IN ('leader','co_leader'))
       AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id <> _team_id AND (team_leader_id = _target_user OR team_co_leader_id = _target_user))
    THEN
      DELETE FROM public.user_roles WHERE user_id = _target_user AND role = 'admin'::app_role;
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_clan_member(_target_user uuid, _clan_id uuid, _new_role clan_role)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT (public.is_clan_admin(auth.uid(), _clan_id) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas líderes podem alterar cargos';
  END IF;
  IF _new_role = 'leader' THEN
    IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR EXISTS (
      SELECT 1 FROM public.clans WHERE id = _clan_id AND owner_id = auth.uid()
    )) THEN
      RAISE EXCEPTION 'Apenas o dono do clã ou Criador podem promover a líder';
    END IF;
  END IF;
  UPDATE public.clan_members SET role = _new_role WHERE clan_id = _clan_id AND user_id = _target_user;
  IF NOT FOUND THEN
    INSERT INTO public.clan_members (clan_id, user_id, role) VALUES (_clan_id, _target_user, _new_role);
  END IF;
  IF _new_role IN ('leader','co_leader') THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _target_user AND role IN ('admin','superadmin')) THEN
      BEGIN
        INSERT INTO public.user_roles (user_id, role) VALUES (_target_user, 'admin'::app_role);
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
    UPDATE public.user_roles SET role = 'admin'::app_role
     WHERE user_id = _target_user AND role = 'user'::app_role
       AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = _target_user AND ur2.role = 'admin'::app_role);
  ELSIF _new_role = 'member' THEN
    IF NOT has_role(_target_user, 'superadmin'::app_role)
       AND NOT EXISTS (SELECT 1 FROM public.clans WHERE owner_id = _target_user)
       AND NOT EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = _target_user AND role IN ('leader','co_leader') AND clan_id <> _clan_id)
       AND NOT EXISTS (SELECT 1 FROM public.teams WHERE (team_leader_id = _target_user OR team_co_leader_id = _target_user))
    THEN
      DELETE FROM public.user_roles WHERE user_id = _target_user AND role = 'admin'::app_role;
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'user_id', _target_user, 'role', _new_role);
END;
$function$;

-- 2) friend_messages
CREATE TABLE IF NOT EXISTS public.friend_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_friend_messages_pair ON public.friend_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_messages_recipient ON public.friend_messages (recipient_id, read);
ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see messages they sent or received" ON public.friend_messages;
CREATE POLICY "Users see messages they sent or received" ON public.friend_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Friends send messages" ON public.friend_messages;
CREATE POLICY "Friends send messages" ON public.friend_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.friends f
      WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = recipient_id)
          OR (f.friend_id = auth.uid() AND f.user_id = recipient_id))
    )
  );

DROP POLICY IF EXISTS "Recipient marks read" ON public.friend_messages;
CREATE POLICY "Recipient marks read" ON public.friend_messages FOR UPDATE
  USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Sender deletes own messages" ON public.friend_messages;
CREATE POLICY "Sender deletes own messages" ON public.friend_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Realtime: add only if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='friend_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='support_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='support_tickets') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets';
  END IF;
END $$;

-- 3) password_reset_codes
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON public.password_reset_codes (email, created_at DESC);
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- 4) Triggers de notificação
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sender_name text;
BEGIN
  IF TG_OP='INSERT' AND NEW.status = 'pending' THEN
    SELECT COALESCE(game_nick, username, 'Alguém') INTO _sender_name FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (NEW.friend_id, '👥 Novo pedido de amizade', _sender_name || ' enviou um pedido.', 'friend');
  ELSIF TG_OP='UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(game_nick, username, 'Alguém') INTO _sender_name FROM public.profiles WHERE user_id = NEW.friend_id;
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (NEW.user_id, '✅ Amizade aceita', _sender_name || ' aceitou seu pedido.', 'friend');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_friend_request ON public.friends;
CREATE TRIGGER trg_notify_friend_request AFTER INSERT OR UPDATE ON public.friends
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

CREATE OR REPLACE FUNCTION public.notify_friend_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sender_name text;
BEGIN
  SELECT COALESCE(game_nick, username, 'Amigo') INTO _sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (NEW.recipient_id, '💬 ' || _sender_name, left(NEW.message, 80), 'friend_message');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_friend_message ON public.friend_messages;
CREATE TRIGGER trg_notify_friend_message AFTER INSERT ON public.friend_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_friend_message();

CREATE OR REPLACE FUNCTION public.notify_support_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (NEW.user_id, '📞 Chamado criado', 'Seu chamado "' || NEW.subject || '" foi recebido.', 'support');
  INSERT INTO public.notifications(user_id, title, message, type)
  SELECT ur.user_id, '🆘 Novo chamado de suporte', 'Assunto: ' || NEW.subject, 'support'
    FROM public.user_roles ur WHERE ur.role = 'superadmin'::app_role;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_support_created ON public.support_tickets;
CREATE TRIGGER trg_notify_support_created AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_created();

CREATE OR REPLACE FUNCTION public.notify_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ticket_owner uuid; _subject text;
BEGIN
  SELECT user_id, subject INTO _ticket_owner, _subject FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NEW.is_staff AND _ticket_owner IS NOT NULL AND _ticket_owner <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (_ticket_owner, '📞 Resposta do suporte', 'Nova resposta no chamado "' || COALESCE(_subject,'') || '".', 'support');
  ELSIF NOT NEW.is_staff THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT ur.user_id, '📞 Nova mensagem no chamado', COALESCE(_subject,'(sem assunto)'), 'support'
      FROM public.user_roles ur WHERE ur.role = 'superadmin'::app_role AND ur.user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_support_message ON public.support_messages;
CREATE TRIGGER trg_notify_support_message AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_support_message();

CREATE OR REPLACE FUNCTION public.notify_matchcw_lines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.line_a_confirmed AND NOT COALESCE(OLD.line_a_confirmed,false) THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT cm.user_id, '🛡️ Line A confirmada', 'O clã A confirmou a line.', 'matchcw'
      FROM public.clan_members cm
     WHERE cm.clan_id IN (NEW.clan_a_id, NEW.clan_b_id) AND cm.role IN ('leader','co_leader');
  END IF;
  IF NEW.line_b_confirmed AND NOT COALESCE(OLD.line_b_confirmed,false) THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT cm.user_id, '🛡️ Line B confirmada', 'O clã B confirmou a line.', 'matchcw'
      FROM public.clan_members cm
     WHERE cm.clan_id IN (NEW.clan_a_id, NEW.clan_b_id) AND cm.role IN ('leader','co_leader');
  END IF;
  IF NEW.line_a_confirmed AND NEW.line_b_confirmed
     AND NOT (COALESCE(OLD.line_a_confirmed,false) AND COALESCE(OLD.line_b_confirmed,false)) THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT cm.user_id, '🚀 MatchCW pronto!', 'Ambas as lines confirmadas. Bora pra batalha!', 'matchcw'
      FROM public.clan_members cm
     WHERE cm.clan_id IN (NEW.clan_a_id, NEW.clan_b_id) AND cm.role IN ('leader','co_leader');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_matchcw_lines ON public.matchcw;
CREATE TRIGGER trg_notify_matchcw_lines AFTER UPDATE ON public.matchcw
FOR EACH ROW EXECUTE FUNCTION public.notify_matchcw_lines();

CREATE OR REPLACE FUNCTION public.notify_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (NEW.user_id, '💸 Saque solicitado',
            'Pedido de ' || NEW.amount || ' NexelGolds enviado.', 'withdrawal');
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT ur.user_id, '💸 Novo saque pendente',
           'Saque de ' || NEW.amount || ' NexelGolds.', 'withdrawal'
      FROM public.user_roles ur WHERE ur.role = 'superadmin'::app_role;
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    VALUES (NEW.user_id,
            CASE WHEN NEW.status='approved' THEN '✅ Saque aprovado'
                 WHEN NEW.status='rejected' THEN '❌ Saque recusado'
                 ELSE '🔄 Status atualizado' END,
            'Status: ' || NEW.status, 'withdrawal');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_notify_withdrawal AFTER INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal();

CREATE OR REPLACE FUNCTION public.notify_training()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT p.user_id, '🎯 Novo X-Treino',
           COALESCE(NEW.title,'X-Treino') || ' em ' || NEW.training_date || ' ' || COALESCE(NEW.training_time,''), 'training'
      FROM public.profiles p WHERE p.clan_id = NEW.clan_id;
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    INSERT INTO public.notifications(user_id, title, message, type)
    SELECT p.user_id,
           CASE WHEN NEW.status='completed' THEN '✅ X-Treino concluído'
                WHEN NEW.status='cancelled' THEN '❌ X-Treino cancelado'
                ELSE '🔄 X-Treino atualizado' END,
           COALESCE(NEW.title,'X-Treino'), 'training'
      FROM public.profiles p WHERE p.clan_id = NEW.clan_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_training ON public.trainings;
CREATE TRIGGER trg_notify_training AFTER INSERT OR UPDATE ON public.trainings
FOR EACH ROW EXECUTE FUNCTION public.notify_training();
