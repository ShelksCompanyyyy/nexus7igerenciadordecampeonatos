import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Shield, Users, Swords, Target, Newspaper, Wallet, Dices, DollarSign, Plus, Trash, Check, X, Search, Edit, Image, Crown, BarChart3, Settings, Lock, Copy, Gift, History as HistoryIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PromoCodesPanel from '@/components/admin/PromoCodesPanel';

type SuperTab = 'dashboard' | 'clans' | 'users' | 'withdrawals' | 'spins' | 'economy' | 'clan-manage' | 'promo' | 'deposits';
type ClanTab = 'dashboard' | 'members' | 'teams' | 'matches' | 'training' | 'news' | 'settings';

const CHART_COLORS = ['hsl(0,100%,50%)', 'hsl(45,100%,50%)', 'hsl(120,70%,50%)', 'hsl(200,100%,50%)', 'hsl(280,100%,50%)', 'hsl(30,100%,50%)'];

// DB row types
interface DBProfile {
  id: string; user_id: string; unique_id: string; username: string; email: string;
  game_nick: string; whatsapp: string | null; avatar: string | null; gold: number;
  free_spins: number; clan_id: string | null; team_id: string | null; badges: string[];
  colored_nick: boolean; nick_color_id: string | null; frame_id: string | null;
  kills: number; deaths: number; assists: number; mvps: number; matches_played: number;
  created_at: string; updated_at: string;
}
interface DBClan {
  id: string; name: string; logo: string | null; banner: string | null;
  description: string | null; owner_id: string | null; admin_code: string | null;
  wins: number | null; losses: number | null; is_banned: boolean | null;
  created_at: string; updated_at: string;
}
interface DBTeam {
  id: string; name: string; logo: string | null; clan_id: string;
  players: string[] | null; wins: number | null; losses: number | null;
  created_at: string; updated_at: string;
}
interface DBMatch {
  id: string; clan_id: string; team_a_id: string | null; team_b_id: string | null;
  match_date: string; match_time: string | null; score_a: number | null; score_b: number | null;
  status: string | null; player_stats: any; created_at: string; updated_at: string;
}
interface DBTraining {
  id: string; clan_id: string; team_a_id: string | null; team_b_id: string | null;
  training_date: string; training_time: string | null; score_a: number | null; score_b: number | null;
  status: string | null; player_stats: any; created_at: string; updated_at: string;
}
interface DBNews {
  id: string; title: string; content: string; image: string | null;
  author_id: string | null; clan_id: string | null; created_at: string;
}
interface DBWithdrawal {
  id: string; user_id: string; amount: number; pix_key: string; status: string | null;
  username: string; game_nick: string; email: string; whatsapp: string | null;
  user_unique_id: string; created_at: string;
}
interface DBSpinPurchase {
  id: string; user_id: string; spins: number; amount: number;
  bonus_spins: number | null; method: string | null; status: string | null; created_at: string;
}

// Hook to fetch data from supabase
function useSupabaseData<T>(table: string, filter?: { column: string; value: string }, deps: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from(table).select('*');
    if (filter) query = query.eq(filter.column, filter.value);
    const { data: rows } = await query;
    setData((rows || []) as T[]);
    setLoading(false);
  }, [table, filter?.column, filter?.value]);

  useEffect(() => { refetch(); }, [refetch, ...deps]);

  return { data, loading, refetch };
}

export default function AdminPage() {
  const { user: currentUser, profile, isSuperAdminUser, role } = useAuth();
  if (!currentUser || !profile) return null;
  if (isSuperAdminUser) return <SuperAdminPanel />;
  if (role === 'admin') return <ClanAdminPanel clanId={profile.clan_id || ''} currentUserId={currentUser.id} />;
  return <LineLeaderGate clanId={profile.clan_id || ''} currentUserId={currentUser.id} />;
}

// Liberador para líder/vice de line: dá acesso à mesma view de ClanAdminPanel
function LineLeaderGate({ clanId, currentUserId }: { clanId: string; currentUserId: string }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!clanId || !currentUserId) { setAllowed(false); return; }
    supabase.from('teams').select('id').eq('clan_id', clanId)
      .or(`team_leader_id.eq.${currentUserId},team_co_leader_id.eq.${currentUserId}`)
      .limit(1)
      .then(({ data }) => setAllowed(!!data && data.length > 0));
  }, [clanId, currentUserId]);
  if (allowed === null) return <div className="text-center text-muted-foreground p-12 font-display">Carregando…</div>;
  if (!allowed) return <div className="text-center text-muted-foreground p-12 font-display">Sem permissão</div>;
  return <ClanAdminPanel clanId={clanId} currentUserId={currentUserId} />;
}

// ==================== SUPER ADMIN PANEL ====================
function SuperAdminPanel() {
  const [tab, setTab] = useState<SuperTab>('dashboard');
  const [selectedClanId, setSelectedClanId] = useState('');

  const { data: profiles, refetch: rProfiles } = useSupabaseData<DBProfile>('profiles');
  const { data: clans, refetch: rClans } = useSupabaseData<DBClan>('clans');
  const { data: teams, refetch: rTeams } = useSupabaseData<DBTeam>('teams');
  const { data: matches } = useSupabaseData<DBMatch>('matches');
  const { data: withdrawals, refetch: rWith } = useSupabaseData<DBWithdrawal>('withdrawals');
  const { data: spinPurchases, refetch: rSpins } = useSupabaseData<DBSpinPurchase>('spin_purchases');

  const users = profiles.filter(p => {
    // filter out superadmin later if needed
    return true;
  });

  const r = () => { rProfiles(); rClans(); rTeams(); rWith(); rSpins(); };

  const tabs: { id: SuperTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'clan-manage', label: 'Gerenciar Clã', icon: Shield },
    { id: 'clans', label: 'Clãs', icon: Crown },
    { id: 'users', label: 'Contas', icon: Users },
    { id: 'withdrawals', label: 'Saques', icon: Wallet },
    { id: 'spins', label: 'Giros', icon: Dices },
    { id: 'economy', label: 'Economia', icon: DollarSign },
    { id: 'deposits', label: 'Depósitos', icon: Wallet },
    { id: 'promo', label: 'Códigos', icon: Gift },
  ];

  const clanMembersData = clans.map(c => ({
    name: (c.name || '').substring(0, 10),
    membros: users.filter(u => u.clan_id === c.id).length,
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
      {tab === 'withdrawals' && <WithdrawalsTab withdrawals={withdrawals} onRefresh={rWith} />}
      {tab === 'spins' && <SpinsTab users={users} spinPurchases={spinPurchases} onRefresh={r} />}
      {tab === 'clan-manage' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-gold/20 p-4">
            <h3 className="font-heading text-xs text-gold mb-3">SELECIONE O CLÃ PARA GERENCIAR</h3>
            <select value={selectedClanId} onChange={e => setSelectedClanId(e.target.value)}
              className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
              <option value="">Selecione um clã</option>
              {clans.map(c => <option key={c.id} value={c.id}>{c.name} ({users.filter(u => u.clan_id === c.id).length} membros)</option>)}
            </select>
          </div>
          {selectedClanId && <ClanManagePanel clanId={selectedClanId} onRefresh={r} />}
        </div>
      )}
      {tab === 'economy' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-heading text-xs text-gold mb-4">GOLD POR JOGADOR (TOP 10)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[...users].sort((a, b) => (b.gold || 0) - (a.gold || 0)).slice(0, 10).map(u => ({ name: (u.game_nick || u.username || '').substring(0, 8), gold: u.gold || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                <XAxis dataKey="name" stroke="hsl(0,0%,50%)" fontSize={10} />
                <YAxis stroke="hsl(0,0%,50%)" fontSize={10} />
                <Tooltip contentStyle={{ background: 'hsl(0,0%,10%)', border: '1px solid hsl(45,100%,50%,0.3)', borderRadius: 8 }} />
                <Bar dataKey="gold" fill="hsl(45,100%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ResetGoldsPanel clans={clans} onRefresh={r} />
        </div>
      )}
      {tab === 'promo' && <PromoCodesPanel />}
      {tab === 'deposits' && <DepositsTab />}
    </div>
  );
}

