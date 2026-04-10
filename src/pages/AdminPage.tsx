import { useState, useRef } from 'react';
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
  getClans, updateClan, deleteClan,
  addNotification,
  type User, type Team, type Clan
} from '@/lib/store';
import { Shield, Users, Swords, Target, Newspaper, Wallet, Dices, DollarSign, Plus, Trash, Check, X, Search, Edit, Image, Crown, BarChart3, Settings, Lock, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

type SuperTab = 'dashboard' | 'clans' | 'users' | 'withdrawals' | 'spins' | 'economy' | 'clan-manage';
type ClanTab = 'dashboard' | 'members' | 'teams' | 'matches' | 'training' | 'news' | 'settings';

const CHART_COLORS = ['hsl(0,100%,50%)', 'hsl(45,100%,50%)', 'hsl(120,70%,50%)', 'hsl(200,100%,50%)', 'hsl(280,100%,50%)', 'hsl(30,100%,50%)'];

export default function AdminPage() {
  const { user: currentUser, profile, isSuperAdminUser, role, refreshProfile } = useAuth();
  if (!currentUser || !profile) return null;

  if (isSuperAdminUser) return <SuperAdminPanel />;
  if (role === 'admin') return <ClanAdminPanel clanId={profile.clan_id || ''} currentUserId={currentUser.id} />;
  return <div className="text-center text-muted-foreground p-12 font-display">Sem permissão</div>;
}

// ==================== SUPER ADMIN PANEL ====================
function SuperAdminPanel() {
  const [tab, setTab] = useState<SuperTab>('dashboard');
  const [refresh, setRefresh] = useState(0);
  const [selectedClanId, setSelectedClanId] = useState('');
  const r = () => setRefresh(p => p + 1);

  const users = getUsers().filter(u => u.role !== 'superadmin');
  const clans = getClans();
  const teams = getTeams();
  const matches = getMatches();
  const withdrawals = getWithdrawals();
  const spinPurchases = getSpinPurchases();

  const tabs: { id: SuperTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'clan-manage', label: 'Gerenciar Clã', icon: Shield },
    { id: 'clans', label: 'Clãs', icon: Crown },
    { id: 'users', label: 'Contas', icon: Users },
    { id: 'withdrawals', label: 'Saques', icon: Wallet },
    { id: 'spins', label: 'Giros', icon: Dices },
    { id: 'economy', label: 'Economia', icon: DollarSign },
  ];

  // Charts data
  const clanMembersData = clans.map(c => ({
    name: c.name.substring(0, 10),
    membros: users.filter(u => u.clanId === c.id).length,
  }));

  const matchStatusData = [
    { name: 'Próximas', value: matches.filter(m => m.status === 'upcoming').length },
    { name: 'Ao Vivo', value: matches.filter(m => m.status === 'live').length },
    { name: 'Concluídas', value: matches.filter(m => m.status === 'completed').length },
  ].filter(d => d.value > 0);

  const totalGold = users.reduce((s, u) => s + (u.gold || 0), 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const totalWithdrawn = withdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-gold text-glow flex items-center gap-3"><Crown size={28} /> ADM CRIADOR</h1>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              tab === t.id ? 'bg-gradient-to-r from-gold/20 to-gold/10 text-gold border border-gold/30' : 'bg-secondary text-muted-foreground'
            }`}
          ><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Jogadores', value: users.length, icon: Users },
              { label: 'Clãs Ativos', value: clans.length, icon: Crown },
              { label: 'Gold Circulação', value: `${totalGold}G`, icon: DollarSign },
              { label: 'Saques Pendentes', value: pendingWithdrawals.length, icon: Wallet },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-lg border border-gold/20 p-4">
                <s.icon size={18} className="text-gold mb-2" />
                <p className="font-heading text-xl text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-display">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {clanMembersData.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-heading text-xs text-gold mb-3">MEMBROS POR CLÃ</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={clanMembersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                    <XAxis dataKey="name" stroke="hsl(0,0%,50%)" fontSize={10} />
                    <YAxis stroke="hsl(0,0%,50%)" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(0,100%,50%,0.3)', borderRadius: 8 }} />
                    <Bar dataKey="membros" fill="hsl(0,100%,50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {matchStatusData.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="font-heading text-xs text-gold mb-3">STATUS DAS PARTIDAS</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={matchStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {matchStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(0,100%,50%,0.3)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-heading text-xs text-gold mb-3">RESUMO ECONÔMICO</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-heading text-foreground">{totalGold}G</p><p className="text-[10px] text-muted-foreground font-display">Em circulação</p></div>
              <div><p className="text-xl font-heading text-success">{totalWithdrawn}G</p><p className="text-[10px] text-muted-foreground font-display">Total sacado</p></div>
              <div><p className="text-xl font-heading text-warning">{pendingWithdrawals.reduce((s, w) => s + w.amount, 0)}G</p><p className="text-[10px] text-muted-foreground font-display">Pendente</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'clans' && <SuperClansTab clans={clans} users={users} onRefresh={r} />}
      {tab === 'users' && <SuperUsersTab users={users} clans={clans} onRefresh={r} />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'spins' && <SpinsTab users={users} onRefresh={r} />}
      {tab === 'clan-manage' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-gold/20 p-4">
            <h3 className="font-heading text-xs text-gold mb-3">SELECIONE O CLÃ PARA GERENCIAR</h3>
            <select value={selectedClanId} onChange={e => setSelectedClanId(e.target.value)}
              className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
              <option value="">Selecione um clã</option>
              {clans.map(c => <option key={c.id} value={c.id}>{c.name} ({users.filter(u => u.clanId === c.id).length} membros)</option>)}
            </select>
          </div>
          {selectedClanId && (
            <SuperClanManagePanel clanId={selectedClanId} onRefresh={r} />
          )}
        </div>
      )}
      {tab === 'economy' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-heading text-xs text-gold mb-4">GOLD POR JOGADOR (TOP 10)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[...users].sort((a, b) => b.gold - a.gold).slice(0, 10).map(u => ({ name: u.gameNick?.substring(0, 8) || u.username.substring(0, 8), gold: u.gold }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                <XAxis dataKey="name" stroke="hsl(0,0%,50%)" fontSize={10} />
                <YAxis stroke="hsl(0,0%,50%)" fontSize={10} />
                <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(45,100%,50%,0.3)', borderRadius: 8 }} />
                <Bar dataKey="gold" fill="hsl(45,100%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUPER ADMIN CLAN MANAGE PANEL ====================
function SuperClanManagePanel({ clanId, onRefresh }: { clanId: string; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<ClanTab>('members');
  const { refreshProfile } = useAuth();

  const clan = getClans().find(c => c.id === clanId);
  const clanUsers = getUsers().filter(u => u.clanId === clanId && u.role !== 'superadmin');
  const clanTeams = getTeams().filter(t => t.clanId === clanId);
  const clanMatches = getMatches().filter(m => m.clanId === clanId);
  const clanTrainings = getTrainings().filter(t => t.clanId === clanId);
  const clanNews = getNews().filter(n => n.clanId === clanId);

  const subTabs: { id: ClanTab; label: string; icon: any }[] = [
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'teams', label: 'Lines', icon: Shield },
    { id: 'matches', label: 'Partidas', icon: Swords },
    { id: 'training', label: 'XTreino', icon: Target },
    { id: 'news', label: 'Avisos', icon: Newspaper },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-gold/5 rounded-lg border border-gold/20">
        <Crown size={16} className="text-gold" />
        <span className="font-heading text-sm text-gold">Gerenciando: {clan?.name}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              subTab === t.id ? 'bg-gradient-to-r from-gold/20 to-gold/10 text-gold border border-gold/30' : 'bg-secondary text-muted-foreground'
            }`}
          ><t.icon size={14} /> {t.label}</button>
        ))}
      </div>
      {subTab === 'members' && <ClanMembersTab clanUsers={clanUsers} clanId={clanId} onRefresh={onRefresh} />}
      {subTab === 'teams' && <ClanTeamsTab clanTeams={clanTeams} clanUsers={clanUsers} clanId={clanId} onRefresh={onRefresh} />}
      {subTab === 'matches' && <ClanMatchesTab clanMatches={clanMatches} clanTeams={clanTeams} clanUsers={clanUsers} clanId={clanId} onRefresh={onRefresh} />}
      {subTab === 'training' && <ClanTrainingTab clanTrainings={clanTrainings} clanTeams={clanTeams} clanId={clanId} onRefresh={onRefresh} />}
      {subTab === 'news' && <ClanNewsTab clanNews={clanNews} clanId={clanId} currentUserId={'superadmin'} onRefresh={onRefresh} />}
      {subTab === 'settings' && <ClanSettingsTab clan={clan} onRefresh={onRefresh} />}
    </div>
  );
}

