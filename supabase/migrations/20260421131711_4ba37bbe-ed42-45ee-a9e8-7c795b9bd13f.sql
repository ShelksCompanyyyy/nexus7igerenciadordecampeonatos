-- ============================================================
-- RPCs de gerenciamento com verificação de permissão hierárquica
-- ============================================================

-- Atualiza estatísticas KDA de um jogador respeitando hierarquia:
-- - superadmin: livre
-- - líder/vice do clã: pode editar qualquer membro do mesmo clã
-- - líder de line: só pode editar jogadores que estão na MESMA line dele
CREATE OR REPLACE FUNCTION public.update_player_stats(
  _target_user uuid,
  _kills integer,
  _deaths integer,
  _assists integer,
  _mvps integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _target_clan uuid;
  _target_team uuid;
  _allowed boolean := false;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: não autenticado';
  END IF;

  SELECT clan_id, team_id INTO _target_clan, _target_team
    FROM public.profiles WHERE user_id = _target_user;

  IF _target_clan IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: jogador alvo sem clã';
  END IF;

  -- 1) superadmin
  IF has_role(_actor, 'superadmin'::app_role) THEN
    _allowed := true;
  -- 2) líder ou vice do clã (livre dentro do clã)
  ELSIF is_clan_admin(_actor, _target_clan) THEN
    _allowed := true;
  -- 3) líder de line: só se o alvo está na MESMA line liderada pelo ator
  ELSIF _target_team IS NOT NULL AND is_team_leader(_actor, _target_team) THEN
    _allowed := true;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para editar este jogador';
  END IF;

  UPDATE public.profiles
     SET kills = COALESCE(_kills, kills),
         deaths = COALESCE(_deaths, deaths),
         assists = COALESCE(_assists, assists),
         mvps = COALESCE(_mvps, mvps),
         updated_at = now()
   WHERE user_id = _target_user;

  RETURN jsonb_build_object('success', true, 'user_id', _target_user);
END;
$$;

-- Adiciona/remove jogador de uma line respeitando hierarquia.
-- - superadmin / líder do clã: livre
-- - líder de line: só pode mexer na PRÓPRIA line e só com membros do MESMO clã
CREATE OR REPLACE FUNCTION public.manage_team_player(
  _team_id uuid,
  _target_user uuid,
  _action text  -- 'add' | 'remove'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _team_clan uuid;
  _target_clan uuid;
  _players uuid[];
  _allowed boolean := false;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: não autenticado';
  END IF;
  IF _action NOT IN ('add','remove') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;

  SELECT clan_id, COALESCE(players,'{}'::uuid[]) INTO _team_clan, _players
    FROM public.teams WHERE id = _team_id;
  IF _team_clan IS NULL THEN
    RAISE EXCEPTION 'Line não encontrada';
  END IF;

  SELECT clan_id INTO _target_clan FROM public.profiles WHERE user_id = _target_user;
  IF _target_clan IS NULL OR _target_clan <> _team_clan THEN
    RAISE EXCEPTION 'Acesso negado: jogador não pertence ao mesmo clã da line';
  END IF;

  IF has_role(_actor, 'superadmin'::app_role) THEN
    _allowed := true;
  ELSIF is_clan_admin(_actor, _team_clan) THEN
    _allowed := true;
  ELSIF is_team_leader(_actor, _team_id) THEN
    _allowed := true;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão sobre esta line';
  END IF;

  IF _action = 'add' THEN
    IF array_length(_players,1) >= 5 THEN
      RAISE EXCEPTION 'Line cheia (máx 5)';
    END IF;
    IF _target_user = ANY(_players) THEN
      RAISE EXCEPTION 'Jogador já está na line';
    END IF;
    UPDATE public.teams SET players = array_append(_players,_target_user), updated_at = now() WHERE id = _team_id;
    UPDATE public.profiles SET team_id = _team_id, updated_at = now() WHERE user_id = _target_user;
  ELSE
    UPDATE public.teams SET players = array_remove(_players,_target_user), updated_at = now() WHERE id = _team_id;
    UPDATE public.profiles SET team_id = NULL, updated_at = now() WHERE user_id = _target_user;
  END IF;

  RETURN jsonb_build_object('success', true, 'action', _action);
END;
$$;

-- ============================================================
-- Histórico realtime dos giros (visível por todos)
-- ============================================================

-- Permitir SELECT público em spins para a feed da comunidade
DROP POLICY IF EXISTS "Spins history viewable by everyone" ON public.spins;
CREATE POLICY "Spins history viewable by everyone"
  ON public.spins FOR SELECT
  USING (true);

-- Habilitar realtime na tabela spins (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='spins'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.spins';
  END IF;
END $$;

ALTER TABLE public.spins REPLICA IDENTITY FULL;
