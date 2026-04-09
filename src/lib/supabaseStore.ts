// Supabase-based data layer replacing localStorage
import { supabase } from '@/integrations/supabase/client';

// ========== TYPE TRANSFORMERS ==========
// Transform snake_case DB rows to camelCase app types

export interface Profile {
  id: string;
  userId: string;
  uniqueId: string;
  username: string;
  email: string;
  gameNick: string;
  whatsapp: string;
  avatar?: string;
  gold: number;
  freeSpins: number;
  clanId?: string;
  teamId?: string;
  badges: string[];
  coloredNick: boolean;
  nickColorId?: string;
  frameId?: string;
  kills: number;
  deaths: number;
  assists: number;
  mvps: number;
  matchesPlayed: number;
  createdAt: string;
  role?: string; // loaded separately from user_roles
}

export interface SbTeam {
  id: string;
  name: string;
  logo?: string;
  clanId: string;
  players: string[];
  wins: number;
  losses: number;
}

export interface SbMatch {
  id: string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  scoreA: number;
  scoreB: number;
  status: string;
  clanId: string;
  playerStats: Record<string, any>;
}

export interface SbTraining {
  id: string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  clanId: string;
  scoreA: number;
  scoreB: number;
  status: string;
  playerStats: Record<string, any>;
}

export interface SbNewsItem {
  id: string;
  title: string;
  content: string;
  clanId: string;
  authorId: string;
  createdAt: string;
  image?: string;
}

export interface SbChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface SbWithdrawal {
  id: string;
  userId: string;
  amount: number;
  gameNick: string;
  username: string;
  email: string;
  whatsapp: string;
  pixKey: string;
  status: string;
  createdAt: string;
  userUniqueId: string;
}

export interface SbSpinPurchase {
  id: string;
  userId: string;
  amount: number;
  spins: number;
  bonusSpins: number;
  method: string;
  status: string;
  createdAt: string;
}

export interface SbClan {
  id: string;
  name: string;
  logo?: string;
  banner?: string;
  description: string;
  ownerId: string;
  wins: number;
  losses: number;
  createdAt: string;
  adminCode?: string;
}

export interface SbTransfer {
  id: string;
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  date: string;
  clanId: string;
}

export interface SbNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ========== ROW TRANSFORMERS ==========
function toProfile(row: any): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    uniqueId: row.unique_id,
    username: row.username,
    email: row.email,
    gameNick: row.game_nick,
    whatsapp: row.whatsapp || '',
    avatar: row.avatar || undefined,
    gold: row.gold || 0,
    freeSpins: row.free_spins || 0,
    clanId: row.clan_id || undefined,
    teamId: row.team_id || undefined,
    badges: row.badges || [],
    coloredNick: row.colored_nick || false,
    nickColorId: row.nick_color_id || undefined,
    frameId: row.frame_id || undefined,
    kills: row.kills || 0,
    deaths: row.deaths || 0,
    assists: row.assists || 0,
    mvps: row.mvps || 0,
    matchesPlayed: row.matches_played || 0,
    createdAt: row.created_at,
  };
}

function toTeam(row: any): SbTeam {
  return { id: row.id, name: row.name, logo: row.logo || undefined, clanId: row.clan_id, players: row.players || [], wins: row.wins || 0, losses: row.losses || 0 };
}

function toMatch(row: any): SbMatch {
  return { id: row.id, teamAId: row.team_a_id || '', teamBId: row.team_b_id || '', date: row.match_date, time: row.match_time || '', scoreA: row.score_a || 0, scoreB: row.score_b || 0, status: row.status || 'upcoming', clanId: row.clan_id, playerStats: (row.player_stats as Record<string, any>) || {} };
}

function toTraining(row: any): SbTraining {
  return { id: row.id, teamAId: row.team_a_id || '', teamBId: row.team_b_id || '', date: row.training_date, time: row.training_time || '', clanId: row.clan_id, scoreA: row.score_a || 0, scoreB: row.score_b || 0, status: row.status || 'scheduled', playerStats: (row.player_stats as Record<string, any>) || {} };
}

function toNews(row: any): SbNewsItem {
  return { id: row.id, title: row.title, content: row.content, clanId: row.clan_id || '', authorId: row.author_id || '', createdAt: row.created_at, image: row.image || undefined };
}

