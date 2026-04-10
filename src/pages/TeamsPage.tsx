import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, ChevronLeft, Target, Trophy } from 'lucide-react';

export default function TeamsPage() {
  const { profile } = useAuth();
  const clanId = profile?.clan_id || '';
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!clanId) return;
    supabase.from('teams').select('*').eq('clan_id', clanId).then(({ data }) => setTeams(data || []));
    supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setMembers(data || []));
  }, [clanId]);

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow">LINES / TIMES</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => {
          const teamPlayers = members.filter(u => team.players?.includes(u.user_id));
          return (
            <button key={team.id} onClick={() => navigate(`/teams/${team.id}`)}
              className="p-5 bg-card rounded-lg border border-border hover:neon-border transition-all text-left group">
              <div className="flex items-center gap-3 mb-4">
                {team.logo ? <img src={team.logo} alt="" className="w-12 h-12 rounded-lg object-cover" /> :
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-heading">{team.name[0]}</div>}
                <div>
                  <p className="font-heading text-sm text-foreground group-hover:text-primary transition-colors">{team.name}</p>
                  <p className="text-xs text-muted-foreground font-display">{teamPlayers.length}/5 jogadores</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-display text-muted-foreground">
                <span><span className="text-success">{team.wins || 0}</span> Vitórias</span>
                <span><span className="text-destructive">{team.losses || 0}</span> Derrotas</span>
              </div>
            </button>
          );
        })}
        {teams.length === 0 && <p className="col-span-3 text-center text-muted-foreground font-display p-12">Nenhuma line criada no seu clã</p>}
      </div>
    </div>
  );
}

export function TeamDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const clanId = profile?.clan_id || '';
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    supabase.from('teams').select('*').eq('id', id).single().then(({ data }) => setTeam(data));
    supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setMembers(data || []));
  }, [id, clanId]);

  if (!team) return <div className="text-center text-muted-foreground p-12 font-display">Carregando...</div>;

  const teamPlayers = members.filter(u => team.players?.includes(u.user_id));

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-display text-sm">
        <ChevronLeft size={16} /> Voltar
      </button>
      <div className="bg-card rounded-lg neon-border-strong p-6 text-center">
        {team.logo ? <img src={team.logo} alt="" className="w-20 h-20 rounded-xl mx-auto mb-4 object-cover" /> :
          <div className="w-20 h-20 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-heading text-2xl mx-auto mb-4">{team.name[0]}</div>}
        <h1 className="text-2xl font-heading text-primary text-glow">{team.name}</h1>
        <div className="flex justify-center gap-6 mt-3 text-sm font-display">
          <span className="text-success">{team.wins || 0} Vitórias</span>
          <span className="text-destructive">{team.losses || 0} Derrotas</span>
        </div>
      </div>
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Users size={16} /> JOGADORES ({teamPlayers.length}/5)</h3>
        <div className="space-y-3">
          {teamPlayers.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              {p.avatar ? <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xs">{p.game_nick?.[0]?.toUpperCase()}</div>}
              <div className="flex-1">
                <p className="font-display text-foreground text-sm">{p.game_nick}</p>
                <p className="text-xs text-muted-foreground font-display">{p.kills || 0}K / {p.deaths || 0}D / {p.assists || 0}A</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary font-heading">{p.mvps || 0} MVPs</p>
              </div>
            </div>
          ))}
          {teamPlayers.length === 0 && <p className="text-center text-muted-foreground text-sm font-display">Nenhum jogador</p>}
        </div>
      </div>
    </div>
  );
}
