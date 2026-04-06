import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getUsers, saveUsers, updateUser, deleteUser,
  getTeams, addTeam, updateTeam, deleteTeam,
  getMatches, addMatch, updateMatch,
  getTrainings, addTraining, updateTraining,
  getNews, addNews, deleteNews,
  getWithdrawals, updateWithdrawal,
  getSpinPurchases, updateSpinPurchase,
  getTransfers, addTransfer,
  type User, type Team
} from '@/lib/store';
import { Shield, Users, Swords, Target, Newspaper, Wallet, Dices, DollarSign, Plus, Trash, Check, X, Search, Edit, ArrowRight } from 'lucide-react';

type Tab = 'users' | 'teams' | 'matches' | 'training' | 'news' | 'withdrawals' | 'spins' | 'dashboard';

export default function AdminPage() {
  const { user: currentUser, isSuperAdminUser } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const r = () => setRefresh(p => p + 1);

  const users = getUsers().filter(u => u.role !== 'superadmin');
  const teams = getTeams();
  const matches = getMatches();
  const trainings = getTrainings();
  const news = getNews();
  const withdrawals = getWithdrawals();
  const spinPurchases = getSpinPurchases();

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'users', label: 'Contas', icon: Users },
    { id: 'teams', label: 'Times', icon: Users },
    { id: 'matches', label: 'Partidas', icon: Swords },
    { id: 'training', label: 'XTreino', icon: Target },
    { id: 'news', label: 'Notícias', icon: Newspaper },
    { id: 'withdrawals', label: 'Saques', icon: Wallet },
    { id: 'spins', label: 'Giros', icon: Dices },
  ];

  // ---- Dashboard ----
  const Dashboard = () => {
    const totalGold = users.reduce((s, u) => s + (u.gold || 0), 0);
    const paidUsers = users.filter(u => u.gold > 0).length;
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Jogadores', value: users.length, icon: Users },
          { label: 'Gold em Circulação', value: `${totalGold}G`, icon: DollarSign },
          { label: 'Saques Pendentes', value: pendingWithdrawals.length, icon: Wallet },
          { label: 'Times', value: teams.length, icon: Shield },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg neon-border p-5">
            <s.icon size={20} className="text-primary mb-2" />
            <p className="font-heading text-2xl text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground font-display">{s.label}</p>
          </div>
        ))}
      </div>
    );
  };

  // ---- Users Management ----
  const UsersTab = () => {
    const filtered = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.gameNick?.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.includes(searchQuery));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nome, nick ou ID..."
              className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          {filtered.map(u => (
            <UserRow key={u.id} user={u} onRefresh={r} />
          ))}
        </div>
      </div>
    );
  };

  // ---- Teams ----
  const TeamsTab = () => {
    const [name, setName] = useState('');
    const handleAdd = () => {
      if (!name.trim()) return;
      addTeam({ name, logo: '', clanId: '', players: [], wins: 0, losses: 0 });
      setName(''); r();
      toast.success('Time criado!');
    };
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do time"
            className="flex-1 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
          <button onClick={handleAdd} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center gap-2"><Plus size={14} /> Criar</button>
        </div>
        {teams.map(team => (
          <TeamRow key={team.id} team={team} users={users} onRefresh={r} />
        ))}
      </div>
    );
  };

  // ---- Matches ----
  const MatchesTab = () => {
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const handleAdd = () => {
      if (!teamA || !teamB || !date) return;
      addMatch({ teamAId: teamA, teamBId: teamB, date, time, scoreA: 0, scoreB: 0, status: 'upcoming', clanId: '', playerStats: {} });
      r(); toast.success('Partida criada!');
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={teamA} onChange={e => setTeamA(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Time A</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={teamB} onChange={e => setTeamB(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Time B</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <button onClick={handleAdd} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs"><Plus size={14} /></button>
        </div>
        {matches.map(m => (
          <MatchRow key={m.id} match={m} teams={teams} users={users} onRefresh={r} />
        ))}
      </div>
    );
  };

  // ---- Training ----
  const TrainingTab = () => {
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const handleAdd = () => {
      if (!teamA || !teamB || !date) return;
      addTraining({ teamAId: teamA, teamBId: teamB, date, time, clanId: '', scoreA: 0, scoreB: 0, status: 'scheduled', playerStats: {} });
      r(); toast.success('Treino agendado!');
    };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={teamA} onChange={e => setTeamA(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Time 1</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={teamB} onChange={e => setTeamB(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Time 2</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <button onClick={handleAdd} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs"><Plus size={14} /></button>
        </div>
        {trainings.map(t => {
          const tA = teams.find(te => te.id === t.teamAId);
          const tB = teams.find(te => te.id === t.teamBId);
          return (
            <div key={t.id} className="bg-secondary/50 p-4 rounded-lg flex items-center justify-between">
              <span className="font-display text-foreground text-sm">{tA?.name} vs {tB?.name}</span>
              <span className="text-xs text-muted-foreground">{t.date} {t.time}</span>
              <div className="flex items-center gap-2">
                <input type="number" value={t.scoreA} onChange={e => { updateTraining(t.id, { scoreA: Number(e.target.value) }); r(); }}
                  className="w-12 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
                <span className="text-muted-foreground text-xs">x</span>
                <input type="number" value={t.scoreB} onChange={e => { updateTraining(t.id, { scoreB: Number(e.target.value) }); r(); }}
                  className="w-12 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
                <select value={t.status} onChange={e => { updateTraining(t.id, { status: e.target.value as any }); r(); }}
                  className="p-1 bg-secondary rounded border border-border text-foreground text-xs">
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- News ----
  const NewsTab = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const handleAdd = () => {
      if (!title || !content) return;
      addNews({ title, content, clanId: '', authorId: currentUser?.id || '', createdAt: new Date().toISOString() });
      setTitle(''); setContent(''); r();
      toast.success('Notícia publicada!');
    };
    return (
      <div className="space-y-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título"
          className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo" rows={4}
          className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display resize-none" />
        <button onClick={handleAdd} className="px-6 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">PUBLICAR</button>
        <div className="space-y-2">
          {news.map(n => (
            <div key={n.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="font-display text-foreground text-sm">{n.title}</span>
              <button onClick={() => { deleteNews(n.id); r(); }} className="text-destructive"><Trash size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- Withdrawals ----
  const WithdrawalsTab = () => (
    <div className="space-y-3">
      {withdrawals.map(w => (
        <div key={w.id} className={`p-4 rounded-lg border ${w.status === 'completed' ? 'border-success/30 bg-success/5' : w.status === 'rejected' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-display text-foreground text-sm">{w.username} ({w.gameNick})</p>
              <p className="text-xs text-muted-foreground">ID: {w.userUniqueId} | Email: {w.email} | WA: {w.whatsapp}</p>
            </div>
            <span className="font-heading text-gold">{w.amount}G</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-display ${w.status === 'completed' ? 'text-success' : w.status === 'rejected' ? 'text-destructive' : 'text-warning'}`}>
              {w.status === 'completed' ? '✅ Concluído' : w.status === 'rejected' ? '❌ Rejeitado' : '⏳ Pendente'}
            </span>
            {w.status === 'pending' && (
              <div className="flex gap-2 ml-auto">
                <button onClick={() => { updateWithdrawal(w.id, { status: 'completed' }); r(); toast.success('Saque aprovado'); }}
                  className="p-1 text-success hover:bg-success/10 rounded"><Check size={16} /></button>
                <button onClick={() => {
                  updateWithdrawal(w.id, { status: 'rejected' });
                  const u = getUsers().find(u2 => u2.id === w.userId);
                  if (u) updateUser(u.id, { gold: (u.gold || 0) + w.amount });
                  r(); toast.info('Saque rejeitado, gold devolvido');
                }} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X size={16} /></button>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{new Date(w.createdAt).toLocaleString('pt-BR')}</p>
        </div>
      ))}
      {withdrawals.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum saque</p>}
    </div>
  );

  // ---- Spins ----
  const SpinsTab = () => {
    const [freeSpinUserId, setFreeSpinUserId] = useState('');
    const [freeSpinAmount, setFreeSpinAmount] = useState(1);
    const handleFreeSpins = () => {
      if (!freeSpinUserId) return;
      const u = getUsers().find(u2 => u2.id === freeSpinUserId);
      if (!u) { toast.error('Usuário não encontrado'); return; }
      updateUser(u.id, { freeSpins: (u.freeSpins || 0) + freeSpinAmount });
      toast.success(`${freeSpinAmount} giros enviados para ${u.username}`);
      r();
    };
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg neon-border p-5">
          <h3 className="font-heading text-sm text-primary mb-4">ENVIAR GIROS GRÁTIS</h3>
          <div className="flex gap-3 flex-wrap">
            <select value={freeSpinUserId} onChange={e => setFreeSpinUserId(e.target.value)}
              className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
              <option value="">Selecionar usuário</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.gameNick})</option>)}
            </select>
            <input type="number" value={freeSpinAmount} onChange={e => setFreeSpinAmount(Number(e.target.value))} min={1}
              className="w-20 p-3 bg-secondary rounded border border-border text-foreground text-center font-display" />
            <button onClick={handleFreeSpins} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs">ENVIAR</button>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-sm text-primary">COMPRAS PENDENTES</h3>
          {spinPurchases.filter(p => p.status === 'pending').map(p => {
            const u = users.find(u2 => u2.id === p.userId);
            return (
              <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-display text-foreground text-sm">{u?.username} - R${p.amount}</p>
                  <p className="text-xs text-muted-foreground">{p.spins} giros ({p.bonusSpins} bônus) | {p.method}</p>
                </div>
                <button onClick={() => {
                  updateSpinPurchase(p.id, { status: 'confirmed' });
                  if (u) updateUser(u.id, { freeSpins: (u.freeSpins || 0) + p.spins });
                  r(); toast.success('Compra confirmada!');
                }} className="p-2 text-success hover:bg-success/10 rounded"><Check size={16} /></button>
              </div>
            );
          })}
          {spinPurchases.filter(p => p.status === 'pending').length === 0 && <p className="text-muted-foreground text-sm font-display">Nenhuma compra pendente</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><Shield size={28} /> PAINEL ADMIN</h1>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              tab === t.id ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground'
            }`}
          ><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'users' && <UsersTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'matches' && <MatchesTab />}
      {tab === 'training' && <TrainingTab />}
      {tab === 'news' && <NewsTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'spins' && <SpinsTab />}
    </div>
  );
}

// ---- Sub-components ----

function UserRow({ user, onRefresh }: { user: User; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [gold, setGold] = useState(user.gold);
  const [kills, setKills] = useState(user.kills);
  const [deaths, setDeaths] = useState(user.deaths);
  const [assists, setAssists] = useState(user.assists);
  const [mvps, setMvps] = useState(user.mvps);

  const save = () => {
    updateUser(user.id, { gold, kills, deaths, assists, mvps });
    setEditing(false);
    onRefresh();
    toast.success('Dados atualizados!');
  };

  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display text-foreground text-sm">{user.username} ({user.gameNick})</p>
          <p className="text-[10px] text-muted-foreground">ID: {user.id} | {user.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="text-primary p-1"><Edit size={14} /></button>
          <button onClick={() => { deleteUser(user.id); onRefresh(); toast.success('Conta removida'); }} className="text-destructive p-1"><Trash size={14} /></button>
        </div>
      </div>
      {editing && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {[
            { label: 'Gold', value: gold, set: setGold },
            { label: 'Kills', value: kills, set: setKills },
            { label: 'Deaths', value: deaths, set: setDeaths },
            { label: 'Assists', value: assists, set: setAssists },
            { label: 'MVPs', value: mvps, set: setMvps },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[10px] text-muted-foreground font-display">{f.label}</label>
              <input type="number" value={f.value} onChange={e => f.set(Number(e.target.value))}
                className="w-full p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
            </div>
          ))}
          <div className="flex items-end">
            <button onClick={save} className="px-3 py-1 gradient-primary text-primary-foreground rounded text-xs font-heading">SALVAR</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, users, onRefresh }: { team: Team; users: User[]; onRefresh: () => void }) {
  const [addingPlayer, setAddingPlayer] = useState('');
  const teamPlayers = users.filter(u => team.players.includes(u.id));
  const availablePlayers = users.filter(u => !u.teamId && !team.players.includes(u.id));

  const handleAddPlayer = () => {
    if (!addingPlayer) return;
    updateTeam(team.id, { players: [...team.players, addingPlayer] });
    updateUser(addingPlayer, { teamId: team.id });
    setAddingPlayer('');
    onRefresh();
    toast.success('Jogador adicionado!');
  };

  const handleRemovePlayer = (playerId: string) => {
    updateTeam(team.id, { players: team.players.filter(p => p !== playerId) });
    updateUser(playerId, { teamId: undefined });
    onRefresh();
  };

  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="font-heading text-sm text-foreground">{team.name}</span>
        <div className="flex items-center gap-2">
          <input type="number" value={team.wins} onChange={e => { updateTeam(team.id, { wins: Number(e.target.value) }); onRefresh(); }}
            className="w-12 p-1 bg-secondary rounded border border-border text-success text-center text-xs" placeholder="W" />
          <input type="number" value={team.losses} onChange={e => { updateTeam(team.id, { losses: Number(e.target.value) }); onRefresh(); }}
            className="w-12 p-1 bg-secondary rounded border border-border text-destructive text-center text-xs" placeholder="L" />
          <button onClick={() => { deleteTeam(team.id); onRefresh(); }} className="text-destructive p-1"><Trash size={14} /></button>
        </div>
      </div>
      <div className="space-y-1 mb-3">
        {teamPlayers.map(p => (
          <div key={p.id} className="flex items-center justify-between text-xs bg-background/50 p-2 rounded">
            <span className="text-foreground font-display">{p.gameNick || p.username}</span>
            <button onClick={() => handleRemovePlayer(p.id)} className="text-destructive"><X size={12} /></button>
          </div>
        ))}
      </div>
      {team.players.length < 5 && (
        <div className="flex gap-2">
          <select value={addingPlayer} onChange={e => setAddingPlayer(e.target.value)}
            className="flex-1 p-2 bg-secondary rounded border border-border text-foreground font-display text-xs">
            <option value="">Adicionar jogador</option>
            {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.gameNick || p.username}</option>)}
          </select>
          <button onClick={handleAddPlayer} className="px-3 gradient-primary text-primary-foreground rounded text-xs"><Plus size={12} /></button>
        </div>
      )}
    </div>
  );
}

function MatchRow({ match, teams, users, onRefresh }: { match: any; teams: Team[]; users: User[]; onRefresh: () => void }) {
  const tA = teams.find(t => t.id === match.teamAId);
  const tB = teams.find(t => t.id === match.teamBId);
  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-foreground text-sm">{tA?.name} vs {tB?.name}</span>
        <span className="text-xs text-muted-foreground">{match.date} {match.time}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="number" value={match.scoreA} onChange={e => { updateMatch(match.id, { scoreA: Number(e.target.value) }); onRefresh(); }}
          className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
        <span className="text-primary font-heading text-xs">VS</span>
        <input type="number" value={match.scoreB} onChange={e => { updateMatch(match.id, { scoreB: Number(e.target.value) }); onRefresh(); }}
          className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
        <select value={match.status} onChange={e => { updateMatch(match.id, { status: e.target.value as 'upcoming' | 'live' | 'completed' }); onRefresh(); }}
          className="p-1 bg-secondary rounded border border-border text-foreground text-xs ml-auto">
          <option value="upcoming">Próxima</option>
          <option value="live">Ao Vivo</option>
          <option value="completed">Finalizada</option>
        </select>
      </div>
    </div>
  );
}