function toChatMessage(row: any): SbChatMessage {
  return { id: row.id, userId: row.user_id, username: row.username, message: row.message, timestamp: row.created_at };
}

function toWithdrawal(row: any): SbWithdrawal {
  return { id: row.id, userId: row.user_id, amount: row.amount, gameNick: row.game_nick, username: row.username, email: row.email, whatsapp: row.whatsapp || '', pixKey: row.pix_key, status: row.status || 'pending', createdAt: row.created_at, userUniqueId: row.user_unique_id };
}

function toSpinPurchase(row: any): SbSpinPurchase {
  return { id: row.id, userId: row.user_id, amount: row.amount, spins: row.spins, bonusSpins: row.bonus_spins || 0, method: row.method || 'pix', status: row.status || 'pending', createdAt: row.created_at };
}

function toClan(row: any): SbClan {
  return { id: row.id, name: row.name, logo: row.logo || undefined, banner: row.banner || undefined, description: row.description || '', ownerId: row.owner_id || '', wins: row.wins || 0, losses: row.losses || 0, createdAt: row.created_at, adminCode: row.admin_code || undefined };
}

function toTransfer(row: any): SbTransfer {
  return { id: row.id, playerId: row.player_id, fromTeamId: row.from_team_id || '', toTeamId: row.to_team_id || '', date: row.transfer_date, clanId: row.clan_id };
}

function toNotification(row: any): SbNotification {
  return { id: row.id, userId: row.user_id, type: row.type || 'system', title: row.title, message: row.message, read: row.read || false, createdAt: row.created_at };
}

// ========== PROFILES ==========
export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*');
  if (!data) return [];
  // Fetch roles
  const { data: roles } = await supabase.from('user_roles').select('*');
  const roleMap = new Map<string, string>();
  roles?.forEach(r => roleMap.set(r.user_id, r.role));
  return data.map(row => ({ ...toProfile(row), role: roleMap.get(row.user_id) || 'user' }));
}

export async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', userId);
  const role = roles?.[0]?.role || 'user';
  return { ...toProfile(data), role };
}

export async function updateProfile(profileId: string, updates: Partial<{
  username: string; gameNick: string; whatsapp: string; avatar: string;
  gold: number; freeSpins: number; clanId: string; teamId: string;
  badges: string[]; coloredNick: boolean; nickColorId: string; frameId: string;
  kills: number; deaths: number; assists: number; mvps: number; matchesPlayed: number;
}>) {
  const dbUpdates: any = {};
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.gameNick !== undefined) dbUpdates.game_nick = updates.gameNick;
  if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.gold !== undefined) dbUpdates.gold = updates.gold;
  if (updates.freeSpins !== undefined) dbUpdates.free_spins = updates.freeSpins;
  if (updates.clanId !== undefined) dbUpdates.clan_id = updates.clanId || null;
  if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId || null;
  if (updates.badges !== undefined) dbUpdates.badges = updates.badges;
  if (updates.coloredNick !== undefined) dbUpdates.colored_nick = updates.coloredNick;
  if (updates.nickColorId !== undefined) dbUpdates.nick_color_id = updates.nickColorId;
  if (updates.frameId !== undefined) dbUpdates.frame_id = updates.frameId;
  if (updates.kills !== undefined) dbUpdates.kills = updates.kills;
  if (updates.deaths !== undefined) dbUpdates.deaths = updates.deaths;
  if (updates.assists !== undefined) dbUpdates.assists = updates.assists;
  if (updates.mvps !== undefined) dbUpdates.mvps = updates.mvps;
  if (updates.matchesPlayed !== undefined) dbUpdates.matches_played = updates.matchesPlayed;
  
  await supabase.from('profiles').update(dbUpdates).eq('id', profileId);
}

export async function updateProfileByUserId(userId: string, updates: Parameters<typeof updateProfile>[1]) {
  const profile = await fetchProfileByUserId(userId);
  if (profile) await updateProfile(profile.id, updates);
}

export async function deleteProfile(profileId: string) {
  await supabase.from('profiles').delete().eq('id', profileId);
}

// ========== TEAMS ==========
export async function fetchTeams(): Promise<SbTeam[]> {
  const { data } = await supabase.from('teams').select('*');
  return (data || []).map(toTeam);
}

