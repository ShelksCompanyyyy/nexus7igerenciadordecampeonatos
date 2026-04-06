import { useState } from 'react';
import { getUsers, getTeams } from '@/lib/store';
import { Trophy, Target, Zap, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'players' | 'teams' | 'mvp' | 'gold';

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>('players');
  const users = getUsers().filter(u => u.role !== 'superadmin');
  const teams = getTeams();
  const navigate = useNavigate();

  const sortedPlayers = [...users].sort((a, b) => {
    const kdA = a.deaths > 0 ? a.kills / a.deaths : a.kills;
    const kdB = b.deaths > 0 ? b.kills / b.deaths : b.kills;
    return kdB - kdA;
  });
  const sortedMvp = [...users].sort((a, b) => b.mvps - a.mvps);
  const sortedGold = [...users].sort((a, b) => b.gold - a.gold);
  const sortedTeams = [...teams].sort((a, b) => b.wins - a.wins);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'players', label: 'Jogadores', icon: Target },
    { id: 'teams', label: 'Times', icon: Trophy },
    { id: 'mvp', label: 'MVP', icon: Zap },
    { id: 'gold', label: 'Gold', icon: Trophy },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow">RANKING</h1>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              tab === t.id ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'players' && (
        <div className="bg-card rounded-lg neon-border overflow-hidden">
          <table className="w-full text-sm font-display">
            <thead><tr className="border-b border-border text-muted-foreground text-xs font-heading">
              <th className="p-3 text-left">#</th><th className="p-3 text-left">JOGADOR</th>
              <th className="p-3">KILLS</th><th className="p-3">MORTES</th><th className="p-3">ASSIST</th><th className="p-3">K/D</th>
            </tr></thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-primary/5 transition-colors ${i < 3 ? 'bg-primary/5' : ''}`}>
                  <td className="p-3"><span className={`font-heading ${i < 3 ? 'text-primary text-glow-sm' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="p-3 text-foreground">{p.gameNick || p.username}</td>
                  <td className="p-3 text-center text-foreground">{p.kills}</td>
                  <td className="p-3 text-center text-foreground">{p.deaths}</td>
                  <td className="p-3 text-center text-foreground">{p.assists}</td>
                  <td className="p-3 text-center text-primary font-heading">{p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedPlayers.length === 0 && <p className="p-6 text-center text-muted-foreground font-display">Nenhum jogador registrado</p>}
        </div>
      )}

      {tab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedTeams.map((team, i) => (
            <button key={team.id} onClick={() => navigate(`/teams/${team.id}`)}
              className={`p-4 bg-card rounded-lg border transition-all text-left hover:neon-border ${i < 3 ? 'neon-border' : 'border-border'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-heading text-lg ${i < 3 ? 'text-primary text-glow-sm' : 'text-muted-foreground'}`}>#{i + 1}</span>
                  <div>
                    <p className="font-display text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.players.length} jogadores</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-display"><span className="text-success">{team.wins}W</span> / <span className="text-destructive">{team.losses}L</span></p>
                  <p className="text-xs text-muted-foreground">{team.wins + team.losses > 0 ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(0) : 0}% WR</p>
                </div>
              </div>
            </button>
          ))}
          {sortedTeams.length === 0 && <p className="col-span-2 text-center text-muted-foreground font-display p-6">Nenhum time</p>}
        </div>
      )}

      {tab === 'mvp' && (
        <div className="bg-card rounded-lg neon-border overflow-hidden">
          <table className="w-full text-sm font-display">
            <thead><tr className="border-b border-border text-muted-foreground text-xs font-heading">
              <th className="p-3 text-left">#</th><th className="p-3 text-left">JOGADOR</th><th className="p-3">MVPs</th>
            </tr></thead>
            <tbody>
              {sortedMvp.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/50 ${i < 3 ? 'bg-primary/5' : ''}`}>
                  <td className="p-3"><span className={`font-heading ${i < 3 ? 'text-primary text-glow-sm' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="p-3 text-foreground">{p.gameNick || p.username}</td>
                  <td className="p-3 text-center text-primary font-heading">{p.mvps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'gold' && (
        <div className="bg-card rounded-lg neon-border overflow-hidden">
          <table className="w-full text-sm font-display">
            <thead><tr className="border-b border-border text-muted-foreground text-xs font-heading">
              <th className="p-3 text-left">#</th><th className="p-3 text-left">JOGADOR</th><th className="p-3">GOLD</th>
            </tr></thead>
            <tbody>
              {sortedGold.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/50 ${i < 3 ? 'bg-gold/5' : ''}`}>
                  <td className="p-3"><span className={`font-heading ${i < 3 ? 'text-gold text-glow-gold' : 'text-muted-foreground'}`}>{i + 1}</span></td>
                  <td className="p-3 text-foreground">{p.gameNick || p.username}</td>
                  <td className="p-3 text-center text-gold font-heading">{p.gold}G</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
