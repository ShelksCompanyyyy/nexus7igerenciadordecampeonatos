import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SPIN_PACKAGES, PIX_KEY, MIN_WITHDRAWAL } from '@/lib/store';
import { toast } from 'sonner';
import { Dices, Gift, Copy, Wallet, Sparkles } from 'lucide-react';

// Prêmios visuais (ordem usada para sortear visualmente; o servidor define o vencedor)
const PRIZES = [
  { gold: 5,   label: '5G',   color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)',  rarity: 'common' },
  { gold: 10,  label: '10G',  color: 'hsl(0 60% 35%)',    text: 'hsl(0 0% 100%)', rarity: 'common' },
  { gold: 15,  label: '15G',  color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)',  rarity: 'common' },
  { gold: 20,  label: '20G',  color: 'hsl(0 70% 40%)',    text: 'hsl(0 0% 100%)', rarity: 'uncommon' },
  { gold: 25,  label: '25G',  color: 'hsl(200 70% 40%)',  text: 'hsl(0 0% 100%)', rarity: 'uncommon' },
  { gold: 50,  label: '50G',  color: 'hsl(140 60% 35%)',  text: 'hsl(0 0% 100%)', rarity: 'rare' },
  { gold: 100, label: '100G', color: 'hsl(45 100% 50%)',  text: 'hsl(0 0% 10%)',  rarity: 'epic' },
  { gold: 150, label: '150G', color: 'hsl(280 90% 55%)',  text: 'hsl(0 0% 100%)', rarity: 'epic' },
  { gold: 200, label: '200G', color: 'hsl(0 90% 45%)',    text: 'hsl(0 0% 100%)', rarity: 'legendary' },
];

const ITEM_WIDTH = 110; // px - matches CSS class w-[110px]

