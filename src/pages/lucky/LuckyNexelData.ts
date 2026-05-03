// Categorias visuais Lucky Nexel — sincronizadas com lucky_rewards.code no servidor.
// O resultado real vem do RPC lucky_nexel_spin; aqui só usamos para renderizar a esteira.

export type LuckyRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface LuckyTile {
  code: string;
  label: string;
  short: string;
  rarity: LuckyRarity;
  emoji: string;
}

// Tiles alinhados aos códigos retornados pelo RPC `lucky_nexel_spin`.
export const LUCKY_TILES: LuckyTile[] = [
  { code: 'gold_main',     label: 'NexelGolds',       short: 'Gold',     rarity: 'common',    emoji: '🪙' },
  { code: 'boost_main',    label: 'Boost 2x (24h)',   short: 'Boost 2x', rarity: 'uncommon',  emoji: '⚡' },
  { code: 'visual_main',   label: 'Item Visual',      short: 'Visual',   rarity: 'rare',      emoji: '🎨' },
  { code: 'vip_1d',        label: 'VIP 1 Dia',        short: 'VIP 1d',   rarity: 'common',    emoji: '👑' },
  { code: 'vip_5d',        label: 'VIP 5 Dias',       short: 'VIP 5d',   rarity: 'uncommon',  emoji: '👑' },
  { code: 'vip_10d',       label: 'VIP 10 Dias',      short: 'VIP 10d',  rarity: 'rare',      emoji: '👑' },
  { code: 'ticket_cw',     label: 'Ticket MatchCW',   short: 'Ticket',   rarity: 'rare',      emoji: '🎟️' },
  { code: 'box_rare',      label: 'Caixa Rara',       short: 'Caixa R',  rarity: 'rare',      emoji: '📦' },
  { code: 'box_epic',      label: 'Caixa Épica',      short: 'Caixa E',  rarity: 'epic',      emoji: '🎁' },
  { code: 'box_legendary', label: 'Caixa Lendária',   short: 'Caixa L',  rarity: 'legendary', emoji: '🏆' },
  { code: 'pix_main',      label: 'PIX na Carteira',  short: 'PIX',      rarity: 'mythic',    emoji: '💸' },
];

export const RARITY_STYLES: Record<LuckyRarity, { bg: string; border: string; glow: string; text: string }> = {
  common:    { bg: 'bg-zinc-800',                border: 'border-zinc-600',    glow: '',                                text: 'text-zinc-200' },
  uncommon:  { bg: 'bg-emerald-900/60',          border: 'border-emerald-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.45)]', text: 'text-emerald-200' },
  rare:      { bg: 'bg-sky-900/70',              border: 'border-sky-400',     glow: 'shadow-[0_0_14px_rgba(56,189,248,0.55)]', text: 'text-sky-100' },
  epic:      { bg: 'bg-fuchsia-900/70',          border: 'border-fuchsia-400', glow: 'shadow-[0_0_18px_rgba(217,70,239,0.65)]', text: 'text-fuchsia-100' },
  legendary: { bg: 'bg-amber-900/70',            border: 'border-amber-400',   glow: 'shadow-[0_0_22px_rgba(251,191,36,0.7)]',  text: 'text-amber-100' },
  mythic:    { bg: 'bg-gradient-to-br from-rose-700 to-fuchsia-700', border: 'border-rose-300', glow: 'shadow-[0_0_28px_rgba(244,63,94,0.85)]', text: 'text-rose-50' },
};

export const LUCKY_PACKAGES = [
  { id: 'pkg_3',  amount: 3.9,  spins: 3,  bonus: 0, label: '3 giros',         tag: 'Iniciar' },
  { id: 'pkg_5',  amount: 5.9,  spins: 5,  bonus: 0, label: '5 giros',         tag: '' },
  { id: 'pkg_8',  amount: 10.9, spins: 8,  bonus: 2, label: '8 + 2 bônus',     tag: '+2 bônus' },
  { id: 'pkg_9',  amount: 15.9, spins: 9,  bonus: 3, label: '9 + 3 bônus',     tag: '+3 bônus' },
  { id: 'pkg_10', amount: 23.9, spins: 10, bonus: 4, label: '10 + 4 bônus',    tag: 'Popular' },
  { id: 'pkg_15', amount: 32.9, spins: 15, bonus: 5, label: '15 + 5 bônus',    tag: 'Melhor valor' },
];

export const TILE_W = 92;

export function tileFromCode(code?: string | null): LuckyTile {
  return LUCKY_TILES.find(t => t.code === code) || LUCKY_TILES[0];
}

export function buildStrip(winnerCode: string, length = 70): { items: LuckyTile[]; winIndex: number } {
  const items: LuckyTile[] = [];
  for (let i = 0; i < length; i++) {
    items.push(LUCKY_TILES[Math.floor(Math.random() * LUCKY_TILES.length)]);
  }
  const winIndex = length - 8;
  items[winIndex] = tileFromCode(winnerCode);
  return { items, winIndex };
}