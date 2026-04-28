// Shop items: frames, colored nicks, badges, spins

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'frame' | 'nick_color' | 'badge' | 'spin';
  preview?: string; // CSS class or color value
}

export const NICK_COLORS: { id: string; name: string; color: string; price: number }[] = [
  { id: 'nick_red', name: 'Nick Vermelho Neon', color: '#FF0040', price: 80 },
  { id: 'nick_blue', name: 'Nick Azul Elétrico', color: '#00BFFF', price: 80 },
  { id: 'nick_green', name: 'Nick Verde Tóxico', color: '#39FF14', price: 80 },
  { id: 'nick_purple', name: 'Nick Roxo Cyber', color: '#BF00FF', price: 100 },
  { id: 'nick_gold', name: 'Nick Dourado', color: '#FFD700', price: 150 },
  { id: 'nick_pink', name: 'Nick Rosa Neon', color: '#FF69B4', price: 80 },
  { id: 'nick_orange', name: 'Nick Laranja Fire', color: '#FF6600', price: 80 },
  { id: 'nick_cyan', name: 'Nick Ciano Ice', color: '#00FFFF', price: 100 },
  { id: 'nick_rainbow', name: 'Nick Arco-Íris', color: 'linear-gradient(90deg,#FF0000,#FF7F00,#FFFF00,#00FF00,#0000FF,#8B00FF)', price: 300 },
  { id: 'nick_white', name: 'Nick Branco Glow', color: '#FFFFFF', price: 60 },
  { id: 'nick_silver', name: 'Nick Prata Cromado', color: '#C0C0C0', price: 120 },
  { id: 'nick_emerald', name: 'Nick Esmeralda', color: '#50C878', price: 110 },
  { id: 'nick_ruby', name: 'Nick Rubi', color: '#E0115F', price: 110 },
  { id: 'nick_sapphire', name: 'Nick Safira', color: '#0F52BA', price: 110 },
  { id: 'nick_galaxy', name: 'Nick Galáxia', color: 'linear-gradient(90deg,#0B0033,#6A00F4,#FF006E,#00C8FF)', price: 350 },
  { id: 'nick_sunset', name: 'Nick Pôr do Sol', color: 'linear-gradient(90deg,#FF512F,#F09819,#FFD700)', price: 250 },
  { id: 'nick_ocean', name: 'Nick Oceano', color: 'linear-gradient(90deg,#00C9FF,#92FE9D)', price: 220 },
  { id: 'nick_blood_grad', name: 'Nick Sangue', color: 'linear-gradient(90deg,#8B0000,#FF0000,#FF4500)', price: 220 },
];

export const FRAMES: { id: string; name: string; price: number; borderStyle: string; glowColor: string }[] = [
  { id: 'frame_fire', name: 'Quadro Fogo', price: 200, borderStyle: '3px solid #FF4500', glowColor: '0 0 12px #FF4500, 0 0 24px #FF4500' },
  { id: 'frame_ice', name: 'Quadro Gelo', price: 200, borderStyle: '3px solid #00BFFF', glowColor: '0 0 12px #00BFFF, 0 0 24px #00BFFF' },
  { id: 'frame_gold', name: 'Quadro Dourado', price: 350, borderStyle: '3px solid #FFD700', glowColor: '0 0 12px #FFD700, 0 0 24px #FFD700, 0 0 48px #FFD700' },
  { id: 'frame_toxic', name: 'Quadro Tóxico', price: 200, borderStyle: '3px solid #39FF14', glowColor: '0 0 12px #39FF14, 0 0 24px #39FF14' },
  { id: 'frame_purple', name: 'Quadro Cyber', price: 250, borderStyle: '3px solid #BF00FF', glowColor: '0 0 12px #BF00FF, 0 0 24px #BF00FF' },
  { id: 'frame_diamond', name: 'Quadro Diamante', price: 500, borderStyle: '3px solid #B9F2FF', glowColor: '0 0 15px #B9F2FF, 0 0 30px #00FFFF, 0 0 60px #B9F2FF' },
  { id: 'frame_rainbow', name: 'Quadro Arco-Íris', price: 600, borderStyle: '3px solid transparent', glowColor: '0 0 12px #FF0000, 0 0 24px #FFFF00, 0 0 36px #00FF00, 0 0 48px #0000FF' },
  { id: 'frame_blood', name: 'Quadro Sangue', price: 250, borderStyle: '3px solid #8B0000', glowColor: '0 0 12px #8B0000, 0 0 24px #FF0000' },
  { id: 'frame_neon_pink', name: 'Quadro Neon Rosa', price: 220, borderStyle: '3px solid #FF1493', glowColor: '0 0 12px #FF1493, 0 0 24px #FF1493' },
  { id: 'frame_void', name: 'Quadro do Vazio', price: 400, borderStyle: '3px solid #4B0082', glowColor: '0 0 14px #4B0082, 0 0 30px #8A2BE2, 0 0 50px #000000' },
  { id: 'frame_silver', name: 'Quadro Prata', price: 280, borderStyle: '3px solid #C0C0C0', glowColor: '0 0 12px #C0C0C0, 0 0 24px #FFFFFF' },
  { id: 'frame_lava', name: 'Quadro Lava', price: 320, borderStyle: '3px solid #FF6600', glowColor: '0 0 14px #FF3300, 0 0 28px #FF6600, 0 0 42px #FFFF00' },
  { id: 'frame_galaxy', name: 'Quadro Galáxia', price: 700, borderStyle: '3px solid #6A00F4', glowColor: '0 0 16px #6A00F4, 0 0 30px #FF006E, 0 0 50px #00C8FF' },
  { id: 'frame_legend', name: 'Quadro Lendário', price: 1000, borderStyle: '4px solid #FFD700', glowColor: '0 0 20px #FFD700, 0 0 40px #FFA500, 0 0 80px #FFD700, 0 0 120px #FF6600' },
];