// ==================== CLAN MANAGE PANEL (used by both super and clan admin) ====================
function ClanManagePanel({ clanId, onRefresh }: { clanId: string; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<ClanTab>('members');
  const { data: profiles, refetch: rP } = useSupabaseData<DBProfile>('profiles', { column: 'clan_id', value: clanId });
  const { data: teams, refetch: rT } = useSupabaseData<DBTeam>('teams', { column: 'clan_id', value: clanId });
  const { data: matches, refetch: rM } = useSupabaseData<DBMatch>('matches', { column: 'clan_id', value: clanId });
  const { data: trainings, refetch: rTr } = useSupabaseData<DBTraining>('trainings', { column: 'clan_id', value: clanId });
  const { data: news, refetch: rN } = useSupabaseData<DBNews>('news', { column: 'clan_id', value: clanId });
  const [clan, setClan] = useState<DBClan | null>(null);

  useEffect(() => {
    supabase.from('clans').select('*').eq('id', clanId).maybeSingle().then(({ data }) => setClan(data as DBClan | null));
  }, [clanId]);

  const r = () => { rP(); rT(); rM(); rTr(); rN(); onRefresh(); };

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
      {subTab === 'members' && <ClanMembersTab clanUsers={profiles} clanId={clanId} onRefresh={r} />}
      {subTab === 'teams' && <ClanTeamsTab clanTeams={teams} clanUsers={profiles} clanId={clanId} onRefresh={r} />}
      {subTab === 'matches' && <ClanMatchesTab clanMatches={matches} clanTeams={teams} clanId={clanId} onRefresh={r} />}
      {subTab === 'training' && <ClanTrainingTab clanTrainings={trainings} clanTeams={teams} clanId={clanId} onRefresh={r} />}
      {subTab === 'news' && <ClanNewsTab clanNews={news} clanId={clanId} onRefresh={r} />}
      {subTab === 'settings' && <ClanSettingsTab clan={clan} onRefresh={r} />}
    </div>
  );
}

// ==================== CLAN ADMIN PANEL ====================
function ClanAdminPanel({ clanId, currentUserId }: { clanId: string; currentUserId: string }) {
  const [tab, setTab] = useState<ClanTab>('dashboard');
  const { data: profiles, refetch: rP } = useSupabaseData<DBProfile>('profiles', { column: 'clan_id', value: clanId });
  const { data: teams, refetch: rT } = useSupabaseData<DBTeam>('teams', { column: 'clan_id', value: clanId });
  const { data: matches, refetch: rM } = useSupabaseData<DBMatch>('matches', { column: 'clan_id', value: clanId });
  const { data: trainings, refetch: rTr } = useSupabaseData<DBTraining>('trainings', { column: 'clan_id', value: clanId });
  const { data: news, refetch: rN } = useSupabaseData<DBNews>('news', { column: 'clan_id', value: clanId });
  const [clan, setClan] = useState<DBClan | null>(null);

  useEffect(() => {
    supabase.from('clans').select('*').eq('id', clanId).maybeSingle().then(({ data }) => setClan(data as DBClan | null));
  }, [clanId]);

  const r = () => { rP(); rT(); rM(); rTr(); rN(); };

  const tabs: { id: ClanTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'teams', label: 'Lines', icon: Shield },
    { id: 'matches', label: 'Partidas', icon: Swords },
    { id: 'training', label: 'XTreino', icon: Target },
    { id: 'news', label: 'Avisos', icon: Newspaper },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  const topKillers = [...profiles].sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5).map(u => ({
    name: (u.game_nick || u.username || '').substring(0, 8), kills: u.kills || 0, deaths: u.deaths || 0, assists: u.assists || 0
  }));
  const teamWins = teams.map(t => ({ name: (t.name || '').substring(0, 10), wins: t.wins || 0, losses: t.losses || 0 }));

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
              { label: 'Membros', value: profiles.length, icon: Users },
              { label: 'Lines (Times)', value: teams.length, icon: Shield },
              { label: 'Partidas', value: matches.length, icon: Swords },
              { label: 'Treinos', value: trainings.length, icon: Target },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-lg neon-border p-4">
                <s.icon size={18} className="text-primary mb-2" />
                <p className="font-heading text-xl text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-display">{s.label}</p>
              </div>
            ))}
          </div>
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

      {tab === 'members' && <ClanMembersTab clanUsers={profiles} clanId={clanId} onRefresh={r} />}
      {tab === 'teams' && <ClanTeamsTab clanTeams={teams} clanUsers={profiles} clanId={clanId} onRefresh={r} />}
      {tab === 'matches' && <ClanMatchesTab clanMatches={matches} clanTeams={teams} clanId={clanId} onRefresh={r} />}
      {tab === 'training' && <ClanTrainingTab clanTrainings={trainings} clanTeams={teams} clanId={clanId} onRefresh={r} />}
      {tab === 'news' && <ClanNewsTab clanNews={news} clanId={clanId} onRefresh={r} />}
      {tab === 'settings' && <ClanSettingsTab clan={clan} onRefresh={r} />}
    </div>
  );
}