export async function addTeam(team: Omit<SbTeam, 'id'>): Promise<SbTeam | null> {
  const { data } = await supabase.from('teams').insert({
    name: team.name, logo: team.logo || null, clan_id: team.clanId, players: team.players, wins: team.wins, losses: team.losses,
  }).select().single();
  return data ? toTeam(data) : null;
}

export async function updateTeam(id: string, updates: Partial<SbTeam>) {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
  if (updates.players !== undefined) dbUpdates.players = updates.players;
  if (updates.wins !== undefined) dbUpdates.wins = updates.wins;
  if (updates.losses !== undefined) dbUpdates.losses = updates.losses;
  await supabase.from('teams').update(dbUpdates).eq('id', id);
}

export async function deleteTeam(id: string) {
  await supabase.from('teams').delete().eq('id', id);
}

// ========== MATCHES ==========
export async function fetchMatches(): Promise<SbMatch[]> {
  const { data } = await supabase.from('matches').select('*');
  return (data || []).map(toMatch);
}

export async function addMatch(match: Omit<SbMatch, 'id'>): Promise<SbMatch | null> {
  const { data } = await supabase.from('matches').insert({
    team_a_id: match.teamAId, team_b_id: match.teamBId, match_date: match.date, match_time: match.time,
    score_a: match.scoreA, score_b: match.scoreB, status: match.status, clan_id: match.clanId, player_stats: match.playerStats,
  }).select().single();
  return data ? toMatch(data) : null;
}

export async function updateMatch(id: string, updates: Partial<SbMatch>) {
  const dbUpdates: any = {};
  if (updates.scoreA !== undefined) dbUpdates.score_a = updates.scoreA;
  if (updates.scoreB !== undefined) dbUpdates.score_b = updates.scoreB;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.playerStats !== undefined) dbUpdates.player_stats = updates.playerStats;
  await supabase.from('matches').update(dbUpdates).eq('id', id);
}

// ========== TRAININGS ==========
export async function fetchTrainings(): Promise<SbTraining[]> {
  const { data } = await supabase.from('trainings').select('*');
  return (data || []).map(toTraining);
}

export async function addTraining(t: Omit<SbTraining, 'id'>): Promise<SbTraining | null> {
  const { data } = await supabase.from('trainings').insert({
    team_a_id: t.teamAId, team_b_id: t.teamBId, training_date: t.date, training_time: t.time,
    clan_id: t.clanId, score_a: t.scoreA, score_b: t.scoreB, status: t.status, player_stats: t.playerStats,
  }).select().single();
  return data ? toTraining(data) : null;
}

export async function updateTraining(id: string, updates: Partial<SbTraining>) {
  const dbUpdates: any = {};
  if (updates.scoreA !== undefined) dbUpdates.score_a = updates.scoreA;
  if (updates.scoreB !== undefined) dbUpdates.score_b = updates.scoreB;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.playerStats !== undefined) dbUpdates.player_stats = updates.playerStats;
  await supabase.from('trainings').update(dbUpdates).eq('id', id);
}

// ========== NEWS ==========
export async function fetchNews(): Promise<SbNewsItem[]> {
  const { data } = await supabase.from('news').select('*');
  return (data || []).map(toNews);
}

export async function addNews(item: Omit<SbNewsItem, 'id'>): Promise<SbNewsItem | null> {
  const { data } = await supabase.from('news').insert({
    title: item.title, content: item.content, clan_id: item.clanId || null, author_id: item.authorId || null, image: item.image || null,
  }).select().single();
  return data ? toNews(data) : null;
}

export async function deleteNews(id: string) {
  await supabase.from('news').delete().eq('id', id);
}

// ========== CHAT ==========
export async function fetchChatMessages(): Promise<SbChatMessage[]> {
  const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200);
  return (data || []).map(toChatMessage);
}

export async function addChatMessage(msg: { userId: string; username: string; message: string }) {
  await supabase.from('chat_messages').insert({ user_id: msg.userId, username: msg.username, message: msg.message });
}

export async function clearChatMessages() {
  // Only superadmin can delete via RLS
  const { data } = await supabase.from('chat_messages').select('id');
  if (data) {
    for (const row of data) {
      await supabase.from('chat_messages').delete().eq('id', row.id);
    }
  }
}

// ========== WITHDRAWALS ==========
export async function fetchWithdrawals(): Promise<SbWithdrawal[]> {
  const { data } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false });
  return (data || []).map(toWithdrawal);
}

