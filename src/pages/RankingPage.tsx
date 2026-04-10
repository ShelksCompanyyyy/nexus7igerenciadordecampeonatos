import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, Zap, Users, ChevronRight, ArrowLeft } from 'lucide-react';

type Tab = 'players' | 'teams' | 'mvp' | 'gold' | 'clans';

function ClanDetailView({ clanId, onBack }: { clanId: string; onBack: () => void }) {
  const [clan, setClan] = useState<any>(null);
  const [clanMembers, setClanMembers] = useState<any[]>([]);
  const [clanTeams, setClanTeams] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('clans').select('*').eq('id', clanId).single().then(({ data }) => setClan(data));
    supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setClanMembers(data || []));
    supabase.from('teams').select('*').eq('clan_id', clanId).then(({ data }) => setClanTeams(data || []));
  }, [clanId]);

  return (
    <div className="space-y-6 animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-display text-sm transition-colors">
        <ArrowLeft size={16} /> Voltar aos Clãs
      </button>
      <div className="bg-card rounded-lg neon-border p-6">
        <div className="flex items-center gap-4 mb-4">
          {clan?.logo ? (
            <img src={clan.logo} alt={clan.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/50" />
          ) : (
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xl">
              {clan?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-heading text-primary text-glow">{clan?.name}</h2>
            <p className="text-sm text-muted-foreground font-display">{clanMembers.length} membros · {clanTeams.length} times</p>
          </div>
        </div>
      </div>
      <h3 className="font-heading text-sm text-primary">MEMBROS ({clanMembers.length})</h3>
      <div className="bg-card rounded-lg neon-border overflow-hidden">
        <table className="w-full text-sm font-display">
          <thead><tr className="border-b border-border text-muted-foreground text-xs font-heading">
            <th className="p-3 text-left">JOGADOR</th><th className="p-3">K/D</th><th className="p-3">MVPs</th>
          </tr></thead>
          <tbody>
            {clanMembers.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                <td className="p-3 text-foreground">{p.game_nick || p.username}</td>
                <td className="p-3 text-center text-primary font-heading">{(p.deaths || 0) > 0 ? ((p.kills || 0) / (p.deaths || 1)).toFixed(2) : (p.kills || 0).toFixed(2)}</td>
                <td className="p-3 text-center text-foreground">{p.mvps || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clanMembers.length === 0 && <p className="p-6 text-center text-muted-foreground font-display">Nenhum membro</p>}
      </div>
    </div>
  );
}

export default function RankingPage() {
  const [tab, setTab] = useState<Tab>('players');
  const [viewingClanId, setViewingClanId] = useState<string | null>(null);
  const { profile } = useAuth();
  const clanId = profile?.clan_id || '';

  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [allClans, setAllClans] = useState<any[]>([]);

  useEffect(() => {
    if (clanId) {
      supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setMembers(data || []));
      supabase.from('teams').select('*').eq('clan_id', clanId).then(({ data }) => setTeams(data || []));
    }
    supabase.from('clans').select('*').then(({ data }) => setAllClans(data || []));
  }, [clanId]);

  const sortedPlayers = [...members].sort((a, b) => {
    const kdA = (a.deaths || 0) > 0 ? (a.kills || 0) / (a.deaths || 1) : (a.kills || 0);
    const kdB = (b.deaths || 0) > 0 ? (b.kills || 0) / (b.deaths || 1) : (b.kills || 0);
    return kdB - kdA;
  });
  const sortedMvp = [...members].sort((a, b) => (b.mvps || 0) - (a.mvps || 0));
  const sortedGold = [...members].sort((a, b) => (b.gold || 0) - (a.gold || 0));
  const sortedTeams = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0));

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'players', label: 'Jogadores', icon: Target },
    { id: 'teams', label: 'Times', icon: Trophy },
    { id: 'mvp', label: 'MVP', icon: Zap },
    { id: 'gold', label: 'Gold', icon: Trophy },
    { id: 'clans', label: 'Clãs', icon: Users },
  ];

  if (viewingClanId) {
    return <ClanDetailView clanId={viewingClanId} onBack={() => setViewingClanId(null)} />;
  }

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
                  <td className="p-3 text-foreground">{p.game_nick || p.username}</td>
                  <td className="p-3 text-center text-foreground">{p.kills || 0}</td>
                  <td className="p-3 text-center text-foreground">{p.deaths || 0}</td>
                  <td className="p-3 text-center text-foreground">{p.assists || 0}</td>
                  <td className="p-3 text-center text-primary font-heading">{(p.deaths || 0) > 0 ? ((p.kills || 0) / (p.deaths || 1)).toFixed(2) : (p.kills || 0).toFixed(2)}</td>
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
            <div key={team.id} className={`p-4 bg-card rounded-lg border transition-all text-left ${i < 3 ? 'neon-border' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-heading text-lg ${i < 3 ? 'text-primary text-glow-sm' : 'text-muted-foreground'}`}>#{i + 1}</span>
                  <div>
                    <p className="font-display text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{(team.players || []).length} jogadores</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-display"><span className="text-success">{team.wins || 0}W</span> / <span className="text-destructive">{team.losses || 0}L</span></p>
                </div>
              </div>
            </div>
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
                  <td className="p-3 text-foreground">{p.game_nick || p.username}</td>
                  <td className="p-3 text-center text-primary font-heading">{p.mvps || 0}</td>
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
                  <td className="p-3 text-foreground">{p.game_nick || p.username}</td>
                  <td className="p-3 text-center text-gold font-heading">{p.gold || 0}G</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'clans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allClans.map(clan => (
            <button key={clan.id} onClick={() => setViewingClanId(clan.id)}
              className="p-4 bg-card rounded-lg border border-border hover:neon-border transition-all text-left group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {clan.logo ? (
                    <img src={clan.logo} alt={clan.name} className="w-12 h-12 rounded-full object-cover border border-primary/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-lg">
                      {clan.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-sm text-foreground group-hover:text-primary transition-colors">{clan.name}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
          {allClans.length === 0 && <p className="col-span-2 text-center text-muted-foreground font-display p-6">Nenhum clã registrado</p>}
        </div>
      )}
    </div>
  );
}