// ======= CLAN MEMBERS TAB =======
function ClanMembersTab({ clanUsers, clanId, onRefresh }: { clanUsers: DBProfile[]; clanId: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = clanUsers.filter(u =>
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.game_nick || '').toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar membro..."
          className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
      </div>
      {filtered.map(u => <ClanUserRow key={u.id} user={u} onRefresh={onRefresh} />)}
      {filtered.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhum membro encontrado</p>}
    </div>
  );
}

function ClanUserRow({ user, onRefresh }: { user: DBProfile; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [kills, setKills] = useState(user.kills || 0);
  const [deaths, setDeaths] = useState(user.deaths || 0);
  const [assists, setAssists] = useState(user.assists || 0);
  const [mvps, setMvps] = useState(user.mvps || 0);
  const [memberRole, setMemberRole] = useState<'leader' | 'co_leader' | 'member' | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // Fetch current clan_member role for this user in this clan
  useEffect(() => {
    let cancelled = false;
    if (!user.clan_id) { setMemberRole(null); return; }
    supabase
      .from('clan_members')
      .select('role')
      .eq('clan_id', user.clan_id)
      .eq('user_id', user.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMemberRole((data?.role as 'leader' | 'co_leader' | 'member' | undefined) ?? 'member');
      });
    return () => { cancelled = true; };
  }, [user.user_id, user.clan_id]);

  const save = async () => {
    const { error } = await supabase.rpc('update_player_stats', {
      _target_user: user.user_id,
      _kills: kills,
      _deaths: deaths,
      _assists: assists,
      _mvps: mvps,
    });
    if (error) { toast.error(error.message); return; }
    setEditing(false);
    onRefresh();
    toast.success('KDA atualizado!');
  };

  const changeRole = async (newRole: 'co_leader' | 'member') => {
    if (!user.clan_id) return;
    setRoleLoading(true);
    const { error } = await supabase.rpc('promote_clan_member', {
      _target_user: user.user_id,
      _clan_id: user.clan_id,
      _new_role: newRole,
    });
    setRoleLoading(false);
    if (error) { toast.error(error.message); return; }
    setMemberRole(newRole);
    toast.success(newRole === 'co_leader' ? 'Promovido a Vice-Líder!' : 'Rebaixado a Membro');
    onRefresh();
  };

  const isLeader = memberRole === 'leader';
  const isCoLeader = memberRole === 'co_leader';

  const roleBadge = isLeader
    ? { label: 'LÍDER', className: 'bg-gold/15 text-gold border-gold/40' }
    : isCoLeader
      ? { label: 'VICE', className: 'bg-primary/15 text-primary border-primary/40' }
      : { label: 'MEMBRO', className: 'bg-secondary text-muted-foreground border-border' };

  return (
    <div className="bg-secondary/50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> :
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-heading text-xs text-foreground">{user.game_nick?.[0]?.toUpperCase()}</div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-foreground text-sm truncate">{user.game_nick || user.username}</p>
              <span className={`text-[9px] font-heading px-1.5 py-0.5 rounded border ${roleBadge.className}`}>{roleBadge.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">ID: #{user.unique_id} | {user.kills || 0}K/{user.deaths || 0}D/{user.assists || 0}A | {user.mvps || 0} MVPs</p>
          </div>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-primary p-1 shrink-0"><Edit size={14} /></button>
      </div>

      {/* Promote / demote (hidden for leader) */}
      {!isLeader && memberRole !== null && (
        <div className="flex gap-2 mt-2">
          {isCoLeader ? (
            <button
              onClick={() => changeRole('member')}
              disabled={roleLoading}
              className="text-[10px] font-heading px-2 py-1 rounded bg-secondary text-muted-foreground border border-border hover:border-destructive/50 hover:text-destructive transition-colors disabled:opacity-50"
            >
              ↓ REBAIXAR A MEMBRO
            </button>
          ) : (
            <button
              onClick={() => changeRole('co_leader')}
              disabled={roleLoading}
              className="text-[10px] font-heading px-2 py-1 rounded bg-primary/10 text-primary border border-primary/40 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              ↑ PROMOVER A VICE-LÍDER
            </button>
          )}
        </div>
      )}

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
function ClanTeamsTab({ clanTeams, clanUsers, clanId, onRefresh }: { clanTeams: DBTeam[]; clanUsers: DBProfile[]; clanId: string; onRefresh: () => void }) {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('teams').insert({ name: name.trim(), clan_id: clanId, players: [], wins: 0, losses: 0 });
    if (error) { toast.error('Erro: ' + error.message); return; }
    setName('');
    onRefresh();
    toast.success('Line criada!');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da line/time"
          className="flex-1 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
        <button onClick={handleAdd} className="px-4 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center gap-2"><Plus size={14} /> Criar</button>
      </div>
      {clanTeams.map(team => <ClanTeamRow key={team.id} team={team} users={clanUsers} onRefresh={onRefresh} />)}
      {clanTeams.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhuma line criada</p>}
    </div>
  );
}

function ClanTeamRow({ team, users, onRefresh }: { team: DBTeam; users: DBProfile[]; onRefresh: () => void }) {
  const [addingPlayer, setAddingPlayer] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const players = team.players || [];
  const teamPlayers = users.filter(u => players.includes(u.user_id));
  const availablePlayers = users.filter(u => !u.team_id && !players.includes(u.user_id));
  const teamLeaderId = (team as any).team_leader_id || '';
  const teamCoLeaderId = (team as any).team_co_leader_id || '';
  const { user: currentUser, role: actorRole } = useAuth();
  const [isClanAdminFlag, setIsClanAdminFlag] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    supabase.from('clan_members')
      .select('role').eq('clan_id', team.clan_id).eq('user_id', currentUser.id).maybeSingle()
      .then(({ data }) => setIsClanAdminFlag(!!data && (data.role === 'leader' || data.role === 'co_leader')));
  }, [currentUser, team.clan_id]);
  const isSuper = actorRole === 'superadmin';
  const isThisTeamLeader = currentUser?.id && (teamLeaderId === currentUser.id || teamCoLeaderId === currentUser.id);
  const canEditThisLine = isSuper || isClanAdminFlag || isThisTeamLeader;
  const denyAccess = () => toast.error('Acesso negado: você só pode editar membros da sua própria line');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const { error } = await supabase.from('teams').update({ logo: dataUrl }).eq('id', team.id);
      if (error) { toast.error(error.message); return; }
      onRefresh(); toast.success('Logo atualizado!');
    };
    reader.readAsDataURL(file);
  };

  const handleSetLeader = async (userId: string) => {
    if (!canEditThisLine) { denyAccess(); return; }
    const { error } = await supabase.from('teams').update({ team_leader_id: userId || null }).eq('id', team.id);
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success(userId ? 'Líder de line definido!' : 'Líder removido');
  };

  const handleSetCoLeader = async (userId: string) => {
    if (!canEditThisLine) { denyAccess(); return; }
    const { error } = await supabase.from('teams').update({ team_co_leader_id: userId || null } as never).eq('id', team.id);
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success(userId ? 'Vice-líder definido!' : 'Vice-líder removido');
  };

  const handleAddPlayer = async () => {
    if (!addingPlayer) return;
    if (!canEditThisLine) { denyAccess(); return; }
    const { error } = await supabase.rpc('manage_team_player', {
      _team_id: team.id,
      _target_user: addingPlayer,
      _action: 'add',
    });
    if (error) { toast.error(error.message); return; }
    setAddingPlayer('');
    onRefresh();
    toast.success('Jogador adicionado!');
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!canEditThisLine) { denyAccess(); return; }
    const { error } = await supabase.rpc('manage_team_player', {
      _team_id: team.id,
      _target_user: playerId,
      _action: 'remove',
    });
    if (error) { toast.error(error.message); return; }
    onRefresh();
  };

  const handleDelete = async () => {
    if (!canEditThisLine) { denyAccess(); return; }
    await supabase.from('teams').delete().eq('id', team.id);
    onRefresh();
  };

  return (
    <div className={`bg-secondary/50 p-4 rounded-lg ${!canEditThisLine ? 'opacity-70' : ''}`}>
      {!canEditThisLine && (
        <div className="mb-3 px-2 py-1 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-heading flex items-center gap-1">
          <Lock size={10} /> ACESSO NEGADO — você não lidera esta line
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <label className="w-10 h-10 rounded-lg bg-background/50 border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors group" title="Trocar logo da line">
            {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-cover" /> : <Image size={16} className="text-muted-foreground" />}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input value={teamName} onChange={e => setTeamName(e.target.value)} className="p-1 bg-secondary rounded border border-border text-foreground font-heading text-sm w-32" />
              <button onClick={async () => { await supabase.from('teams').update({ name: teamName }).eq('id', team.id); setEditingName(false); onRefresh(); }} className="text-success"><Check size={14} /></button>
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
          <input type="number" value={team.wins || 0} onChange={async e => { await supabase.from('teams').update({ wins: Number(e.target.value) }).eq('id', team.id); onRefresh(); }}
            className="w-12 p-1 bg-secondary rounded border border-border text-success text-center text-xs" placeholder="W" />
          <input type="number" value={team.losses || 0} onChange={async e => { await supabase.from('teams').update({ losses: Number(e.target.value) }).eq('id', team.id); onRefresh(); }}
            className="w-12 p-1 bg-secondary rounded border border-border text-destructive text-center text-xs" placeholder="L" />
          <button onClick={handleDelete} className="text-destructive p-1"><Trash size={14} /></button>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[10px] text-muted-foreground font-display block mb-1">👑 Líder de Line</label>
        <select value={teamLeaderId} onChange={e => handleSetLeader(e.target.value)}
          className="w-full p-2 bg-background rounded border border-border text-foreground font-display text-xs">
          <option value="">Sem líder</option>
          {teamPlayers.map(p => <option key={p.user_id} value={p.user_id}>{p.game_nick || p.username}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <label className="text-[10px] text-muted-foreground font-display block mb-1">🎖️ Vice-Líder de Line</label>
        <select value={teamCoLeaderId} onChange={e => handleSetCoLeader(e.target.value)}
          className="w-full p-2 bg-background rounded border border-border text-foreground font-display text-xs">
          <option value="">Sem vice-líder</option>
          {teamPlayers.filter(p => p.user_id !== teamLeaderId).map(p => <option key={p.user_id} value={p.user_id}>{p.game_nick || p.username}</option>)}
        </select>
      </div>
      <div className="space-y-1 mb-3">
        {teamPlayers.map(p => (
          <div key={p.id} className="flex items-center justify-between text-xs bg-background/50 p-2 rounded">
            <span className="text-foreground font-display">{p.game_nick || p.username}</span>
            <button onClick={() => handleRemovePlayer(p.user_id)} className="text-destructive"><X size={12} /></button>
          </div>
        ))}
      </div>
      {players.length < 5 && (
        <div className="flex gap-2">
          <select value={addingPlayer} onChange={e => setAddingPlayer(e.target.value)}
            className="flex-1 p-2 bg-secondary rounded border border-border text-foreground font-display text-xs">
            <option value="">Adicionar jogador</option>
            {availablePlayers.map(p => <option key={p.user_id} value={p.user_id}>{p.game_nick || p.username}</option>)}
          </select>
          <button onClick={handleAddPlayer} className="px-3 gradient-primary text-primary-foreground rounded text-xs"><Plus size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ======= CLAN MATCHES TAB =======
function ClanMatchesTab({ clanMatches, clanTeams, clanId, onRefresh }: { clanMatches: DBMatch[]; clanTeams: DBTeam[]; clanId: string; onRefresh: () => void }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleAdd = async () => {
    if (!teamA || !teamB || !date) return;
    const { error } = await supabase.from('matches').insert({
      team_a_id: teamA, team_b_id: teamB, match_date: date, match_time: time,
      score_a: 0, score_b: 0, status: 'upcoming', clan_id: clanId, player_stats: {}
    });
    if (error) { toast.error('Erro: ' + error.message); return; }
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
        const tA = clanTeams.find(t => t.id === m.team_a_id);
        const tB = clanTeams.find(t => t.id === m.team_b_id);
        return (
          <div key={m.id} className="bg-secondary/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-foreground text-sm">{tA?.name} vs {tB?.name}</span>
              <span className="text-xs text-muted-foreground">{m.match_date} {m.match_time}</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={m.score_a || 0} onChange={async e => { await supabase.from('matches').update({ score_a: Number(e.target.value) }).eq('id', m.id); onRefresh(); }}
                className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <span className="text-primary font-heading text-xs">VS</span>
              <input type="number" value={m.score_b || 0} onChange={async e => { await supabase.from('matches').update({ score_b: Number(e.target.value) }).eq('id', m.id); onRefresh(); }}
                className="w-14 p-1 bg-secondary rounded border border-border text-foreground text-center text-sm" />
              <select value={m.status || 'upcoming'} onChange={async e => { await supabase.from('matches').update({ status: e.target.value }).eq('id', m.id); onRefresh(); }}
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
function ClanTrainingTab({ clanTrainings, clanTeams, clanId, onRefresh }: { clanTrainings: DBTraining[]; clanTeams: DBTeam[]; clanId: string; onRefresh: () => void }) {
  return <XtreinosTab clanTrainings={clanTrainings} clanTeams={clanTeams} clanId={clanId} onRefresh={onRefresh} />;
}

// ======= XTREINOS TAB =======
function XtreinosTab({ clanTrainings, clanTeams, clanId, onRefresh }: { clanTrainings: DBTraining[]; clanTeams: DBTeam[]; clanId: string; onRefresh: () => void }) {
  const [title, setTitle] = useState('');
  const [teamA, setTeamA] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [participants, setParticipants] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${clanId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('training-photos').upload(path, file, { upsert: false });
    if (error) { toast.error('Erro upload: ' + error.message); return null; }
    const { data } = supabase.storage.from('training-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!date) { toast.error('Defina a data'); return; }
    setUploading(true);
    let photo_url: string | null = null;
    if (photoFile) photo_url = await uploadPhoto(photoFile);
    const names = participants.split(',').map(s => s.trim()).filter(Boolean);
    const payload: any = {
      clan_id: clanId,
      training_date: date,
      training_time: time || '',
      team_a_id: teamA || null,
      team_b_id: null,
      score_a: 0,
      score_b: 0,
      status: 'scheduled',
      player_stats: {},
      title: title.trim(),
      photo_url,
      participant_names: names,
    };
    const { error } = await supabase.from('trainings').insert(payload);
    setUploading(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setTitle(''); setDate(''); setTime(''); setParticipants(''); setPhotoFile(null); setTeamA('');
    onRefresh(); toast.success('🎯 Xtreino adicionado!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este treino?')) return;
    await supabase.from('trainings').delete().eq('id', id);
    onRefresh();
  };

  // Filtrar por mês selecionado
  const filtered = clanTrainings.filter(t => (t.training_date || '').startsWith(filterMonth));
  // Agrupar por dia
  const byDay: Record<string, DBTraining[]> = {};
  filtered.forEach(t => {
    const d = t.training_date || 'sem-data';
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(t);
  });
  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Form criar */}
      <div className="bg-secondary/30 p-4 rounded-lg neon-border space-y-3">
        <h3 className="font-heading text-sm text-primary flex items-center gap-2"><Target size={14} /> NOVO XTREINO</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do treino (ex: Treino Tático)"
          className="w-full p-3 bg-background rounded border border-border text-foreground font-display text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="p-3 bg-background rounded border border-border text-foreground font-display text-sm" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="p-3 bg-background rounded border border-border text-foreground font-display text-sm" />
        </div>
        <select value={teamA} onChange={e => setTeamA(e.target.value)} className="w-full p-3 bg-background rounded border border-border text-foreground font-display text-sm">
          <option value="">Selecionar line (opcional)</option>
          {clanTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input value={participants} onChange={e => setParticipants(e.target.value)}
          placeholder="Nomes dos participantes (separados por vírgula)"
          className="w-full p-3 bg-background rounded border border-border text-foreground font-display text-sm" />
        <label className="flex items-center gap-3 p-3 bg-background rounded border border-dashed border-border cursor-pointer hover:border-primary transition-colors">
          <Image size={18} className="text-muted-foreground" />
          <span className="text-xs font-display text-muted-foreground flex-1">{photoFile ? photoFile.name : 'Anexar foto do treino (opcional)'}</span>
          <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
        <button disabled={uploading} onClick={handleAdd}
          className="w-full px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center justify-center gap-2 disabled:opacity-50">
          <Plus size={14} /> {uploading ? 'ENVIANDO...' : 'AGENDAR XTREINO'}
        </button>
      </div>

      {/* Filtro por mês */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-heading text-muted-foreground">📅 Mês:</span>
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="p-2 bg-secondary rounded border border-border text-foreground font-display text-xs" />
        <span className="text-xs font-display text-muted-foreground ml-auto">{filtered.length} treino(s)</span>
      </div>

      {/* Calendário/Lista por dia */}
      {sortedDays.length === 0 && (
        <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhum treino neste mês</p>
      )}
      {sortedDays.map(day => (
        <div key={day} className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h4 className="font-heading text-xs text-primary border-b border-border pb-2">📆 {day}</h4>
          {byDay[day].map(t => {
            const lineName = clanTeams.find(te => te.id === t.team_a_id)?.name;
            const tt = t as any;
            return (
              <div key={t.id} className="bg-secondary/40 p-3 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-heading text-sm text-foreground">{tt.title || 'Xtreino'}</p>
                    <p className="text-[10px] text-muted-foreground font-display flex items-center gap-3 mt-1">
                      {t.training_time && <span>⏰ {t.training_time}</span>}
                      {lineName && <span>🛡️ {lineName}</span>}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(t.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash size={12} /></button>
                </div>
                {tt.photo_url && (
                  <img src={tt.photo_url} alt="treino" className="w-full max-h-48 object-cover rounded border border-border" />
                )}
                {tt.participant_names && tt.participant_names.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tt.participant_names.map((n: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-display border border-primary/20">{n}</span>
                    ))}
                  </div>
                )}
                <select value={t.status || 'scheduled'} onChange={async e => { await supabase.from('trainings').update({ status: e.target.value }).eq('id', t.id); onRefresh(); }}
                  className="p-1 bg-background rounded border border-border text-foreground text-[10px] font-heading">
                  <option value="scheduled">⏳ Agendado</option>
                  <option value="completed">✅ Concluído</option>
                  <option value="cancelled">❌ Cancelado</option>
                </select>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ======= CLAN NEWS TAB =======
function ClanNewsTab({ clanNews, clanId, onRefresh }: { clanNews: DBNews[]; clanId: string; onRefresh: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');

  const handleAdd = async () => {
    if (!title || !content) return;
    const { error } = await supabase.from('news').insert({
      title, content, clan_id: clanId, author_id: user?.id || null, image: image || null
    });
    if (error) { toast.error('Erro: ' + error.message); return; }
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
            <button onClick={async () => { await supabase.from('news').delete().eq('id', n.id); onRefresh(); }} className="text-destructive"><Trash size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ======= CLAN SETTINGS TAB =======
function ClanSettingsTab({ clan, onRefresh }: { clan?: DBClan | null; onRefresh: () => void }) {
  const [name, setName] = useState(clan?.name || '');
  const [description, setDescription] = useState(clan?.description || '');
  const [adminCode, setAdminCode] = useState(clan?.admin_code || '');
  const [logo, setLogo] = useState(clan?.logo || '');
  const [banner, setBanner] = useState(clan?.banner || '');

  useEffect(() => {
    if (clan) {
      setName(clan.name);
      setDescription(clan.description || '');
      setAdminCode(clan.admin_code || '');
      setLogo(clan.logo || '');
      setBanner(clan.banner || '');
    }
  }, [clan]);

  if (!clan) return <p className="text-muted-foreground font-display text-center p-6">Clã não encontrado</p>;

  const handleSave = async () => {
    const { error } = await supabase.from('clans').update({ name, description, admin_code: adminCode, logo, banner }).eq('id', clan.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    onRefresh(); toast.success('Configurações salvas!');
  };

  const upload = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="font-heading text-xs text-primary flex items-center gap-2"><Settings size={14} /> CONFIGURAÇÕES DO CLÃ</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-display block mb-1">Logo do Clã</label>
            <label className="block w-full aspect-square rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
              {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Image size={24} className="text-muted-foreground" />}
              <input type="file" accept="image/*" onChange={upload(setLogo)} className="hidden" />
            </label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-display block mb-1">Banner do Clã</label>
            <label className="block w-full aspect-square rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
              {banner ? <img src={banner} alt="" className="w-full h-full object-cover" /> : <Image size={24} className="text-muted-foreground" />}
              <input type="file" accept="image/*" onChange={upload(setBanner)} className="hidden" />
            </label>
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
        <button onClick={handleSave} className="w-full py-3 gradient-primary text-primary-foreground rounded font-heading text-xs">SALVAR CONFIGURAÇÕES</button>
      </div>
    </div>
  );
}

// ======= SUPER ADMIN SUB-TABS =======
function SuperClansTab({ clans, users, onRefresh }: { clans: DBClan[]; users: DBProfile[]; onRefresh: () => void }) {
  return <SuperClansTabImpl clans={clans} users={users} onRefresh={onRefresh} />;
}

// ======= DEPOSITS TAB =======
interface DBDeposit {
  id: string; user_id: string; amount: number; status: string; method: string;
  proof_url: string | null; pix_key: string | null; notes: string | null;
  created_at: string;
}
function DepositsTab() {
  const [deposits, setDeposits] = useState<DBDeposit[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { username: string; game_nick: string; unique_id: string }>>(new Map());

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('deposits').select('*').order('created_at', { ascending: false });
    const list = (data || []) as DBDeposit[];
    setDeposits(list);
    const ids = Array.from(new Set(list.map(d => d.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, username, game_nick, unique_id').in('user_id', ids);
      const m = new Map<string, { username: string; game_nick: string; unique_id: string }>();
      profs?.forEach(p => m.set(p.user_id, { username: p.username, game_nick: p.game_nick, unique_id: p.unique_id }));
      setProfilesMap(m);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('deposits-admin')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'deposits' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const action = async (id: string, approve: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('approve_deposit', { _deposit_id: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? '✅ Depósito aprovado e creditado' : '❌ Depósito rejeitado');
    load();
  };

  const pending = deposits.filter(d => d.status === 'pending');
  const processed = deposits.filter(d => d.status !== 'pending');

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-sm text-gold flex items-center gap-2"><Wallet size={16}/> DEPÓSITOS PENDENTES ({pending.length})</h3>
      {pending.length === 0 && <p className="text-center text-muted-foreground font-display p-6 text-sm">Nenhum depósito pendente</p>}
      {pending.map(d => {
        const p = profilesMap.get(d.user_id);
        return (
          <div key={d.id} className="p-4 rounded-lg border border-warning/40 bg-warning/5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="font-heading text-success text-lg">R$ {Number(d.amount).toFixed(2)}</span>
              <span className="text-xs px-2 py-1 rounded bg-warning/20 text-warning font-display">⏳ Pendente</span>
            </div>
            <div className="space-y-1 text-sm font-display">
              <p className="text-muted-foreground">👤 <span className="text-foreground">{p?.username || 'Desconhecido'} ({p?.game_nick || '—'})</span></p>
              <p className="text-muted-foreground">🆔 <span className="text-foreground">#{p?.unique_id || '—'}</span></p>
              <p className="text-muted-foreground">💳 Método: <span className="text-foreground uppercase">{d.method}</span></p>
              <p className="text-muted-foreground text-xs">📅 {new Date(d.created_at).toLocaleString('pt-BR')}</p>
              {d.proof_url && (
                <a href={d.proof_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-primary underline">📎 Ver comprovante</a>
              )}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button onClick={() => action(d.id, true)} className="flex-1 py-2 bg-success/20 text-success rounded font-heading text-xs hover:bg-success/30">✅ APROVAR E CREDITAR</button>
              <button onClick={() => action(d.id, false)} className="flex-1 py-2 bg-destructive/20 text-destructive rounded font-heading text-xs hover:bg-destructive/30">❌ REJEITAR</button>
            </div>
          </div>
        );
      })}

      {processed.length > 0 && (
        <>
          <h3 className="font-heading text-sm text-muted-foreground flex items-center gap-2 pt-4"><History size={14}/> HISTÓRICO</h3>
          {processed.slice(0, 30).map(d => {
            const p = profilesMap.get(d.user_id);
            return (
              <div key={d.id} className={`p-3 rounded border flex items-center justify-between gap-2 ${d.status === 'approved' ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="text-xs font-display min-w-0">
                  <p className="text-foreground truncate">{p?.username || '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="font-heading text-foreground">R$ {Number(d.amount).toFixed(2)}</span>
                <span className={`text-[10px] font-display px-2 py-1 rounded ${d.status === 'approved' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {d.status === 'approved' ? '✅ Aprovado' : '❌ Rejeitado'}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function SuperClansTabImpl({ clans, users, onRefresh }: { clans: DBClan[]; users: DBProfile[]; onRefresh: () => void }) {
  const handleToggleBan = async (clan: DBClan) => {
    const newState = !clan.is_banned;
    const { error } = await supabase.from('clans').update({ is_banned: newState }).eq('id', clan.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    onRefresh();
    toast.success(newState ? `Clã ${clan.name} banido` : `Clã ${clan.name} desbanido`);
  };

  const handleDelete = async (clan: DBClan) => {
    if (!confirm(`Excluir o clã "${clan.name}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    await supabase.from('profiles').update({ clan_id: null }).eq('clan_id', clan.id);
    const { error } = await supabase.from('clans').delete().eq('id', clan.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    onRefresh();
    toast.success('Clã removido');
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-sm text-gold">TODOS OS CLÃS ({clans.length})</h3>
      {clans.map(c => {
        const memberCount = users.filter(u => u.clan_id === c.id).length;
        const banned = !!c.is_banned;
        return (
          <div key={c.id} className={`p-4 rounded-lg flex items-center justify-between gap-3 ${banned ? 'bg-destructive/10 border border-destructive/40' : 'bg-secondary/50'}`}>
            <div className="flex items-center gap-3 min-w-0">
              {c.logo ? <img src={c.logo} alt="" className="w-10 h-10 rounded-lg object-cover" /> :
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-heading text-foreground">{c.name[0]}</div>}
              <div className="min-w-0">
                <p className="font-heading text-sm text-foreground truncate flex items-center gap-2">
                  {c.name}
                  {banned && <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-display">BANIDO</span>}
                </p>
                <p className="text-[10px] text-muted-foreground font-display">{memberCount} membros | Código: {c.admin_code || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleToggleBan(c)}
                className={`px-3 py-1.5 rounded font-heading text-[10px] ${banned ? 'bg-success/20 text-success border border-success/40' : 'bg-warning/20 text-warning border border-warning/40'}`}>
                {banned ? 'DESBANIR' : 'BANIR'}
              </button>
              <button onClick={() => handleDelete(c)} className="text-destructive p-1.5 hover:bg-destructive/10 rounded"><Trash size={14} /></button>
            </div>
          </div>
        );
      })}
      {clans.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum clã</p>}
    </div>
  );
}

function SuperUsersTab({ users, clans, onRefresh }: { users: DBProfile[]; clans: DBClan[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<DBTeam[]>([]);
  useEffect(() => {
    supabase.from('teams').select('*').then(({ data }) => setTeams((data || []) as DBTeam[]));
  }, []);
  const filtered = users.filter(u => (u.username || '').toLowerCase().includes(search.toLowerCase()) || (u.game_nick || '').toLowerCase().includes(search.toLowerCase()));

  const zeroGold = async (u: DBProfile) => {
    if (!confirm(`Zerar Gold de ${u.username}?`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('reset_user_golds', { _user_id: u.user_id, _exclude_admins: false, _clan_id: null });
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success(`Gold zerado: ${u.username}`);
  };

  const deleteAccount = async (u: DBProfile) => {
    if (!confirm(`EXCLUIR a conta de ${u.username}? Esta ação é irreversível.`)) return;
    const { error } = await supabase.functions.invoke('admin-delete-user', { body: { user_id: u.user_id } });
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success('Conta excluída');
  };

  const transferClan = async (u: DBProfile, newClanId: string) => {
    const payload: { clan_id: string | null; team_id: null } = { clan_id: newClanId || null, team_id: null };
    const { error } = await supabase.from('profiles').update(payload).eq('user_id', u.user_id);
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success('Clã transferido');
  };

  const transferTeam = async (u: DBProfile, newTeamId: string) => {
    const { error } = await supabase.from('profiles').update({ team_id: newTeamId || null }).eq('user_id', u.user_id);
    if (error) { toast.error(error.message); return; }
    onRefresh(); toast.success('Line atualizada');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
      </div>
      {filtered.map(u => {
        const clan = clans.find(c => c.id === u.clan_id);
        const userTeams = teams.filter(t => t.clan_id === u.clan_id);
        return (
          <div key={u.id} className="bg-secondary/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-foreground text-sm truncate">{u.username} ({u.game_nick})</p>
                <p className="text-[10px] text-muted-foreground">#{u.unique_id} | {clan?.name || 'Sem clã'} | {u.gold || 0}G</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => zeroGold(u)} title="Zerar Gold"
                  className="px-2 py-1 bg-warning/10 text-warning border border-warning/30 rounded font-heading text-[10px]">
                  ZERAR G
                </button>
                <button onClick={() => deleteAccount(u)} title="Excluir conta"
                  className="p-1.5 bg-destructive/10 text-destructive border border-destructive/30 rounded">
                  <Trash size={12} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={u.clan_id || ''} onChange={e => transferClan(u, e.target.value)}
                className="p-2 bg-background rounded border border-border text-foreground font-display text-xs">
                <option value="">Sem clã</option>
                {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={u.team_id || ''} onChange={e => transferTeam(u, e.target.value)} disabled={!u.clan_id}
                className="p-2 bg-background rounded border border-border text-foreground font-display text-xs disabled:opacity-50">
                <option value="">Sem line</option>
                {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WithdrawalsTab({ withdrawals, onRefresh }: { withdrawals: DBWithdrawal[]; onRefresh: () => void }) {
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleApprove = async (w: DBWithdrawal) => {
    await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', w.id);
    await supabase.from('notifications').insert({
      user_id: w.user_id, type: 'withdrawal', title: 'Saque Aprovado ✅',
      message: `Seu saque de ${w.amount}G foi aprovado!`
    });
    onRefresh(); toast.success('Saque aprovado');
  };

  const handleReject = async (w: DBWithdrawal) => {
    await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', w.id);
    // Return gold
    const { data: profile } = await supabase.from('profiles').select('gold').eq('user_id', w.user_id).maybeSingle();
    if (profile) {
      await supabase.from('profiles').update({ gold: (profile.gold || 0) + w.amount }).eq('user_id', w.user_id);
    }
    await supabase.from('notifications').insert({
      user_id: w.user_id, type: 'withdrawal', title: 'Saque Rejeitado ❌',
      message: `Seu saque de ${w.amount}G foi rejeitado. O valor foi devolvido.`
    });
    onRefresh(); toast.info('Saque rejeitado, gold devolvido');
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
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded p-2">
              <span className="text-primary">🔑 Pix: <span className="text-foreground">{w.pix_key}</span></span>
              <button onClick={() => copyText(w.pix_key, 'Chave Pix')} className="text-xs text-primary hover:underline flex items-center gap-1"><Copy size={12} /> Copiar</button>
            </div>
            <p className="text-muted-foreground">🎮 Nick: <span className="text-foreground">{w.game_nick}</span></p>
            <p className="text-muted-foreground">🆔 ID: <span className="text-foreground">{w.user_unique_id}</span></p>
            <p className="text-muted-foreground">👤 Usuário: <span className="text-foreground">{w.username}</span></p>
            <p className="text-muted-foreground">📱 WhatsApp: <span className="text-foreground">{w.whatsapp}</span></p>
            <p className="text-muted-foreground">📧 Email: <span className="text-foreground">{w.email}</span></p>
            <p className="text-muted-foreground text-xs">📅 {new Date(w.created_at).toLocaleString('pt-BR')}</p>
          </div>
          {w.status === 'pending' && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button onClick={() => handleApprove(w)} className="flex-1 py-2 bg-success/20 text-success rounded font-heading text-xs hover:bg-success/30">✅ APROVAR</button>
              <button onClick={() => handleReject(w)} className="flex-1 py-2 bg-destructive/20 text-destructive rounded font-heading text-xs hover:bg-destructive/30">❌ REJEITAR</button>
            </div>
          )}
        </div>
      ))}
      {withdrawals.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum saque</p>}
    </div>
  );
}

function SpinsTab({ users, spinPurchases, onRefresh }: { users: DBProfile[]; spinPurchases: DBSpinPurchase[]; onRefresh: () => void }) {
  const [freeSpinUserId, setFreeSpinUserId] = useState('');
  const [freeSpinAmount, setFreeSpinAmount] = useState(1);
  const [goldUserId, setGoldUserId] = useState('');
  const [goldAmount, setGoldAmount] = useState(100);

  const handleFreeSpins = async () => {
    if (!freeSpinUserId) return;
    const u = users.find(u2 => u2.user_id === freeSpinUserId);
    if (!u) { toast.error('Usuário não encontrado'); return; }
    await supabase.from('profiles').update({ free_spins: (u.free_spins || 0) + freeSpinAmount }).eq('user_id', freeSpinUserId);
    toast.success(`${freeSpinAmount} giros enviados para ${u.username}`);
    onRefresh();
  };

  const handleGiveGold = async () => {
    if (!goldUserId) return;
    const u = users.find(u2 => u2.user_id === goldUserId);
    if (!u) { toast.error('Usuário não encontrado'); return; }
    await supabase.from('profiles').update({ gold: (u.gold || 0) + goldAmount }).eq('user_id', goldUserId);
    toast.success(`${goldAmount}G enviados para ${u.username}`);
    onRefresh();
  };

  const handleConfirmPurchase = async (p: DBSpinPurchase) => {
    await supabase.from('spin_purchases').update({ status: 'confirmed' }).eq('id', p.id);
    const u = users.find(u2 => u2.user_id === p.user_id);
    if (u) {
      await supabase.from('profiles').update({ free_spins: (u.free_spins || 0) + p.spins }).eq('user_id', p.user_id);
    }
    onRefresh(); toast.success('Compra confirmada!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-gold/20 p-5">
        <h3 className="font-heading text-sm text-gold mb-4 flex items-center gap-2"><DollarSign size={16} /> DAR GOLDS</h3>
        <div className="flex gap-3 flex-wrap">
          <select value={goldUserId} onChange={e => setGoldUserId(e.target.value)}
            className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Selecionar usuário</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.username} ({u.game_nick}) - {u.gold || 0}G</option>)}
          </select>
          <input type="number" value={goldAmount} onChange={e => setGoldAmount(Number(e.target.value))} min={1}
            className="w-24 p-3 bg-secondary rounded border border-border text-foreground text-center font-display" placeholder="Gold" />
          <button onClick={handleGiveGold} className="px-4 bg-gradient-to-r from-gold/80 to-gold text-background rounded font-heading text-xs">ENVIAR GOLD</button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-primary/20 p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Dices size={16} /> ENVIAR GIROS GRÁTIS</h3>
        <div className="flex gap-3 flex-wrap">
          <select value={freeSpinUserId} onChange={e => setFreeSpinUserId(e.target.value)}
            className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Selecionar usuário</option>
            {users.map(u => <option key={u.user_id} value={u.user_id}>{u.username} ({u.game_nick})</option>)}
          </select>
          <input type="number" value={freeSpinAmount} onChange={e => setFreeSpinAmount(Number(e.target.value))} min={1}
            className="w-20 p-3 bg-secondary rounded border border-border text-foreground text-center font-display" />
          <button onClick={handleFreeSpins} className="px-4 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground rounded font-heading text-xs">ENVIAR</button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-heading text-sm text-gold">COMPRAS PENDENTES</h3>
        {spinPurchases.filter(p => p.status === 'pending').map(p => {
          const u = users.find(u2 => u2.user_id === p.user_id);
          return (
            <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-display text-foreground text-sm">{u?.username} - R${p.amount}</p>
                <p className="text-xs text-muted-foreground">{p.spins} giros ({p.bonus_spins || 0} bônus) | {p.method}</p>
              </div>
              <button onClick={() => handleConfirmPurchase(p)} className="p-2 text-success hover:bg-success/10 rounded"><Check size={16} /></button>
            </div>
          );
        })}
        {spinPurchases.filter(p => p.status === 'pending').length === 0 && <p className="text-center text-muted-foreground font-display p-4 text-sm">Nenhuma compra pendente</p>}
      </div>
    </div>
  );
}

// ======= RESET GOLDS PANEL (criador) =======
function ResetGoldsPanel({ clans, onRefresh }: { clans: DBClan[]; onRefresh: () => void }) {
  const [clanFilter, setClanFilter] = useState<string>('');
  const [excludeAdmins, setExcludeAdmins] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (confirmText !== 'CONFIRMAR') {
      toast.error('Digite CONFIRMAR para prosseguir');
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('reset_user_golds', {
      _clan_id: clanFilter || null,
      _exclude_admins: excludeAdmins,
    });
    setLoading(false);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    setConfirmText('');
    onRefresh();
    toast.success(`Gold zerado para ${data} jogador(es)`);
  };

  return (
    <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-destructive" />
        <h3 className="font-heading text-sm text-destructive">⚠️ ZERAR GOLD (DESTRUTIVO)</h3>
      </div>
      <p className="text-xs text-muted-foreground font-display">
        Esta ação zera o saldo de Gold dos jogadores selecionados (não afeta saques pendentes).
      </p>

      <div>
        <label className="text-xs text-muted-foreground font-display block mb-1">Filtrar por clã (opcional)</label>
        <select value={clanFilter} onChange={e => setClanFilter(e.target.value)}
          className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
          <option value="">Todos os clãs (e sem clã)</option>
          {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs font-display text-foreground cursor-pointer">
        <input type="checkbox" checked={excludeAdmins} onChange={e => setExcludeAdmins(e.target.checked)} />
        Excluir admins e superadmins (recomendado)
      </label>

      <div>
        <label className="text-xs text-muted-foreground font-display block mb-1">Digite <strong className="text-destructive">CONFIRMAR</strong> para prosseguir</label>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="CONFIRMAR"
          className="w-full p-3 bg-secondary rounded border border-destructive/40 focus:border-destructive outline-none text-foreground font-display text-sm" />
      </div>

      <button
        onClick={handleReset}
        disabled={loading || confirmText !== 'CONFIRMAR'}
        className="w-full px-6 py-3 bg-destructive text-destructive-foreground rounded font-heading text-xs disabled:opacity-50"
      >
        {loading ? 'PROCESSANDO...' : 'ZERAR GOLD AGORA'}
      </button>
    </div>
  );
}
