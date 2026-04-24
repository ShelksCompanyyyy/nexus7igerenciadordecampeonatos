import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SPIN_PACKAGES, PIX_KEY, MIN_WITHDRAWAL } from '@/lib/store';
import { toast } from 'sonner';
import { Dices, Gift, Copy, Wallet, Sparkles, History, Crown, Trophy, Medal, Award } from 'lucide-react';

// Prêmios — ÍNDICES devem bater 1:1 com winner_index retornado pelo RPC spin_roulette
const PRIZES = [
  { gold: 5,   label: '5G',   color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)',  rarity: 'common' },     // 0
  { gold: 10,  label: '10G',  color: 'hsl(0 60% 35%)',    text: 'hsl(0 0% 100%)', rarity: 'common' },     // 1
  { gold: 15,  label: '15G',  color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)',  rarity: 'common' },     // 2
  { gold: 20,  label: '20G',  color: 'hsl(0 70% 40%)',    text: 'hsl(0 0% 100%)', rarity: 'uncommon' },   // 3
  { gold: 25,  label: '25G',  color: 'hsl(200 70% 40%)',  text: 'hsl(0 0% 100%)', rarity: 'uncommon' },   // 4
  { gold: 50,  label: '50G',  color: 'hsl(140 60% 35%)',  text: 'hsl(0 0% 100%)', rarity: 'rare' },       // 5
  { gold: 100, label: '100G', color: 'hsl(45 100% 50%)',  text: 'hsl(0 0% 10%)',  rarity: 'epic' },       // 6
  { gold: 150, label: '150G', color: 'hsl(280 90% 55%)',  text: 'hsl(0 0% 100%)', rarity: 'epic' },       // 7
  { gold: 200, label: '200G', color: 'hsl(0 90% 45%)',    text: 'hsl(0 0% 100%)', rarity: 'legendary' },  // 8
];

const ITEM_WIDTH = 110; // px - matches w-[110px]

// Build strip with the WINNER placed at exact index using server-provided winner_index
function buildStrip(winnerIndex: number, length = 60): { items: typeof PRIZES; winIndex: number } {
  const items: typeof PRIZES = [];
  for (let i = 0; i < length; i++) {
    items.push(PRIZES[Math.floor(Math.random() * PRIZES.length)]);
  }
  const winIdx = length - 8;
  items[winIdx] = PRIZES[winnerIndex] ?? PRIZES[0];
  return { items, winIndex: winIdx };
}

interface SpinHistoryRow {
  id: string;
  user_id: string;
  reward: number;
  created_at: string;
  username?: string;
}

interface RankRow {
  user_id: string;
  username: string;
  total: number;
  spins: number;
}

