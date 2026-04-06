// Nexus7i E-Sports Data Store (localStorage based)

// Generate simple unique IDs
const genId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Generate numeric unique ID (6 digits)
let _uidCounter = parseInt(localStorage.getItem('nexus7i_uidCounter') || '100000', 10);
export function genNumericId(): string {
  _uidCounter++;
  localStorage.setItem('nexus7i_uidCounter', String(_uidCounter));
  return String(_uidCounter);
}

export interface User {
  id: string;
  uniqueId: string;
  username: string;
  email: string;
  password: string;
  gameNick: string;
  whatsapp: string;
  avatar?: string;
  gold: number;
  freeSpins: number;
  role: 'user' | 'admin' | 'superadmin';
  clanId?: string;
  teamId?: string;
  createdAt: string;
  badges: string[];
  coloredNick: boolean;
  nickColorId?: string;
  frameId?: string;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  matchesPlayed: number;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  clanId: string;
  players: string[]; // user IDs
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  scoreA: number;
  scoreB: number;
  status: 'upcoming' | 'live' | 'completed';
  clanId: string;
  playerStats: Record<string, { kills: number; deaths: number; assists: number; mvp: boolean }>;
}

export interface Training {
  id: string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  clanId: string;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'completed';
  playerStats: Record<string, { kills: number; deaths: number; assists: number; mvp: boolean }>;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  clanId: string;
  authorId: string;
  createdAt: string;
  image?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  gameNick: string;
  username: string;
  email: string;
  whatsapp: string;
  pixKey: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  userUniqueId: string;
}

export interface SpinPurchase {
  id: string;
  userId: string;
  amount: number;
  spins: number;
  bonusSpins: number;
  method: 'pix' | 'stripe';
  status: 'pending' | 'confirmed';
  createdAt: string;
}

export interface Clan {
  id: string;
  name: string;
  logo?: string;
  banner?: string;
  description: string;
  ownerId: string;
  division: string;
  wins: number;
  losses: number;
  createdAt: string;
  adminCode?: string;
}

export interface Transfer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  date: string;
  clanId: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  clanId: string;
  status: 'paid' | 'unpaid';
  date: string;
  championship?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'withdrawal' | 'news' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Helper functions for localStorage
