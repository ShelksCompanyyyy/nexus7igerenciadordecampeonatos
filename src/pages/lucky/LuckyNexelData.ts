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

// Pool visual da esteira (não é a probabilidade real — só visual).
export const LUCKY_TILES: LuckyTile[] = [
  { code: 'gold_5',       label: '5 NexelGolds',     short: '5G',       rarity: 'common',    emoji: '🪙' },
  { code: 'gold_10',      label: '10 NexelGolds',    short: '10G',      rarity: 'common',    emoji: '🪙' },
  { code: 'gold_25',      label: '25 NexelGolds',    short: '25G',      rarity: 'uncommon',  emoji: '🪙' },
  { code: 'gold_50',      label: '50 NexelGolds',    short: '50G',      rarity: 'uncommon',  emoji: '💰' },
  { code: 'gold_100',     label: '100 NexelGolds',   short: '100G',     rarity: 'rare',      emoji: '💰' },
  { code: 'gold_200',     label: '200 NexelGolds',   short: '200G',     rarity: 'epic',      emoji: '💎' },
  { code: 'boost_2x',     label: 'Boost 2x (24h)',   short: '2x',       rarity: 'rare',      emoji: '⚡' },
  { code: 'item_color',   label: 'Cor de Nick',      short: 'Cor',      rarity: 'rare',      emoji: '🎨' },
  { code: 'item_frame',   label: 'Moldura',          short: 'Frame',    rarity: 'epic',      emoji: '🖼️' },
  { code: 'vip_3d',       label: 'VIP 3 dias',       short: 'VIP3',     rarity: 'epic',      emoji: '👑' },
  { code: 'vip_7d',       label: 'VIP 7 dias',       short: 'VIP7',     rarity: 'legendary', emoji: '👑' },
  { code: 'matchcw_tk',   label: 'Ticket MatchCW',   short: 'CW',       rarity: 'rare',      emoji: '🎟️' },
  { code: 'box_rare',     label: 'Caixa Rara',       short: '📦R',      rarity: 'rare',      emoji: '📦' },
  { code: 'box_epic',     label: 'Caixa Épica',      short: '📦E',      rarity: 'epic',      emoji: '🎁' },
  { code: 'box_legend',   label: 'Caixa Lendária',   short: '📦L',      rarity: 'legendary', emoji: '🏆' },
  { code: 'pix_1',        label: 'R$ 1,00',          short: 'R$1',      rarity: 'rare',      emoji: '💵' },
  { code: 'pix_2',        label: 'R$ 2,00',          short: 'R$2',      rarity: 'epic',      emoji: '💵' },
  { code: 'pix_5',        label: 'R$ 5,00',          short: 'R$5',      rarity: 'legendary', emoji: '💸' },
  { code: 'pix_10',       label: 'R$ 10,00',         short: 'R$10',     rarity: 'mythic',    emoji: '🤑' },
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

export const TILE_W = 112;

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