export const SHOP_ITEMS: ShopItem[] = [
  // Nick colors
  ...NICK_COLORS.map(c => ({
    id: c.id,
    name: c.name,
    price: c.price,
    description: `Destaque seu nick com a cor ${c.name.replace('Nick ', '')}`,
    category: 'nick_color' as const,
    preview: c.color,
  })),
  // Frames
  ...FRAMES.map(f => ({
    id: f.id,
    name: f.name,
    price: f.price,
    description: `Quadro brilhante em volta do seu avatar`,
    category: 'frame' as const,
    preview: f.glowColor,
  })),
  // Badges
  { id: 'badge_vip', name: 'Badge VIP', price: 200, description: 'Badge exclusivo VIP', category: 'badge' },
  { id: 'badge_legend', name: 'Badge Lendário', price: 500, description: 'Badge lendário dourado', category: 'badge' },
  { id: 'badge_pro', name: 'Badge PRO', price: 350, description: 'Mostre que você é PRO no chat', category: 'badge' },
  { id: 'badge_mvp', name: 'Badge MVP', price: 400, description: 'Badge para os MVPs do Nexel', category: 'badge' },
  { id: 'badge_killer', name: 'Badge Killer', price: 300, description: 'Badge dos caçadores', category: 'badge' },
  { id: 'badge_clutch', name: 'Badge Clutch King', price: 450, description: 'Pra quem fecha clutch', category: 'badge' },
  { id: 'badge_fire', name: 'Badge On Fire', price: 250, description: 'Badge em chamas 🔥', category: 'badge' },
  { id: 'badge_diamond', name: 'Badge Diamante', price: 800, description: 'Status raro de elite', category: 'badge' },
  { id: 'badge_founder', name: 'Badge Fundador', price: 1500, description: 'Para fundadores de clãs lendários', category: 'badge' },
  // Spins
  { id: 'extra_spin_1', name: '1 Giro Extra', price: 50, description: '1 giro extra na roleta', category: 'spin' },
  { id: 'extra_spin_5', name: '5 Giros Extra', price: 200, description: '5 giros extras na roleta', category: 'spin' },
  { id: 'extra_spin_10', name: '10 Giros Extra', price: 380, description: '10 giros extras + economia', category: 'spin' },
  { id: 'extra_spin_25', name: '25 Giros Extra', price: 900, description: 'Mega pacote de 25 giros', category: 'spin' },
  { id: 'extra_spin_50', name: '50 Giros Extra', price: 1700, description: 'Pacote insano para tryhards', category: 'spin' },
];

export function getFrameStyle(frameId: string): { border: string; boxShadow: string } | null {
  const frame = FRAMES.find(f => f.id === frameId);
  if (!frame) return null;
  return { border: frame.borderStyle, boxShadow: frame.glowColor };
}

export function getNickColor(nickColorId: string): string | null {
  const nc = NICK_COLORS.find(c => c.id === nickColorId);
  return nc ? nc.color : null;
}
