// Probabilidades atualizadas (sincronizadas com a RPC spin_roulette no servidor).
// O frontend usa apenas para exibir os prêmios — o resultado real vem do backend.
export const ROULETTE_PRIZES = [
  { gold: 5, probability: 0.2431, label: '5G' },
  { gold: 10, probability: 0.2083, label: '10G' },
  { gold: 15, probability: 0.1736, label: '15G' },
  { gold: 20, probability: 0.1389, label: '20G' },
  { gold: 25, probability: 0.1042, label: '25G' },
  { gold: 50, probability: 0.0694, label: '50G' },
  { gold: 100, probability: 0.0347, label: '100G' },
  { gold: 150, probability: 0.0208, label: '150G' },
  { gold: 200, probability: 0.0069, label: '200G' },
];

export const SPIN_PACKAGES = [
  { price: 3.5, spins: 1, bonus: 0, label: 'R$3,50 - 1 Giro', extras: '' },
  { price: 6.5, spins: 2, bonus: 0, label: 'R$6,50 - 2 Giros', extras: '' },
  { price: 10.5, spins: 3, bonus: 2, label: 'R$10,50 - 3 Giros + 2 Bônus', extras: '+ 3 MachCW' },
  { price: 19.9, spins: 4, bonus: 3, label: 'R$19,90 - 4 Giros + 3 Bônus', extras: '+ 5 MachCW' },
  { price: 25, spins: 5, bonus: 4, label: 'R$25,00 - 5 Giros + 4 Bônus', extras: '+ Letra Colorida' },
  { price: 50, spins: 10, bonus: 2, label: 'R$50,00 - 10 Giros + 2 Bônus', extras: '+ Letra Colorida (raro) + Moldura Premium' },
];

export const PIX_KEY = '6d16f765-9587-494c-9f4b-4c12941c716d';
export const MIN_WITHDRAWAL = 500;

export { SHOP_ITEMS, NICK_COLORS, FRAMES, getFrameStyle, getNickColor } from '@/lib/shopData';
export const DIVISIONS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Mestre', 'Lendário'];