// ==================== CLAN ADMIN PANEL ====================
function ClanAdminPanel({ clanId, currentUserId }: { clanId: string; currentUserId: string }) {
  const [tab, setTab] = useState<ClanTab>('dashboard');
  const [refresh, setRefresh] = useState(0);
  const r = () => setRefresh(p => p + 1);
  const { refreshProfile } = useAuth();
  const clan = getClans().find(c => c.id === clanId);
  const clanUsers = getUsers().filter(u => u.clanId === clanId && u.role !== 'superadmin');
  const clanTeams = getTeams().filter(t => t.clanId === clanId);
  const clanMatches = getMatches().filter(m => m.clanId === clanId);
  const clanTrainings = getTrainings().filter(t => t.clanId === clanId);
  const clanNews = getNews().filter(n => n.clanId === clanId);

  const tabs: { id: ClanTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'teams', label: 'Lines', icon: Shield },
    { id: 'matches', label: 'Partidas', icon: Swords },
    { id: 'training', label: 'XTreino', icon: Target },
    { id: 'news', label: 'Avisos', icon: Newspaper },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  // Performance chart data
  const topKillers = [...clanUsers].sort((a, b) => b.kills - a.kills).slice(0, 5).map(u => ({
    name: (u.gameNick || u.username).substring(0, 8), kills: u.kills, deaths: u.deaths, assists: u.assists
  }));

  const teamWins = clanTeams.map(t => ({ name: t.name.substring(0, 10), wins: t.wins, losses: t.losses }));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Shield size={28} className="text-primary" />
        <div>
          <h1 className="text-xl font-heading text-primary text-glow">ADMIN: {clan?.name || 'MEU CLÃ'}</h1>
          <p className="text-xs text-muted-foreground font-display">Gerenciamento isolado do seu clã</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              tab === t.id ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground'
            }`}
          ><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Membros', value: clanUsers.length, icon: Users },
              { label: 'Lines (Times)', value: clanTeams.length, icon: Shield },
              { label: 'Partidas', value: clanMatches.length, icon: Swords },
              { label: 'Treinos', value: clanTrainings.length, icon: Target },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-lg neon-border p-4">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="font-heading text-xl text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-display">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {topKillers.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-heading text-xs text-primary mb-3">DESEMPENHO DOS JOGADORES (TOP 5)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topKillers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                  <XAxis dataKey="name" stroke="hsl(0,0%,50%)" fontSize={10} />
                  <YAxis stroke="hsl(0,0%,50%)" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(0,100%,50%,0.3)', borderRadius: 8 }} />
                  <Bar dataKey="kills" fill="hsl(0,100%,50%)" name="Kills" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="deaths" fill="hsl(0,0%,50%)" name="Deaths" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="assists" fill="hsl(200,100%,50%)" name="Assists" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {teamWins.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-heading text-xs text-primary mb-3">VITÓRIAS/DERROTAS POR LINE</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={teamWins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                  <XAxis dataKey="name" stroke="hsl(0,0%,50%)" fontSize={10} />
                  <YAxis stroke="hsl(0,0%,50%)" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(0,100%,50%,0.3)', borderRadius: 8 }} />
                  <Bar dataKey="wins" fill="hsl(120,70%,50%)" name="Vitórias" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="losses" fill="hsl(0,100%,50%)" name="Derrotas" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && <ClanMembersTab clanUsers={clanUsers} clanId={clanId} onRefresh={r} />}
      {tab === 'teams' && <ClanTeamsTab clanTeams={clanTeams} clanUsers={clanUsers} clanId={clanId} onRefresh={r} />}
      {tab === 'matches' && <ClanMatchesTab clanMatches={clanMatches} clanTeams={clanTeams} clanUsers={clanUsers} clanId={clanId} onRefresh={r} />}
      {tab === 'training' && <ClanTrainingTab clanTrainings={clanTrainings} clanTeams={clanTeams} clanId={clanId} onRefresh={r} />}
      {tab === 'news' && <ClanNewsTab clanNews={clanNews} clanId={clanId} currentUserId={currentUserId} onRefresh={r} />}
      {tab === 'settings' && <ClanSettingsTab clan={clan} onRefresh={r} />}
    </div>
  );
}

// ======= CLAN MEMBERS TAB =======
function ClanMembersTab({ clanUsers, clanId, onRefresh }: { clanUsers: User[]; clanId: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = clanUsers.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.gameNick?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar membro..."
          className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
      </div>
      {filtered.map(u => (
        <ClanUserRow key={u.id} user={u} onRefresh={onRefresh} />
      ))}
      {filtered.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhum membro encontrado</p>}
    </div>
  );
}

function ClanUserRow({ user, onRefresh }: { user: User; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [kills, setKills] = useState(user.kills);
  const [deaths, setDeaths] = useState(user.deaths);
  const [assists, setAssists] = useState(user.assists);
  const [mvps, setMvps] = useState(user.mvps);

  const save = () => {
    updateUser(user.id, { kills, deaths, assists, mvps });
    setEditing(false);
    onRefresh();
    toast.success('KDA atualizado!');
  };

  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> :
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-heading text-xs text-foreground">{user.gameNick?.[0]?.toUpperCase()}</div>}
          <div>
            <p className="font-display text-foreground text-sm">{user.gameNick || user.username}</p>
            <p className="text-[10px] text-muted-foreground">ID: #{user.uniqueId} | {user.kills}K/{user.deaths}D/{user.assists}A | {user.mvps} MVPs</p>
          </div>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-primary p-1"><Edit size={14} /></button>
      </div>
      {editing && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {[
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

// ======= CLAN TEAMS TAB =======
function ClanTeamsTab({ clanTeams, clanUsers, clanId, onRefresh }: { clanTeams: Team[]; clanUsers: User[]; clanId: string; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    addTeam({ name, logo: '', clanId, players: [], wins: 0, losses: 0 });
    setName(''); onRefresh();
    toast.success('Line criada!');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da line/time"
          className="flex-1 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
        <button onClick={handleAdd} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center gap-2"><Plus size={14} /> Criar</button>
      </div>
      {clanTeams.map(team => (
        <ClanTeamRow key={team.id} team={team} users={clanUsers} onRefresh={onRefresh} />
      ))}
      {clanTeams.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhuma line criada</p>}
    </div>
  );
}

function ClanTeamRow({ team, users, onRefresh }: { team: Team; users: User[]; onRefresh: () => void }) {
  const [addingPlayer, setAddingPlayer] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const logoRef = useRef<HTMLInputElement>(null);
  const teamPlayers = users.filter(u => team.players.includes(u.id));
  const availablePlayers = users.filter(u => !u.teamId && !team.players.includes(u.id));

  const handleAddPlayer = () => {
    if (!addingPlayer) return;
    updateTeam(team.id, { players: [...team.players, addingPlayer] });
    updateUser(addingPlayer, { teamId: team.id });
    setAddingPlayer(''); onRefresh();
    toast.success('Jogador adicionado!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateTeam(team.id, { logo: reader.result as string }); onRefresh(); toast.success('Logo atualizado!'); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => logoRef.current?.click()}>
            <div className="w-10 h-10 rounded-lg bg-background/50 border border-border flex items-center justify-center overflow-hidden">
              {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-cover" /> : <Image size={16} className="text-muted-foreground" />}
            </div>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input value={teamName} onChange={e => setTeamName(e.target.value)} className="p-1 bg-secondary rounded border border-border text-foreground font-heading text-sm w-32" />
              <button onClick={() => { updateTeam(team.id, { name: teamName }); setEditingName(false); onRefresh(); }} className="text-success"><Check size={14} /></button>
              <button onClick={() => setEditingName(false)} className="text-destructive"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm text-foreground">{team.name}</span>
              <button onClick={() => { setTeamName(team.name); setEditingName(true); }} className="text-muted-foreground hover:text-primary"><Edit size={12} /></button>
            </div>
          )}
        </div>
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
            <button onClick={() => { updateTeam(team.id, { players: team.players.filter(pid => pid !== p.id) }); updateUser(p.id, { teamId: undefined }); onRefresh(); }}
              className="text-destructive"><X size={12} /></button>
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

// ======= CLAN MATCHES TAB =======
function ClanMatchesTab({ clanMatches, clanTeams, clanUsers, clanId, onRefresh }: { clanMatches: any[]; clanTeams: Team[]; clanUsers: User[]; clanId: string; onRefresh: () => void }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = () => {
    if (!teamA || !teamB || !date) return;
    addMatch({ teamAId: teamA, teamBId: teamB, date, time, scoreA: 0, scoreB: 0, status: 'upcoming', clanId, playerStats: {} });
    setTeamA(''); setTeamB(''); setDate(''); setTime('');
    onRefresh(); toast.success('Partida criada!');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={teamA} onChange={e => setTeamA(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
          <option value="">Line A</option>
          {clanTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={teamB} onChange={e => setTeamB(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
          <option value="">Line B</option>
          {clanTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
      </div>
      <button onClick={handleAdd} className="w-full px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center justify-center gap-2"><Plus size={14} /> CRIAR PARTIDA</button>
      {clanMatches.map(m => {
        const tA = clanTeams.find(t => t.id === m.teamAId);
        const tB = clanTeams.find(t => t.id === m.teamBId);
        return (
          <div key={m.id} className="bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-foreground text-sm">{tA?.name} vs {tB?.name}</span>
              <span className="text-xs text-muted-foreground">{m.date} {m.time}</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={m.scoreA} onChange={e => { updateMatch(m.id, { scoreA: Number(e.target.value) }); onRefresh(); }}
                className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <span className="text-primary font-heading text-xs">VS</span>
              <input type="number" value={m.scoreB} onChange={e => { updateMatch(m.id, { scoreB: Number(e.target.value) }); onRefresh(); }}
                className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <select value={m.status} onChange={e => { updateMatch(m.id, { status: e.target.value as any }); onRefresh(); }}
                className="p-1 bg-secondary rounded border border-border text-foreground text-xs ml-auto">
                <option value="upcoming">Próxima</option>
                <option value="live">Ao Vivo</option>
                <option value="completed">Finalizada</option>
              </select>
            </div>
          </div>
        );
      })}
      {clanMatches.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhuma partida</p>}
    </div>
  );
}

// ======= CLAN TRAINING TAB =======
function ClanTrainingTab({ clanTrainings, clanTeams, clanId, onRefresh }: { clanTrainings: any[]; clanTeams: Team[]; clanId: string; onRefresh: () => void }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = () => {
    if (!teamA || !teamB || !date) return;
    addTraining({ teamAId: teamA, teamBId: teamB, date, time, clanId, scoreA: 0, scoreB: 0, status: 'scheduled', playerStats: {} });
    setTeamA(''); setTeamB(''); setDate(''); setTime('');
    onRefresh(); toast.success('Treino agendado!');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={teamA} onChange={e => setTeamA(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
          <option value="">Time 1</option>
          {clanTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={teamB} onChange={e => setTeamB(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
          <option value="">Time 2</option>
          {clanTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
      </div>
      <button onClick={handleAdd} className="w-full px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center justify-center gap-2"><Plus size={14} /> AGENDAR TREINO</button>
      {clanTrainings.map(t => {
        const tA = clanTeams.find(te => te.id === t.teamAId);
        const tB = clanTeams.find(te => te.id === t.teamBId);
        return (
          <div key={t.id} className="bg-secondary/50 p-4 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-foreground text-sm">{tA?.name} vs {tB?.name}</span>
              <span className="text-xs text-muted-foreground">{t.date} {t.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={t.scoreA} onChange={e => { updateTraining(t.id, { scoreA: Number(e.target.value) }); onRefresh(); }}
                className="w-12 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <span className="text-muted-foreground text-xs">x</span>
              <input type="number" value={t.scoreB} onChange={e => { updateTraining(t.id, { scoreB: Number(e.target.value) }); onRefresh(); }}
                className="w-12 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <select value={t.status} onChange={e => { updateTraining(t.id, { status: e.target.value as any }); onRefresh(); }}
                className="p-1 bg-secondary rounded border border-border text-foreground text-xs ml-auto">
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
          </div>
        );
      })}
      {clanTrainings.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhum treino</p>}
    </div>
  );
}

// ======= CLAN NEWS TAB =======
function ClanNewsTab({ clanNews, clanId, currentUserId, onRefresh }: { clanNews: any[]; clanId: string; currentUserId: string; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

  const handleAdd = () => {
    if (!title || !content) return;
    addNews({ title, content, clanId, authorId: currentUserId, createdAt: new Date().toISOString(), image: image || undefined });
    // Notify all clan members
    const clanMembers = getUsers().filter(u => u.clanId === clanId && u.role !== 'superadmin');
    clanMembers.forEach(u => {
      addNotification({ userId: u.id, type: 'news', title: '📰 Nova Notícia', message: title, read: false, createdAt: new Date().toISOString() });
    });
    setTitle(''); setContent(''); setImage('');
    onRefresh(); toast.success('Aviso publicado!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do aviso"
        className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo" rows={4}
        className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display resize-none" />
      <div className="flex gap-3 items-center">
        <label className="px-4 py-2 bg-secondary rounded border border-border text-muted-foreground font-display text-xs cursor-pointer hover:border-primary transition-all">
          📷 Anexar imagem
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
        {image && <span className="text-xs text-success font-display">✓ Imagem anexada</span>}
      </div>
      <button onClick={handleAdd} className="px-6 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">PUBLICAR</button>
      <div className="space-y-2">
        {clanNews.map(n => (
          <div key={n.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <span className="font-display text-foreground text-sm">{n.title}</span>
              {n.image && <span className="text-[10px] text-primary ml-2">📷</span>}
            </div>
            <button onClick={() => { deleteNews(n.id); onRefresh(); }} className="text-destructive"><Trash size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======= CLAN SETTINGS TAB =======
function ClanSettingsTab({ clan, onRefresh }: { clan?: Clan; onRefresh: () => void }) {
  const [name, setName] = useState(clan?.name || '');
  const [description, setDescription] = useState(clan?.description || '');
  const [adminCode, setAdminCode] = useState(clan?.adminCode || '');
  const [division, setDivision] = useState(clan?.division || 'Bronze');
  const bannerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  if (!clan) return <p className="text-muted-foreground font-display text-center p-6">Clã não encontrado</p>;

  const handleSave = () => {
    updateClan(clan.id, { name, description, adminCode, division });
    onRefresh(); toast.success('Configurações salvas!');
  };

  const handleImageUpload = (field: 'logo' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateClan(clan.id, { [field]: reader.result as string }); onRefresh(); toast.success(`${field === 'logo' ? 'Logo' : 'Banner'} atualizado!`); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-heading text-xs text-primary flex items-center gap-2"><Settings size={14} /> CONFIGURAÇÕES DO CLÃ</h3>

        <div className="flex gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg border border-border overflow-hidden cursor-pointer mx-auto mb-1" onClick={() => logoRef.current?.click()}>
              {clan.logo ? <img src={clan.logo} alt="" className="w-full h-full object-cover" /> :
                <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground"><Image size={20} /></div>}
            </div>
            <p className="text-[10px] text-muted-foreground font-display">Logo</p>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleImageUpload('logo')} className="hidden" />
          </div>
          <div className="text-center flex-1">
            <div className="w-full h-16 rounded-lg border border-border overflow-hidden cursor-pointer mb-1" onClick={() => bannerRef.current?.click()}>
              {clan.banner ? <img src={clan.banner} alt="" className="w-full h-full object-cover" /> :
                <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground"><Image size={20} /></div>}
            </div>
            <p className="text-[10px] text-muted-foreground font-display">Banner</p>
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleImageUpload('banner')} className="hidden" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-display">Nome do Clã</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-display">Descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-display flex items-center gap-1"><Lock size={12} /> Código de Admin</label>
          <input value={adminCode} onChange={e => setAdminCode(e.target.value)} className="w-full p-3 bg-secondary rounded border border-primary/30 text-foreground font-display text-sm" />
          <p className="text-[10px] text-muted-foreground font-display mt-1">Compartilhe este código apenas com admins autorizados</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-display">Divisão</label>
          <select value={division} onChange={e => setDivision(e.target.value)}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            {['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Lendário'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button onClick={handleSave} className="w-full py-3 gradient-primary text-primary-foreground rounded font-heading text-xs">SALVAR CONFIGURAÇÕES</button>
      </div>
    </div>
  );
}

// ======= SUPER ADMIN SUB-TABS =======
function SuperClansTab({ clans, users, onRefresh }: { clans: Clan[]; users: User[]; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-sm text-gold">TODOS OS CLÃS</h3>
      {clans.map(c => {
        const memberCount = users.filter(u => u.clanId === c.id).length;
        return (
          <div key={c.id} className="bg-secondary/50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              {c.logo ? <img src={c.logo} alt="" className="w-10 h-10 rounded-lg object-cover" /> :
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-heading text-foreground">{c.name[0]}</div>}
              <div>
                <p className="font-heading text-sm text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground font-display">{memberCount} membros | {c.division} | Código: {c.adminCode || 'N/A'}</p>
              </div>
            </div>
            <button onClick={() => { deleteClan(c.id); onRefresh(); toast.success('Clã removido'); }} className="text-destructive p-1"><Trash size={14} /></button>
          </div>
        );
      })}
      {clans.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum clã</p>}
    </div>
  );
}

function SuperUsersTab({ users, clans, onRefresh }: { users: User[]; clans: Clan[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.gameNick?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
      </div>
      {filtered.map(u => {
        const clan = clans.find(c => c.id === u.clanId);
        return (
          <div key={u.id} className="bg-secondary/50 p-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-display text-foreground text-sm">{u.username} ({u.gameNick})</p>
              <p className="text-[10px] text-muted-foreground">#{u.uniqueId} | {clan?.name || 'Sem clã'} | {u.role.toUpperCase()} | {u.gold}G</p>
            </div>
            <div className="flex gap-2">
              <select value={u.role} onChange={e => { updateUser(u.id, { role: e.target.value as any }); onRefresh(); }}
                className="p-1 bg-secondary rounded border border-border text-foreground text-xs">
                <option value="user">Jogador</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={() => { deleteUser(u.id); onRefresh(); }} className="text-destructive p-1"><Trash size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WithdrawalsTab() {
  const [refresh, setRefresh] = useState(0);
  const r = () => setRefresh(p => p + 1);
  const withdrawals = getWithdrawals();
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };
  return (
    <div className="space-y-3">
      {withdrawals.map(w => (
        <div key={w.id} className={`p-4 rounded-lg border ${w.status === 'completed' ? 'border-success/30 bg-success/5' : w.status === 'rejected' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading text-gold text-lg">{w.amount}G</span>
            <span className={`text-xs font-display px-2 py-1 rounded ${w.status === 'completed' ? 'bg-success/20 text-success' : w.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
              {w.status === 'completed' ? '✅ Concluído' : w.status === 'rejected' ? '❌ Rejeitado' : '⏳ Pendente'}
            </span>
          </div>
          <div className="space-y-1 text-sm font-display">
            {w.pixKey && (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded p-2">
                <span className="text-primary">🔑 Pix: <span className="text-foreground">{w.pixKey}</span></span>
                <button onClick={() => copyText(w.pixKey, 'Chave Pix')} className="text-xs text-primary hover:underline flex items-center gap-1"><Copy size={12} /> Copiar</button>
              </div>
            )}
            <p className="text-muted-foreground">🎮 Nick: <span className="text-foreground">{w.gameNick}</span></p>
            <p className="text-muted-foreground">🆔 ID: <span className="text-foreground">{w.userUniqueId}</span></p>
            <p className="text-muted-foreground">👤 Usuário: <span className="text-foreground">{w.username}</span></p>
            <p className="text-muted-foreground">📱 WhatsApp: <span className="text-foreground">{w.whatsapp}</span></p>
            <p className="text-muted-foreground">📧 Email: <span className="text-foreground">{w.email}</span></p>
            <p className="text-muted-foreground text-xs">📅 {new Date(w.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          {w.status === 'pending' && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button onClick={() => {
                updateWithdrawal(w.id, { status: 'completed' });
                addNotification({ userId: w.userId, type: 'withdrawal', title: 'Saque Aprovado ✅', message: `Seu saque de ${w.amount}G foi aprovado! O pagamento será enviado para sua chave Pix.`, read: false, createdAt: new Date().toISOString() });
                r(); toast.success('Saque aprovado');
              }}
                className="flex-1 py-2 bg-success/20 text-success rounded font-heading text-xs hover:bg-success/30">✅ APROVAR</button>
              <button onClick={() => {
                updateWithdrawal(w.id, { status: 'rejected' });
                const u = getUsers().find(u2 => u2.id === w.userId);
                if (u) updateUser(u.id, { gold: (u.gold || 0) + w.amount });
                addNotification({ userId: w.userId, type: 'withdrawal', title: 'Saque Rejeitado ❌', message: `Seu saque de ${w.amount}G foi rejeitado. O valor foi devolvido ao seu saldo.`, read: false, createdAt: new Date().toISOString() });
                r(); toast.info('Saque rejeitado, gold devolvido');
              }} className="flex-1 py-2 bg-destructive/20 text-destructive rounded font-heading text-xs hover:bg-destructive/30">❌ REJEITAR</button>
            </div>
          )}
        </div>
      ))}
      {withdrawals.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum saque</p>}
    </div>
  );
}

function SpinsTab({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [freeSpinUserId, setFreeSpinUserId] = useState('');
  const [freeSpinAmount, setFreeSpinAmount] = useState(1);
  const [goldUserId, setGoldUserId] = useState('');
  const [goldAmount, setGoldAmount] = useState(100);
  const spinPurchases = getSpinPurchases();

  const handleFreeSpins = () => {
    if (!freeSpinUserId) return;
    const u = users.find(u2 => u2.id === freeSpinUserId);
    if (!u) { toast.error('Usuário não encontrado'); return; }
    updateUser(u.id, { freeSpins: (u.freeSpins || 0) + freeSpinAmount });
    toast.success(`${freeSpinAmount} giros enviados para ${u.username}`);
    onRefresh();
  };

  const handleGiveGold = () => {
    if (!goldUserId) return;
    const u = users.find(u2 => u2.id === goldUserId);
    if (!u) { toast.error('Usuário não encontrado'); return; }
    updateUser(u.id, { gold: (u.gold || 0) + goldAmount });
    toast.success(`${goldAmount}G enviados para ${u.username}`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Give Gold */}
      <div className="bg-card rounded-lg border border-gold/20 p-5">
        <h3 className="font-heading text-sm text-gold mb-4 flex items-center gap-2"><DollarSign size={16} /> DAR GOLDS</h3>
        <div className="flex gap-3 flex-wrap">
          <select value={goldUserId} onChange={e => setGoldUserId(e.target.value)}
            className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Selecionar usuário</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.gameNick}) - {u.gold || 0}G</option>)}
          </select>
          <input type="number" value={goldAmount} onChange={e => setGoldAmount(Number(e.target.value))} min={1}
            className="w-24 p-3 bg-secondary rounded border border-border text-foreground text-center font-display" placeholder="Gold" />
          <button onClick={handleGiveGold} className="px-4 bg-gradient-to-r from-gold/80 to-gold text-background rounded font-heading text-xs">ENVIAR GOLD</button>
        </div>
      </div>

      {/* Free Spins */}
      <div className="bg-card rounded-lg border border-primary/20 p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Dices size={16} /> ENVIAR GIROS GRÁTIS</h3>
        <div className="flex gap-3 flex-wrap">
          <select value={freeSpinUserId} onChange={e => setFreeSpinUserId(e.target.value)}
            className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Selecionar usuário</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.gameNick})</option>)}
          </select>
          <input type="number" value={freeSpinAmount} onChange={e => setFreeSpinAmount(Number(e.target.value))} min={1}
            className="w-20 p-3 bg-secondary rounded border border-border text-foreground text-center font-display" />
          <button onClick={handleFreeSpins} className="px-4 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground rounded font-heading text-xs">ENVIAR</button>
        </div>
      </div>

      {/* Pending purchases */}
      <div className="space-y-3">
        <h3 className="font-heading text-sm text-gold">COMPRAS PENDENTES</h3>
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
                onRefresh(); toast.success('Compra confirmada!');
              }} className="p-2 text-success hover:bg-success/10 rounded"><Check size={16} /></button>
            </div>
          );
        })}
        {spinPurchases.filter(p => p.status === 'pending').length === 0 && <p className="text-muted-foreground text-sm font-display">Nenhuma compra pendente</p>}
      </div>
    </div>
  );
}
