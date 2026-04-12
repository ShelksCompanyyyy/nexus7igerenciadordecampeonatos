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

export { SHOP_ITEMS, NICK_COLORS, FRAMES, getFrameStyle, getNickColor } from '@/lib/shopData';
export const DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Lendário'];
