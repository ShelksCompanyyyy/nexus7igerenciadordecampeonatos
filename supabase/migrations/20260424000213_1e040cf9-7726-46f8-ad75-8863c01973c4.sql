
CREATE OR REPLACE FUNCTION public.manage_team_player(_team_id uuid, _target_user uuid, _action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _team_clan uuid;
  _target_clan uuid;
  _players uuid[];
  _allowed boolean := false;
  _prev_team uuid;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Acesso negado: não autenticado'; END IF;
  IF _action NOT IN ('add','remove') THEN RAISE EXCEPTION 'Ação inválida'; END IF;

  SELECT clan_id, COALESCE(players,'{}'::uuid[]) INTO _team_clan, _players FROM public.teams WHERE id = _team_id;
  IF _team_clan IS NULL THEN RAISE EXCEPTION 'Line não encontrada'; END IF;

  SELECT clan_id, team_id INTO _target_clan, _prev_team FROM public.profiles WHERE user_id = _target_user;
  IF _target_clan IS NULL OR _target_clan <> _team_clan THEN
    RAISE EXCEPTION 'Acesso negado: jogador não pertence ao mesmo clã da line';
  END IF;

  -- Permissões: superadmin > líder/vice de clã > líder/vice da line
  IF has_role(_actor, 'superadmin'::app_role) THEN _allowed := true;
  ELSIF is_clan_admin(_actor, _team_clan) THEN _allowed := true;
  ELSIF is_team_leader_or_co(_actor, _team_id) THEN _allowed := true;
  END IF;

  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado: você não tem permissão sobre esta line'; END IF;

  IF _action = 'add' THEN
    IF array_length(_players,1) >= 5 THEN RAISE EXCEPTION 'Line cheia (máx 5)'; END IF;
    IF _target_user = ANY(_players) THEN RAISE EXCEPTION 'Jogador já está na line'; END IF;

    -- Se o jogador já estava em outra line do mesmo clã, remove de lá primeiro
    IF _prev_team IS NOT NULL AND _prev_team <> _team_id THEN
      UPDATE public.teams
         SET players = array_remove(COALESCE(players,'{}'::uuid[]), _target_user),
             team_leader_id = CASE WHEN team_leader_id = _target_user THEN NULL ELSE team_leader_id END,
             team_co_leader_id = CASE WHEN team_co_leader_id = _target_user THEN NULL ELSE team_co_leader_id END,
             updated_at = now()
       WHERE id = _prev_team;
    END IF;

    UPDATE public.teams SET players = array_append(_players,_target_user), updated_at = now() WHERE id = _team_id;
    UPDATE public.profiles SET team_id = _team_id, updated_at = now() WHERE user_id = _target_user;
  ELSE
    UPDATE public.teams
       SET players = array_remove(_players,_target_user),
           team_leader_id = CASE WHEN team_leader_id = _target_user THEN NULL ELSE team_leader_id END,
           team_co_leader_id = CASE WHEN team_co_leader_id = _target_user THEN NULL ELSE team_co_leader_id END,
           updated_at = now()
     WHERE id = _team_id;
    UPDATE public.profiles SET team_id = NULL, updated_at = now() WHERE user_id = _target_user;
  END IF;

  RETURN jsonb_build_object('success', true);
END; $function$;