export async function addWithdrawal(w: Omit<SbWithdrawal, 'id' | 'createdAt' | 'status'>) {
  await supabase.from('withdrawals').insert({
    user_id: w.userId, amount: w.amount, game_nick: w.gameNick, username: w.username,
    email: w.email, whatsapp: w.whatsapp, pix_key: w.pixKey, user_unique_id: w.userUniqueId, status: 'pending',
  });
}

export async function updateWithdrawal(id: string, updates: { status?: string }) {
  if (updates.status) await supabase.from('withdrawals').update({ status: updates.status }).eq('id', id);
}

// ========== SPIN PURCHASES ==========
export async function fetchSpinPurchases(): Promise<SbSpinPurchase[]> {
  const { data } = await supabase.from('spin_purchases').select('*').order('created_at', { ascending: false });
  return (data || []).map(toSpinPurchase);
}

export async function addSpinPurchase(p: { userId: string; amount: number; spins: number; bonusSpins: number; method: string }) {
  await supabase.from('spin_purchases').insert({
    user_id: p.userId, amount: p.amount, spins: p.spins, bonus_spins: p.bonusSpins, method: p.method, status: 'pending',
  });
}

export async function updateSpinPurchase(id: string, updates: { status?: string }) {
  if (updates.status) await supabase.from('spin_purchases').update({ status: updates.status }).eq('id', id);
}

// ========== CLANS ==========
export async function fetchClans(): Promise<SbClan[]> {
  const { data } = await supabase.from('clans').select('*');
  return (data || []).map(toClan);
}

export async function fetchClanById(id: string): Promise<SbClan | null> {
  const { data } = await supabase.from('clans').select('*').eq('id', id).maybeSingle();
  return data ? toClan(data) : null;
}

export async function addClan(clan: { name: string; description: string; ownerId: string; adminCode?: string }): Promise<SbClan | null> {
  const { data } = await supabase.from('clans').insert({
    name: clan.name, description: clan.description, owner_id: clan.ownerId, admin_code: clan.adminCode || null,
  }).select().single();
  return data ? toClan(data) : null;
}

export async function updateClan(id: string, updates: Partial<SbClan>) {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.adminCode !== undefined) dbUpdates.admin_code = updates.adminCode;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
  if (updates.banner !== undefined) dbUpdates.banner = updates.banner;
  if (updates.wins !== undefined) dbUpdates.wins = updates.wins;
  if (updates.losses !== undefined) dbUpdates.losses = updates.losses;
  await supabase.from('clans').update(dbUpdates).eq('id', id);
}

export async function deleteClan(id: string) {
  await supabase.from('clans').delete().eq('id', id);
}

// ========== TRANSFERS ==========
export async function fetchTransfers(): Promise<SbTransfer[]> {
  const { data } = await supabase.from('transfers').select('*');
  return (data || []).map(toTransfer);
}

export async function addTransfer(t: { playerId: string; fromTeamId: string; toTeamId: string; date: string; clanId: string }) {
  await supabase.from('transfers').insert({
    player_id: t.playerId, from_team_id: t.fromTeamId, to_team_id: t.toTeamId, transfer_date: t.date, clan_id: t.clanId,
  });
}

// ========== NOTIFICATIONS ==========
export async function fetchNotifications(userId: string): Promise<SbNotification[]> {
  const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return (data || []).map(toNotification);
}

export async function addNotification(n: { userId: string; type: string; title: string; message: string }) {
  await supabase.from('notifications').insert({
    user_id: n.userId, type: n.type, title: n.title, message: n.message, read: false,
  });
}

export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
}

export async function clearNotifications(userId: string) {
  await supabase.from('notifications').delete().eq('user_id', userId);
}

// ========== USER ROLES ==========
export async function updateUserRole(userId: string, role: 'user' | 'admin' | 'superadmin') {
  // Check if role exists
  const { data } = await supabase.from('user_roles').select('*').eq('user_id', userId).maybeSingle();
  if (data) {
    await supabase.from('user_roles').update({ role }).eq('user_id', userId);
  } else {
    await supabase.from('user_roles').insert({ user_id: userId, role });
  }
}

// ========== ROULETTE (kept client-side) ==========
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

export const DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Lendário'];

// Re-export shop data
export { SHOP_ITEMS, NICK_COLORS, FRAMES, getFrameStyle, getNickColor } from '@/lib/shopData';