// Build a long shuffled strip with the winning prize placed at a known index
function buildStrip(winningGold: number, length = 60): { items: typeof PRIZES; winIndex: number } {
  const items: typeof PRIZES = [];
  for (let i = 0; i < length; i++) {
    items.push(PRIZES[Math.floor(Math.random() * PRIZES.length)]);
  }
  const winIndex = length - 8; // place winner near end so user sees it pass slowly
  const winPrize = PRIZES.find(p => p.gold === winningGold) ?? PRIZES[0];
  items[winIndex] = winPrize;
  return { items, winIndex };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ gameNick: '', username: '', email: '', whatsapp: '', pixKey: '' });
  const [withdrawAmount, setWithdrawAmount] = useState(500);

  const freeSpins = profile?.free_spins || 0;
  const gold = profile?.gold || 0;
  const canSpin = freeSpins > 0;

  // Track container width to centre the winning item under the marker
  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Build initial filler strip so the carousel isn't empty before first spin
  const initialFiller = useMemo(() => {
    return Array.from({ length: 30 }, () => PRIZES[Math.floor(Math.random() * PRIZES.length)]);
  }, []);

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

  const stopTicks = () => {
    if (tickIntervalRef.current !== null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  // Schedule decelerating ticks while the strip travels
  const scheduleTicks = (totalDuration: number) => {
    stopTicks();
    const start = performance.now();
    let lastTickAt = start;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / totalDuration);
      // tick interval grows exponentially as we slow down (60ms -> 320ms)
      const interval = 60 + Math.pow(t, 3) * 280;
      if (performance.now() - lastTickAt >= interval) {
        playTick(t > 0.85); // higher pitch in the slow-motion final phase
        lastTickAt = performance.now();
      }
      if (t < 1 && tickIntervalRef.current !== null) {
        tickIntervalRef.current = window.requestAnimationFrame(tick);
      }
    };
    // store rAF id in same ref slot (we just need a cleanup mechanism)
    tickIntervalRef.current = window.requestAnimationFrame(tick);
  };

  const stopTicksRAF = () => {
    if (tickIntervalRef.current !== null) {
      window.cancelAnimationFrame(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  useEffect(() => () => stopTicksRAF(), []);

  const handleSpin = async () => {
    if (!user || !profile || spinning) return;
    if (!canSpin) { toast.error('Você precisa de uma roleta grátis para girar!'); return; }

    setSpinning(true);
    setResult(null);
    setGlow(false);

    const { data, error } = await supabase.rpc('spin_roulette');
    if (error || !data) {
      setSpinning(false);
      toast.error(error?.message || 'Erro ao girar');
      return;
    }
    const reward = (data as { reward: number }).reward;

    // Build strip with winner placed at known index
    const built = buildStrip(reward);
    setStrip(built);

    // Reset position (instant) so the animation always starts from a clean state
    setTransition('none');
    setOffset(0);

    // Force layout flush before applying the moving transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const center = containerWidth / 2;
        // Slight jitter inside the winning cell so it doesn't always align dead-centre
        const jitter = (Math.random() * 0.6 - 0.3) * (ITEM_WIDTH * 0.5);
        const targetOffset = built.winIndex * ITEM_WIDTH + ITEM_WIDTH / 2 - center + jitter;

        // Two-phase animation via single cubic-bezier that mimics fast cruise -> slow-motion finish
        const duration = 6.2; // seconds (longer = more slow-mo)
        setTransition(`transform ${duration}s cubic-bezier(0.08, 0.82, 0.16, 1)`);
        setOffset(-targetOffset);
        scheduleTicks(duration * 1000);

        window.setTimeout(async () => {
          stopTicksRAF();
          setSpinning(false);
          setResult(reward);
          setGlow(true);
          playWinSound();
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

  // Items currently being rendered: real strip during/after spin, filler before
  const displayItems = strip.items.length > 0 ? strip.items : initialFiller;

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
        <Dices size={28} /> ROLETA
      </h1>

      <div className="flex flex-wrap gap-3">
        <div className="bg-card rounded-lg neon-border p-4 flex items-center gap-3 flex-1 min-w-[140px]">
          <Wallet size={20} className="text-gold" />
          <div>
            <p className="text-xs text-muted-foreground font-display">Saldo</p>
            <p className="font-heading text-gold text-lg">{gold}G</p>
          </div>
        </div>
        <div className="bg-card rounded-lg neon-border p-4 flex items-center gap-3 flex-1 min-w-[140px]">
          <Sparkles size={20} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground font-display">Giros Grátis</p>
            <p className="font-heading text-primary text-lg">{freeSpins}</p>
          </div>
        </div>
      </div>

      {/* Horizontal carousel roulette */}
      <div className="flex flex-col items-center gap-6">
        <div
          ref={containerRef}
          className="relative w-full max-w-3xl h-40 rounded-xl border-2 border-gold/40 overflow-hidden bg-gradient-to-b from-background via-card to-background"
          style={{
            boxShadow: glow
              ? '0 0 60px hsl(45 100% 50% / 0.7), inset 0 0 40px hsl(45 100% 50% / 0.2)'
              : '0 0 30px hsl(0 100% 50% / 0.25), inset 0 0 30px rgba(0,0,0,0.6)',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {/* Side fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-20 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-20 bg-gradient-to-l from-background to-transparent" />

          {/* Center marker */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gold z-30 shadow-[0_0_12px_hsl(45,100%,50%,0.9)]" />
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-30">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_8px_hsl(45,100%,50%,0.9)]" />
          </div>
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 z-30 rotate-180">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_8px_hsl(45,100%,50%,0.9)]" />
          </div>

          {/* Moving strip */}
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

        <button
          onClick={handleSpin}
          disabled={spinning || !canSpin}
          className="px-10 py-4 gradient-primary text-primary-foreground font-heading rounded-lg disabled:opacity-50 transition-all hover:scale-105 box-glow text-sm tracking-widest relative overflow-hidden"
          style={{ boxShadow: '0 0 30px hsl(0 100% 50% / 0.5)' }}
        >
          {spinning ? 'GIRANDO...' : canSpin ? `GIRAR GRÁTIS (${freeSpins})` : 'SEM ROLETAS GRÁTIS'}
        </button>

        {!canSpin && !spinning && (
          <p className="text-xs text-muted-foreground font-display text-center">
            Compre giros via Pix abaixo, resgate um código promocional ou aguarde uma premiação.
          </p>
        )}

        {result !== null && !spinning && (
          <div className="text-center animate-scale-in">
            <p className="text-3xl font-heading text-gold text-glow-gold">🎉 +{result}G!</p>
            <p className="text-xs text-muted-foreground font-display mt-1">Resultado validado pelo servidor</p>
          </div>
        )}
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
