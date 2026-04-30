import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Plus, Users, Calendar, Coins, Swords, ChevronLeft, Play } from 'lucide-react';
import { toast } from 'sonner';

interface Tournament {
  id: string; name: string; format: string; size: number; status: string;
  prize_gold: number; prize_description: string | null; current_round: number;
  winner_team_id: string | null; created_at: string; clan_id: string;
}
interface TTeam { id: string; team_id: string; tournament_id: string; seed: number | null; wins: number; losses: number; draws: number; points: number; goals_for: number; goals_against: number; eliminated: boolean }
interface TMatch { id: string; tournament_id: string; round: number; slot: number; team_a_id: string | null; team_b_id: string | null; winner_id: string | null; score_a: number | null; score_b: number | null; status: string }
interface Team { id: string; name: string; logo: string | null }

export default function TournamentsPage() {
  const { user, profile } = useAuth();
  const clanId = profile?.clan_id;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isClanLeader, setIsClanLeader] = useState(false);

  const [form, setForm] = useState({ name: '', format: 'bracket', size: 8, prize_gold: 0, prize_description: '' });

  useEffect(() => {
    if (!clanId || !user) return;
    supabase.from('tournaments').select('*').eq('clan_id', clanId)
      .order('created_at', { ascending: false }).then(({ data }) => setTournaments((data as any) || []));
    supabase.from('clans').select('owner_id').eq('id', clanId).single().then(({ data }) => {
      setIsClanLeader(!!data && (data as any).owner_id === user.id);
    });
  }, [clanId, user]);

  const handleCreate = async () => {
    if (!form.name) return toast.error('Dê um nome ao campeonato');
    const { data, error } = await supabase.rpc('create_tournament' as any, {
      _clan_id: clanId,
      _name: form.name,
      _format: form.format,
      _size: form.size,
      _prize_gold: form.prize_gold,
      _prize_description: form.prize_description || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Campeonato criado!');
    setShowCreate(false);
    const { data: list } = await supabase.from('tournaments').select('*').eq('clan_id', clanId).order('created_at', { ascending: false });
    setTournaments((list as any) || []);
  };

  if (!clanId) {
    return <div className="text-center py-10 text-muted-foreground font-display">Você precisa estar em um clã.</div>;
  }

  if (selected) {
    return <TournamentDetail tournament={selected} onBack={() => setSelected(null)} isClanLeader={isClanLeader} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
          <Trophy size={24} /> CAMPEONATOS INTERNOS
        </h1>
        {isClanLeader && (
          <button onClick={() => setShowCreate(true)}
            className="bg-primary text-primary-foreground px-3 py-2 rounded font-heading text-sm flex items-center gap-1">
            <Plus size={14} /> Criar
          </button>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Trophy className="mx-auto text-muted-foreground mb-2" size={32} />
          <p className="text-sm font-display text-muted-foreground">Nenhum campeonato criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tournaments.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/60 transition-all">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-foreground">{t.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-display ${
                  t.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{t.status}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-display text-muted-foreground">
                <span className="flex items-center gap-1"><Swords size={12} />{t.format === 'bracket' ? 'Mata-mata' : 'Pontos corridos'}</span>
                <span className="flex items-center gap-1"><Users size={12} />{t.size}</span>
                {t.prize_gold > 0 && <span className="flex items-center gap-1 text-gold"><Coins size={12} />{t.prize_gold}G</span>}
              </div>
              {t.prize_description && <p className="text-[10px] text-muted-foreground mt-1">🏆 {t.prize_description}</p>}
            </button>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-card neon-border rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-heading text-primary text-glow">NOVO CAMPEONATO</h3>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do campeonato" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}
                className="bg-secondary border border-border rounded px-2 py-2 text-sm font-display">
                <option value="bracket">Mata-mata</option>
                <option value="league">Pontos corridos</option>
              </select>
              <select value={form.size} onChange={e => setForm({ ...form, size: Number(e.target.value) })}
                className="bg-secondary border border-border rounded px-2 py-2 text-sm font-display">
                {[4, 6, 8, 16].map(n => <option key={n} value={n}>{n} times</option>)}
              </select>
            </div>
            <input type="number" value={form.prize_gold} onChange={e => setForm({ ...form, prize_gold: Number(e.target.value) })}
              placeholder="Premiação (NexelGolds)" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" />
            <input value={form.prize_description} onChange={e => setForm({ ...form, prize_description: e.target.value })}
              placeholder="Descrição da premiação (opcional)" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-3 py-2 rounded border border-border text-sm font-display">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-heading">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentDetail({ tournament, onBack, isClanLeader }: { tournament: Tournament; onBack: () => void; isClanLeader: boolean }) {
  const [tteams, setTteams] = useState<TTeam[]>([]);
  const [matches, setMatches] = useState<TMatch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  const loadAll = async () => {
    const [tt, mm, tList] = await Promise.all([
      supabase.from('tournament_teams').select('*').eq('tournament_id', tournament.id),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournament.id).order('round').order('slot'),
      supabase.from('teams').select('id,name,logo').eq('clan_id', tournament.clan_id),
    ]);
    setTteams((tt.data as any) || []);
    setMatches((mm.data as any) || []);
    setTeams((tList.data as any) || []);
    const enrolled = new Set(((tt.data as any) || []).map((t: TTeam) => t.team_id));
    setAvailableTeams(((tList.data as any) || []).filter((t: Team) => !enrolled.has(t.id)));
  };

  useEffect(() => { loadAll(); }, [tournament.id]);

  const teamName = (id: string | null) => id ? (teams.find(t => t.id === id)?.name || '?') : 'TBD';

  const enrollTeam = async (teamId: string) => {
    const { error } = await supabase.from('tournament_teams').insert({
      tournament_id: tournament.id, team_id: teamId,
    });
    if (error) return toast.error(error.message);
    toast.success('Time inscrito');
    loadAll();
  };

  const startTournament = async () => {
    if (tteams.length < 2) return toast.error('Mínimo 2 times');
    const { error } = await supabase.rpc('start_tournament' as any, { _tournament_id: tournament.id });
    if (error) return toast.error(error.message);
    toast.success('Campeonato iniciado!');
    loadAll();
  };

  const reportMatch = async (matchId: string, scoreA: number, scoreB: number) => {
    const { error } = await supabase.rpc('report_tournament_match' as any, {
      _match_id: matchId, _score_a: scoreA, _score_b: scoreB,
    });
    if (error) return toast.error(error.message);
    toast.success('Resultado registrado');
    loadAll();
  };

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-display text-muted-foreground hover:text-foreground">
        <ChevronLeft size={16} /> Voltar
      </button>
      <div className="bg-card neon-border rounded-xl p-4">
        <h1 className="font-heading text-xl text-primary text-glow">{tournament.name}</h1>
        <p className="text-xs text-muted-foreground font-display mt-1">
          {tournament.format === 'bracket' ? 'Mata-mata' : 'Pontos corridos'} • {tournament.size} times • Status: {tournament.status}
        </p>
        {tournament.prize_gold > 0 && (
          <p className="text-sm text-gold font-heading mt-1">🏆 {tournament.prize_gold}G {tournament.prize_description ? `+ ${tournament.prize_description}` : ''}</p>
        )}
      </div>

      {/* Inscrição */}
      {tournament.status === 'draft' && isClanLeader && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-heading text-primary text-sm">Inscrever Times ({tteams.length}/{tournament.size})</h3>
          <div className="flex flex-wrap gap-2">
            {availableTeams.map(t => (
              <button key={t.id} onClick={() => enrollTeam(t.id)}
                className="px-3 py-1.5 rounded border border-border text-xs font-display hover:border-primary">
                + {t.name}
              </button>
            ))}
          </div>
          <div className="text-xs font-display text-muted-foreground">
            Inscritos: {tteams.map(tt => teamName(tt.team_id)).join(', ') || 'nenhum'}
          </div>
          <button onClick={startTournament}
            className="w-full bg-primary text-primary-foreground py-2 rounded font-heading text-sm flex items-center justify-center gap-1">
            <Play size={14} /> Iniciar Campeonato
          </button>
        </div>
      )}

      {/* Bracket */}
      {tournament.format === 'bracket' && rounds.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
          <h3 className="font-heading text-primary text-sm mb-3">Chaveamento</h3>
          <div className="flex gap-6 min-w-max">
            {rounds.map(round => (
              <div key={round} className="flex flex-col gap-3 justify-around">
                <p className="text-[10px] text-muted-foreground font-heading text-center">RODADA {round}</p>
                {matches.filter(m => m.round === round).map(m => (
                  <MatchCard key={m.id} match={m} teamName={teamName} canReport={isClanLeader} onReport={reportMatch} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* League standings */}
      {tournament.format === 'league' && tteams.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading text-primary text-sm mb-3">Classificação</h3>
          <table className="w-full text-xs font-display">
            <thead className="text-muted-foreground">
              <tr><th className="text-left py-1">Time</th><th>P</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th></tr>
            </thead>
            <tbody>
              {[...tteams].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)).map((tt, i) => (
                <tr key={tt.id} className="border-t border-border/30">
                  <td className="py-1.5">{i + 1}. {teamName(tt.team_id)}</td>
                  <td className="text-center font-heading text-primary">{tt.points}</td>
                  <td className="text-center">{tt.wins}</td>
                  <td className="text-center">{tt.draws}</td>
                  <td className="text-center">{tt.losses}</td>
                  <td className="text-center">{tt.goals_for}</td>
                  <td className="text-center">{tt.goals_against}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* League matches */}
      {tournament.format === 'league' && matches.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="font-heading text-primary text-sm mb-2">Partidas</h3>
          {matches.map(m => (
            <MatchCard key={m.id} match={m} teamName={teamName} canReport={isClanLeader} onReport={reportMatch} compact />
          ))}
        </div>
      )}

      {tournament.winner_team_id && (
        <div className="bg-gold/10 border border-gold/40 rounded-xl p-4 text-center">
          <Trophy className="mx-auto text-gold mb-1" size={28} />
          <p className="font-heading text-gold text-glow">CAMPEÃO: {teamName(tournament.winner_team_id)}</p>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, teamName, canReport, onReport, compact }: {
  match: TMatch; teamName: (id: string | null) => string; canReport: boolean;
  onReport: (id: string, a: number, b: number) => void; compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(match.score_a ?? 0);
  const [b, setB] = useState(match.score_b ?? 0);
  const done = match.status === 'completed';

  return (
    <div className={`border border-border rounded-lg p-2 ${compact ? '' : 'min-w-[180px]'} ${done ? 'opacity-90' : ''}`}>
      <div className={`flex items-center justify-between text-xs font-display ${match.winner_id === match.team_a_id ? 'text-primary' : 'text-foreground'}`}>
        <span className="truncate flex-1">{teamName(match.team_a_id)}</span>
        <span className="font-heading">{match.score_a ?? '-'}</span>
      </div>
      <div className={`flex items-center justify-between text-xs font-display mt-1 ${match.winner_id === match.team_b_id ? 'text-primary' : 'text-foreground'}`}>
        <span className="truncate flex-1">{teamName(match.team_b_id)}</span>
        <span className="font-heading">{match.score_b ?? '-'}</span>
      </div>
      {canReport && !done && match.team_a_id && match.team_b_id && (
        editing ? (
          <div className="flex gap-1 mt-2">
            <input type="number" value={a} onChange={e => setA(Number(e.target.value))} className="w-10 bg-secondary border border-border rounded text-xs px-1" />
            <input type="number" value={b} onChange={e => setB(Number(e.target.value))} className="w-10 bg-secondary border border-border rounded text-xs px-1" />
            <button onClick={() => { onReport(match.id, a, b); setEditing(false); }} className="flex-1 bg-primary text-primary-foreground rounded text-[10px] font-heading">OK</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="w-full mt-1.5 text-[10px] text-muted-foreground hover:text-primary border-t border-border/30 pt-1 font-display">Reportar</button>
        )
      )}
    </div>
  );
}