export default function RoulettePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [strip, setStrip] = useState<{ items: typeof PRIZES; winIndex: number }>({ items: [], winIndex: 0 });
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState<string>('none');
  const [containerWidth, setContainerWidth] = useState(0);
  const [glow, setGlow] = useState(false);
  const [legendaryBurst, setLegendaryBurst] = useState(false);
  const [history, setHistory] = useState<SpinHistoryRow[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const tickRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ gameNick: '', username: '', email: '', whatsapp: '', pixKey: '' });
  const [withdrawAmount, setWithdrawAmount] = useState(500);

  const freeSpins = profile?.free_spins || 0;
  const gold = profile?.gold || 0;
  const canSpin = freeSpins > 0;

  // ===== Container measurement =====
  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const initialFiller = useMemo(
    () => Array.from({ length: 30 }, () => PRIZES[Math.floor(Math.random() * PRIZES.length)]),
    [],
  );

  // ===== Spin history (realtime) =====
  const loadHistory = async () => {
    const { data: spins } = await supabase
      .from('spins')
      .select('id, user_id, reward, created_at')
      .order('created_at', { ascending: false })
      .limit(15);
    if (!spins) return;
    const userIds = Array.from(new Set(spins.map(s => s.user_id)));
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, game_nick, username')
      .in('user_id', userIds);
    const map = new Map(profs?.map(p => [p.user_id, p.game_nick || p.username]) || []);
    setHistory(spins.map(s => ({ ...s, username: map.get(s.user_id) || 'Jogador' })));

    // Ranking dos últimos 7 dias — agrega ganho total por usuário
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekSpins } = await supabase
      .from('spins')
      .select('user_id, reward')
      .gte('created_at', sevenDaysAgo);
    if (weekSpins) {
      const agg = new Map<string, { total: number; spins: number }>();
      for (const s of weekSpins) {
        const cur = agg.get(s.user_id) || { total: 0, spins: 0 };
        agg.set(s.user_id, { total: cur.total + (s.reward || 0), spins: cur.spins + 1 });
      }
      const ids = Array.from(agg.keys());
      const { data: rprofs } = await supabase
        .from('profiles')
        .select('user_id, game_nick, username')
        .in('user_id', ids);
      const nameMap = new Map(rprofs?.map(p => [p.user_id, p.game_nick || p.username]) || []);
      const rows: RankRow[] = Array.from(agg.entries())
        .map(([uid, v]) => ({ user_id: uid, username: nameMap.get(uid) || 'Jogador', total: v.total, spins: v.spins }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      setRanking(rows);
    }
  };

  useEffect(() => {
    loadHistory();
    const channel = supabase
      .channel('spins-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spins' }, () => loadHistory())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ===== Audio =====
  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { /* noop */ }
    }
    return audioCtxRef.current;
  };

  const playTick = (highPitch = false) => {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(highPitch ? 880 : 620, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch { /* noop */ }
  };

  const playWinSound = () => {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } catch { /* noop */ }
  };

  // Som ÉPICO/LENDÁRIO para 50G+ — fanfarra grave + brilho agudo
  const playEpicWinSound = () => {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      // Bass impact
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.connect(bassGain); bassGain.connect(ctx.destination);
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(80, ctx.currentTime);
      bass.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.6);
      bassGain.gain.setValueAtTime(0.001, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      bass.start(); bass.stop(ctx.currentTime + 1.3);

      // Heroic chord arpeggio (C major triad up)
      const heroic = [392, 523, 659, 784, 1046, 1318];
      heroic.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.1 + i * 0.08);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.1 + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.12 + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7 + i * 0.08);
        osc.start(ctx.currentTime + 0.1 + i * 0.08);
        osc.stop(ctx.currentTime + 0.8 + i * 0.08);
      });

      // Final shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.connect(shimmerGain); shimmerGain.connect(ctx.destination);
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1568, ctx.currentTime + 0.7);
      shimmer.frequency.exponentialRampToValueAtTime(2637, ctx.currentTime + 1.4);
      shimmerGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.7);
      shimmerGain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.75);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      shimmer.start(ctx.currentTime + 0.7);
      shimmer.stop(ctx.currentTime + 1.5);
    } catch { /* noop */ }
  };

  const scheduleTicks = (totalDuration: number) => {
    if (tickRafRef.current !== null) cancelAnimationFrame(tickRafRef.current);
    const start = performance.now();
    let lastTickAt = start;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / totalDuration);
      const interval = 60 + Math.pow(t, 3) * 280;
      if (performance.now() - lastTickAt >= interval) {
        playTick(t > 0.85);
        lastTickAt = performance.now();
      }
      if (t < 1) {
        tickRafRef.current = requestAnimationFrame(tick);
      }
    };
    tickRafRef.current = requestAnimationFrame(tick);
  };

  const stopTicks = () => {
    if (tickRafRef.current !== null) {
      cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
    }
  };
  useEffect(() => () => stopTicks(), []);

  const handleSpin = async () => {
    if (!user || !profile || spinning) return;
    if (!canSpin) { toast.error('Você precisa de uma roleta grátis para girar!'); return; }

    setSpinning(true);
    setResult(null);
    setGlow(false);
    setLegendaryBurst(false);

    const { data, error } = await supabase.rpc('spin_roulette');
    if (error || !data) {
      setSpinning(false);
      toast.error(error?.message || 'Erro ao girar');
      return;
    }
    const reward = (data as { reward: number; winner_index: number }).reward;
    const winnerIndex = (data as { reward: number; winner_index: number }).winner_index;

    // Build strip with EXACT winner from server
    const built = buildStrip(winnerIndex);
    setStrip(built);

    setTransition('none');
    setOffset(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const center = containerWidth / 2;
        // Pequeno jitter dentro da célula (sem estourar para item vizinho)
        const jitter = (Math.random() * 0.4 - 0.2) * (ITEM_WIDTH * 0.4);
        const targetOffset = built.winIndex * ITEM_WIDTH + ITEM_WIDTH / 2 - center + jitter;

        const duration = 6.2;
        setTransition(`transform ${duration}s cubic-bezier(0.08, 0.82, 0.16, 1)`);
        setOffset(-targetOffset);
        scheduleTicks(duration * 1000);

        window.setTimeout(async () => {
          stopTicks();
          setSpinning(false);
          setResult(reward);
          setGlow(true);

          if (reward >= 50) {
            playEpicWinSound();
            setLegendaryBurst(true);
            window.setTimeout(() => setLegendaryBurst(false), 2800);
          } else {
            playWinSound();
          }

          await refreshProfile();
          toast.success(`🎉 Você ganhou ${reward}G!`, { duration: 4000 });
          window.setTimeout(() => setGlow(false), 2500);
        }, duration * 1000 + 80);
      });
    });
  };

  const handleBuySpins = async (pkg: typeof SPIN_PACKAGES[0]) => {
    if (!user) return;
    await supabase.from('spin_purchases').insert({
      user_id: user.id,
      amount: Math.round(pkg.price * 100) / 100,
      spins: pkg.spins + pkg.bonus,
      bonus_spins: pkg.bonus,
      method: 'pix',
      status: 'pending',
    });
    navigator.clipboard.writeText(PIX_KEY);
    toast.success(`Chave Pix copiada! Valor: R$${pkg.price.toFixed(2)}. Aguarde confirmação do ADM.`);
  };

  const handleWithdraw = async () => {
    if (!user || !profile) return;
    if (gold < MIN_WITHDRAWAL) { toast.error(`Mínimo para saque: ${MIN_WITHDRAWAL}G`); return; }
    if (withdrawAmount > gold) { toast.error('Saldo insuficiente'); return; }
    if (!withdrawData.gameNick || !withdrawData.username || !withdrawData.email || !withdrawData.whatsapp || !withdrawData.pixKey) {
      toast.error('Preencha todos os campos'); return;
    }

    await supabase.from('withdrawals').insert({
      user_id: user.id,
      amount: withdrawAmount,
      game_nick: withdrawData.gameNick,
      username: withdrawData.username,
      email: withdrawData.email,
      whatsapp: withdrawData.whatsapp,
      pix_key: withdrawData.pixKey,
      status: 'pending',
      user_unique_id: profile.unique_id || user.id,
    });

    await supabase.from('profiles').update({ gold: gold - withdrawAmount }).eq('user_id', user.id);
    await refreshProfile();
    setShowWithdraw(false);
    toast.success('Saque solicitado! Aguarde o ADM liberar o pagamento.');
  };

  const displayItems = strip.items.length > 0 ? strip.items : initialFiller;

  // Generate 24 particles for legendary burst
  const particles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i,
    angle: (i / 24) * Math.PI * 2,
    distance: 100 + Math.random() * 140,
    delay: Math.random() * 0.2,
    duration: 1.4 + Math.random() * 0.8,
  })), []);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-card via-background to-card p-5">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center shadow-[0_0_24px_hsl(0,100%,50%,0.4)]">
              <Dices size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-heading text-muted-foreground tracking-[0.3em]">NEXUS · ROLETA</p>
              <h1 className="text-2xl font-heading text-primary text-glow leading-tight">FORTUNA</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-background/60 backdrop-blur border border-gold/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <Wallet size={14} className="text-gold" />
              <div className="leading-tight">
                <p className="text-[9px] text-muted-foreground font-display">SALDO</p>
                <p className="font-heading text-gold text-sm">{gold}G</p>
              </div>
            </div>
            <div className="bg-background/60 backdrop-blur border border-primary/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <div className="leading-tight">
                <p className="text-[9px] text-muted-foreground font-display">GIROS</p>
                <p className="font-heading text-primary text-sm">{freeSpins}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal carousel + legendary burst overlay */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full max-w-3xl">
          {/* Frame chrome top */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-heading text-muted-foreground tracking-[0.3em]">◤ NEXUS WHEEL</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-[10px] font-heading text-destructive tracking-widest">LIVE</span>
            </div>
          </div>
          <div
            ref={containerRef}
            className="relative w-full h-40 rounded-xl border-2 border-gold/50 overflow-hidden bg-[radial-gradient(ellipse_at_center,hsl(0_0%_12%)_0%,hsl(0_0%_4%)_100%)]"
            style={{
              boxShadow: glow
                ? (result !== null && result >= 50
                  ? '0 0 80px hsl(0 100% 50% / 0.9), inset 0 0 50px hsl(0 100% 50% / 0.35)'
                  : '0 0 60px hsl(45 100% 50% / 0.7), inset 0 0 40px hsl(45 100% 50% / 0.2)')
                : '0 0 30px hsl(0 100% 50% / 0.25), inset 0 0 40px rgba(0,0,0,0.75)',
              transition: 'box-shadow 0.4s ease',
            }}
          >
            {/* corner brackets — unique frame look */}
            <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-gold/70 z-30" />
            <span className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-gold/70 z-30" />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-gold/70 z-30" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-gold/70 z-30" />

            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-20 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-20 bg-gradient-to-l from-background to-transparent" />

            <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gold z-30 shadow-[0_0_12px_hsl(45,100%,50%,0.9)]" />
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-30">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_8px_hsl(45,100%,50%,0.9)]" />
            </div>
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 z-30 rotate-180">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_8px_hsl(45,100%,50%,0.9)]" />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 flex items-center will-change-transform"
              style={{
                transform: `translate3d(${offset}px, 0, 0)`,
                transition,
                left: 0,
              }}
            >
              {displayItems.map((p, i) => {
                const isWinner = strip.items.length > 0 && i === strip.winIndex && !spinning && result !== null;
                return (
                  <div
                    key={i}
                    className="w-[110px] shrink-0 mx-1 h-28 rounded-lg flex flex-col items-center justify-center font-heading transition-transform"
                    style={{
                      background: `linear-gradient(180deg, ${p.color}, hsl(0 0% 8%))`,
                      color: p.text,
                      boxShadow: isWinner
                        ? `0 0 24px ${p.color}, inset 0 0 16px hsl(45 100% 50% / 0.5)`
                        : 'inset 0 0 12px rgba(0,0,0,0.5)',
                      border: isWinner ? '2px solid hsl(45 100% 50%)' : '1px solid hsl(0 0% 0% / 0.4)',
                      transform: isWinner ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span className="text-lg tracking-wide" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{p.label}</span>
                    <span className="text-[9px] uppercase opacity-80 mt-1 font-display">{p.rarity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legendary fireworks overlay (50G+) */}
          {legendaryBurst && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-destructive/15 mix-blend-screen animate-pulse rounded-xl" />
              {particles.map(p => {
                const x = Math.cos(p.angle) * p.distance;
                const y = Math.sin(p.angle) * p.distance;
                return (
                  <span
                    key={p.id}
                    className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-destructive"
                    style={{
                      boxShadow: '0 0 12px hsl(0 100% 55%), 0 0 24px hsl(0 100% 55% / 0.6)',
                      animation: `firework-${p.id} ${p.duration}s ease-out ${p.delay}s forwards`,
                    }}
                  />
                );
              })}
              <style>{particles.map(p => {
                const x = Math.cos(p.angle) * p.distance;
                const y = Math.sin(p.angle) * p.distance;
                return `@keyframes firework-${p.id}{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(${x}px - 50%), calc(${y}px - 50%)) scale(0.2);opacity:0}}`;
              }).join('')}</style>
            </div>
          )}
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning || !canSpin}
          className="group relative px-10 py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(0 100% 50%) 0%, hsl(15 100% 45%) 50%, hsl(0 100% 35%) 100%)',
            boxShadow: '0 0 40px hsl(0 100% 50% / 0.6), inset 0 1px 0 hsl(0 100% 70% / 0.5), inset 0 -2px 6px hsl(0 100% 25% / 0.6)',
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />
          <span className="absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b from-white/30 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="relative font-heading text-primary-foreground text-sm tracking-[0.25em] flex items-center gap-2">
            <Dices size={16} className={spinning ? 'animate-spin' : ''} />
            {spinning ? 'GIRANDO...' : canSpin ? `GIRAR · ${freeSpins} GRÁTIS` : 'SEM GIROS'}
          </span>
        </button>

        {!canSpin && !spinning && (
          <p className="text-xs text-muted-foreground font-display text-center">
            Compre giros via Pix abaixo, resgate um código promocional ou aguarde uma premiação.
          </p>
        )}

        {result !== null && !spinning && (
          <div className="text-center animate-scale-in">
            <p className={`text-3xl font-heading text-glow ${result >= 50 ? 'text-destructive' : 'text-gold'}`}>
              🎉 +{result}G! {result >= 50 && '⚡ LENDÁRIO'}
            </p>
            <p className="text-xs text-muted-foreground font-display mt-1">Resultado validado pelo servidor</p>
          </div>
        )}
      </div>

      {/* Histórico realtime da comunidade */}
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-gold" /> RANKING DA SEMANA · TOP 3
        </h3>
        <p className="text-[10px] text-muted-foreground font-display mb-3">Soma total de ouro ganho na roleta nos últimos 7 dias</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[1, 0, 2].map((rankIdx) => {
            const r = ranking[rankIdx];
            if (!r) return <div key={rankIdx} className="bg-secondary/40 rounded p-3 text-center opacity-50">
              <p className="text-[10px] text-muted-foreground font-display">—</p>
            </div>;
            const isFirst = rankIdx === 0;
            const isSecond = rankIdx === 1;
            const Icon = isFirst ? Trophy : isSecond ? Medal : Award;
            const colorClass = isFirst ? 'border-gold/60 from-gold/20 to-gold/5 text-gold' :
                               isSecond ? 'border-muted-foreground/60 from-muted-foreground/20 to-muted-foreground/5 text-muted-foreground' :
                               'border-destructive/60 from-destructive/20 to-destructive/5 text-destructive';
            return (
              <div key={rankIdx} className={`bg-gradient-to-b ${colorClass} border rounded-lg p-3 text-center ${isFirst ? 'scale-110 z-10' : ''}`}>
                <Icon size={isFirst ? 28 : 22} className="mx-auto mb-1" />
                <p className="text-[10px] font-heading uppercase">#{rankIdx + 1}</p>
                <p className="text-xs font-heading text-foreground truncate mt-1">{r.username}</p>
                <p className={`text-sm font-heading mt-1`}>{r.total}G</p>
                <p className="text-[9px] text-muted-foreground font-display">{r.spins} {r.spins === 1 ? 'giro' : 'giros'}</p>
              </div>
            );
          })}
        </div>

        {ranking.length > 3 && (
          <div className="space-y-1 mb-5 border-t border-border pt-3">
            <p className="text-[10px] font-heading text-muted-foreground mb-2">DEMAIS COLOCAÇÕES</p>
            {ranking.slice(3).map((r, i) => (
              <div key={r.user_id} className="flex items-center justify-between text-xs font-display p-2 bg-secondary/40 rounded">
                <span className="text-muted-foreground">#{i + 4}</span>
                <span className="text-foreground flex-1 ml-3 truncate">{r.username}</span>
                <span className="font-heading text-gold">{r.total}G</span>
                <span className="text-muted-foreground text-[10px] ml-2">{r.spins}x</span>
              </div>
            ))}
          </div>
        )}

        <h4 className="font-heading text-xs text-primary mb-3 flex items-center gap-2 border-t border-border pt-3">
          <History size={14} /> GIROS RECENTES (AO VIVO)
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {history.length === 0 && (
            <p className="text-center text-muted-foreground text-sm font-display">Nenhum giro registrado ainda</p>
          )}
          {history.map(h => (
            <div key={h.id} className={`flex items-center justify-between p-2 rounded-md font-display text-xs ${
              h.reward >= 100 ? 'bg-destructive/10 border border-destructive/30' :
              h.reward >= 50 ? 'bg-gold/10 border border-gold/30' :
              'bg-secondary/40'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {h.reward >= 100 && <Crown size={12} className="text-destructive shrink-0" />}
                <span className="truncate text-foreground">{h.username}</span>
              </div>
              <span className={`font-heading ${
                h.reward >= 100 ? 'text-destructive' :
                h.reward >= 50 ? 'text-gold' :
                'text-foreground'
              }`}>+{h.reward}G</span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2">
          <Gift size={16} /> COMPRAR GIROS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPIN_PACKAGES.map((pkg, i) => (
            <div key={i} className="flex items-start justify-between p-4 bg-secondary/50 rounded-lg gap-3">
              <div className="min-w-0">
                <p className="font-display text-foreground text-sm">{pkg.spins} {pkg.spins === 1 ? 'Giro' : 'Giros'}{pkg.bonus > 0 && ` + ${pkg.bonus} bônus`}</p>
                {pkg.extras && <p className="text-[10px] text-gold mt-1 font-display">{pkg.extras}</p>}
              </div>
              <button
                onClick={() => handleBuySpins(pkg)}
                className="flex items-center gap-2 px-3 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs shrink-0"
              >
                <Copy size={12} /> R${pkg.price.toFixed(2).replace('.', ',')}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-display">
          Ao clicar, a chave Pix é copiada e a compra registrada. Aguarde confirmação do ADM.
        </p>
      </div>

      <div className="bg-card rounded-lg neon-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm text-primary flex items-center gap-2">
            <Wallet size={16} /> SAQUE
          </h3>
          <span className="text-xs text-muted-foreground font-display">Mínimo: {MIN_WITHDRAWAL}G</span>
        </div>
        {!showWithdraw ? (
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={gold < MIN_WITHDRAWAL}
            className="px-6 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs disabled:opacity-50"
          >
            SOLICITAR SAQUE
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-primary font-heading">📋 DADOS PARA SAQUE</p>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">💰 Quantidade de Gold</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(Number(e.target.value))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">🔑 Chave Pix</label>
              <input type="text" value={withdrawData.pixKey} onChange={e => setWithdrawData(prev => ({ ...prev, pixKey: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-primary/50 focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">🎮 Nick no Jogo</label>
              <input type="text" value={withdrawData.gameNick} onChange={e => setWithdrawData(prev => ({ ...prev, gameNick: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">👤 Nome de Usuário</label>
              <input type="text" value={withdrawData.username} onChange={e => setWithdrawData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">📧 Gmail</label>
              <input type="email" value={withdrawData.email} onChange={e => setWithdrawData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-display block mb-1">📱 WhatsApp</label>
              <input type="text" value={withdrawData.whatsapp} onChange={e => setWithdrawData(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <p className="text-xs text-warning font-display">⏳ Após solicitar, aguarde o ADM liberar o pagamento (24h-48h úteis).</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleWithdraw} className="px-6 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">CONFIRMAR</button>
              <button onClick={() => setShowWithdraw(false)} className="px-6 py-2 bg-secondary text-muted-foreground rounded font-heading text-xs">CANCELAR</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