function getData<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(`nexus7i_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setData<T>(key: string, data: T[]) {
  localStorage.setItem(`nexus7i_${key}`, JSON.stringify(data));
}

function getSingle<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`nexus7i_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setSingle<T>(key: string, data: T) {
  localStorage.setItem(`nexus7i_${key}`, JSON.stringify(data));
}

// ========== USERS ==========
export function getUsers(): User[] { return getData<User>('users', []); }
export function saveUsers(users: User[]) { setData('users', users); }
export function getUserById(id: string) { return getUsers().find(u => u.id === id); }

export function registerUser(data: { username: string; email: string; password: string; gameNick: string; whatsapp: string }): User {
  const users = getUsers();
  if (users.find(u => u.email === data.email)) throw new Error('Email já cadastrado');
  if (users.find(u => u.username === data.username)) throw new Error('Username já existe');
  const user: User = {
    id: genId(),
    uniqueId: genNumericId(),
    ...data,
    gold: 0,
    freeSpins: 0,
    role: 'user',
    createdAt: new Date().toISOString(),
    badges: [],
    coloredNick: false,
    kills: 0, deaths: 0, assists: 0, mvps: 0, matchesPlayed: 0,
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function loginUser(email: string, password: string): User | null {
  // Super admin check
  if (email === 'Nexus7i@gmail.com' && password === 'Nexus7i007') {
    const users = getUsers();
    let admin = users.find(u => u.role === 'superadmin');
    if (!admin) {
      admin = {
        id: 'superadmin',
        uniqueId: '000001',
        username: 'SuperAdmin',
        email: 'Nexus7i@gmail.com',
        password: 'Nexus7i007',
        gameNick: 'NEXUS7i_ADMIN',
        whatsapp: '',
        gold: 999999,
        freeSpins: 999,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        badges: ['superadmin', 'founder'],
        coloredNick: true,
        kills: 0, deaths: 0, assists: 0, mvps: 0, matchesPlayed: 0,
      };
      users.push(admin);
      saveUsers(users);
    }
    return admin;
  }
  const user = getUsers().find(u => u.email === email && u.password === password);
  return user || null;
}

export function updateUser(id: string, updates: Partial<User>) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function deleteUser(id: string) {
  saveUsers(getUsers().filter(u => u.id !== id));
}

// ========== CURRENT USER ==========
export function getCurrentUser(): User | null { return getSingle<User | null>('currentUser', null); }
export function setCurrentUser(user: User | null) { setSingle('currentUser', user); }
export function isAdmin(): boolean {
  const u = getCurrentUser();
  return u?.role === 'admin' || u?.role === 'superadmin';
}
export function isSuperAdmin(): boolean {
  return getCurrentUser()?.role === 'superadmin';
}

// ========== TEAMS ==========
export function getTeams(): Team[] { return getData<Team>('teams', []); }
export function saveTeams(teams: Team[]) { setData('teams', teams); }
export function addTeam(team: Omit<Team, 'id'>) {
  const teams = getTeams();
  const newTeam = { ...team, id: genId() };
  teams.push(newTeam);
  saveTeams(teams);
  return newTeam;
}
export function updateTeam(id: string, updates: Partial<Team>) {
  const teams = getTeams();
  const idx = teams.findIndex(t => t.id === id);
  if (idx !== -1) { teams[idx] = { ...teams[idx], ...updates }; saveTeams(teams); }
}
export function deleteTeam(id: string) { saveTeams(getTeams().filter(t => t.id !== id)); }

// ========== MATCHES ==========
export function getMatches(): Match[] { return getData<Match>('matches', []); }
export function saveMatches(matches: Match[]) { setData('matches', matches); }
export function addMatch(match: Omit<Match, 'id'>) {
  const matches = getMatches();
  const m = { ...match, id: genId() };
  matches.push(m);
  saveMatches(matches);
  return m;
}
export function updateMatch(id: string, updates: Partial<Match>) {
  const ms = getMatches();
  const idx = ms.findIndex(m => m.id === id);
  if (idx !== -1) { ms[idx] = { ...ms[idx], ...updates }; saveMatches(ms); }
}

// ========== TRAININGS ==========
export function getTrainings(): Training[] { return getData<Training>('trainings', []); }
export function saveTrainings(data: Training[]) { setData('trainings', data); }
export function addTraining(t: Omit<Training, 'id'>) {
  const all = getTrainings();
  const newT = { ...t, id: genId() };
  all.push(newT);
  saveTrainings(all);
  return newT;
}
export function updateTraining(id: string, updates: Partial<Training>) {
  const all = getTrainings();
  const idx = all.findIndex(t => t.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; saveTrainings(all); }
}

// ========== NEWS ==========
export function getNews(): NewsItem[] { return getData<NewsItem>('news', []); }
export function saveNews(data: NewsItem[]) { setData('news', data); }
export function addNews(item: Omit<NewsItem, 'id'>) {
  const all = getNews();
  const n = { ...item, id: genId() };
  all.push(n);
  saveNews(all);
  return n;
}
export function deleteNews(id: string) { saveNews(getNews().filter(n => n.id !== id)); }

// ========== CHAT ==========
export function getChatMessages(): ChatMessage[] { return getData<ChatMessage>('chat', []); }
export function addChatMessage(msg: Omit<ChatMessage, 'id'>) {
  const all = getChatMessages();
  all.push({ ...msg, id: genId() });
  if (all.length > 200) all.splice(0, all.length - 200);
  setData('chat', all);
}
export function clearChatMessages() { setData('chat', []); }

// ========== WITHDRAWALS ==========
export function getWithdrawals(): Withdrawal[] { return getData<Withdrawal>('withdrawals', []); }
export function addWithdrawal(w: Omit<Withdrawal, 'id'>) {
  const all = getWithdrawals();
  const nw = { ...w, id: genId() };
  all.push(nw);
  setData('withdrawals', all);
  return nw;
}
export function updateWithdrawal(id: string, updates: Partial<Withdrawal>) {
  const all = getWithdrawals();
  const idx = all.findIndex(w => w.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; setData('withdrawals', all); }
}

// ========== SPIN PURCHASES ==========
export function getSpinPurchases(): SpinPurchase[] { return getData<SpinPurchase>('spinPurchases', []); }
export function addSpinPurchase(p: Omit<SpinPurchase, 'id'>) {
  const all = getSpinPurchases();
  const np = { ...p, id: genId() };
  all.push(np);
  setData('spinPurchases', all);
  return np;
}
export function updateSpinPurchase(id: string, updates: Partial<SpinPurchase>) {
  const all = getSpinPurchases();
  const idx = all.findIndex(p => p.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; setData('spinPurchases', all); }
}

// ========== CLANS ==========
export function getClans(): Clan[] { return getData<Clan>('clans', []); }
export function saveClans(clans: Clan[]) { setData('clans', clans); }
export function getClanById(id: string) { return getClans().find(c => c.id === id); }
export function addClan(clan: Omit<Clan, 'id'>) {
  const all = getClans();
  const c = { ...clan, id: genId() };
  all.push(c);
  saveClans(all);
  return c;
}
export function updateClan(id: string, updates: Partial<Clan>) {
  const all = getClans();
  const idx = all.findIndex(c => c.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; saveClans(all); }
}
export function deleteClan(id: string) { saveClans(getClans().filter(c => c.id !== id)); }

// ========== TRANSFERS ==========
export function getTransfers(): Transfer[] { return getData<Transfer>('transfers', []); }
export function addTransfer(t: Omit<Transfer, 'id'>) {
  const all = getTransfers();
  all.push({ ...t, id: genId() });
  setData('transfers', all);
}

// ========== PAYMENTS ==========
export function getPayments(): PaymentRecord[] { return getData<PaymentRecord>('payments', []); }
export function savePayments(data: PaymentRecord[]) { setData('payments', data); }
export function addPayment(p: Omit<PaymentRecord, 'id'>) {
  const all = getPayments();
  const np = { ...p, id: genId() };
  all.push(np);
  savePayments(all);
  return np;
}
export function updatePayment(id: string, updates: Partial<PaymentRecord>) {
  const all = getPayments();
  const idx = all.findIndex(p => p.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], ...updates }; savePayments(all); }
}

// ========== ROULETTE ==========
export const ROULETTE_PRIZES = [
  { gold: 5, probability: 0.52, label: '5G' },
  { gold: 10, probability: 0.20, label: '10G' },
  { gold: 15, probability: 0.10, label: '15G' },
  { gold: 20, probability: 0.08, label: '20G' },
  { gold: 100, probability: 0.05, label: '100G' },
  { gold: 250, probability: 0.03, label: '250G' },
  { gold: 500, probability: 0.02, label: '500G' },
];

export const SPIN_PACKAGES = [
  { price: 10, spins: 1, bonus: 0, label: 'R$10 - 1 Rodada' },
  { price: 15, spins: 2, bonus: 0, label: 'R$15 - 2 Rodadas' },
  { price: 20, spins: 3, bonus: 2, label: 'R$20 - 3 Rodadas + 2 Bônus' },
  { price: 25, spins: 4, bonus: 3, label: 'R$25 - 4 Rodadas + 3 Bônus' },
];

export const PIX_KEY = '6d16f765-9587-494c-9f4b-4c12941c716d';
export const MIN_WITHDRAWAL = 500;

export function spinRoulette(): number {
  const r = Math.random();
  let cumulative = 0;
  for (const prize of ROULETTE_PRIZES) {
    cumulative += prize.probability;
    if (r <= cumulative) return prize.gold;
  }
  return ROULETTE_PRIZES[0].gold;
}

// ========== SHOP ==========
// Shop items moved to src/lib/shopData.ts
export { SHOP_ITEMS, NICK_COLORS, FRAMES, getFrameStyle, getNickColor } from '@/lib/shopData';

// ========== DIVISIONS ==========
export const DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Lendário'];
