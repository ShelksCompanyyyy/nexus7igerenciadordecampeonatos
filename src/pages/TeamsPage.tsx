import { useState } from 'react';
import { getTeams, getUsers } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, ChevronLeft, Target, Trophy } from 'lucide-react';

export default function TeamsPage() {
  const { profile } = useAuth();
  const clanId = profile?.clan_id || '';
  const teams = getTeams().filter(t => t.clanId === clanId);
  const users = getUsers().filter(u => u.clanId === clanId);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow">LINES / TIMES</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => {
          const teamPlayers = users.filter(u => team.players.includes(u.id));
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
                <span><span className="text-success">{team.wins}</span> Vitórias</span>
                <span><span className="text-destructive">{team.losses}</span> Derrotas</span>
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
  const { user } = useAuth();
  const clanId = user?.clanId || '';
  const teams = getTeams().filter(t => t.clanId === clanId);
  const users = getUsers().filter(u => u.clanId === clanId);
  const navigate = useNavigate();
  const team = teams.find(t => t.id === id);

  if (!team) return <div className="text-center text-muted-foreground p-12">Time não encontrado</div>;

  const teamPlayers = users.filter(u => team.players.includes(u.id));

  return (
    <div className="space-y-6 animate-slide-up">
      <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-muted-foreground hover:text-primary font-display text-sm">
        <ChevronLeft size={16} /> Voltar
      </button>
      <div className="flex items-center gap-4">
        {team.logo ? <img src={team.logo} alt="" className="w-16 h-16 rounded-lg object-cover" /> :
          <div className="w-16 h-16 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-heading text-2xl">{team.name[0]}</div>}
        <div>
          <h1 className="text-2xl font-heading text-primary text-glow">{team.name}</h1>
          <div className="flex gap-4 text-sm font-display text-muted-foreground mt-1">
            <span><span className="text-success">{team.wins}W</span></span>
            <span><span className="text-destructive">{team.losses}L</span></span>
            <span>{team.wins + team.losses > 0 ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(0) : 0}% WR</span>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Users size={16} /> JOGADORES</h3>
        <div className="space-y-3">
          {teamPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                {p.avatar ? <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm text-foreground">{p.gameNick?.[0]?.toUpperCase()}</div>}
                <div>
                  <p className="font-display text-foreground">{p.gameNick || p.username}</p>
                  <p className="text-xs text-muted-foreground">{p.mvps} MVPs</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-xs font-display">
                <div><p className="text-muted-foreground">K</p><p className="text-foreground">{p.kills}</p></div>
                <div><p className="text-muted-foreground">D</p><p className="text-foreground">{p.deaths}</p></div>
                <div><p className="text-muted-foreground">A</p><p className="text-foreground">{p.assists}</p></div>
                <div><p className="text-muted-foreground">K/D</p><p className="text-primary font-heading">{p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2)}</p></div>
              </div>
            </div>
          ))}
          {teamPlayers.length === 0 && <p className="text-center text-muted-foreground text-sm">Nenhum jogador</p>}
        </div>
      </div>
    </div>
  );
}
