import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SPIN_PACKAGES, PIX_KEY, MIN_WITHDRAWAL } from '@/lib/store';
import { toast } from 'sonner';
import { Dices, Gift, Copy, Wallet, Sparkles } from 'lucide-react';

// Prêmios visuais (mesma ordem das probabilidades no backend)
const PRIZES = [
  { gold: 5,   label: '5G',   color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)' },
  { gold: 10,  label: '10G',  color: 'hsl(0 60% 35%)',    text: 'hsl(0 0% 100%)' },
  { gold: 15,  label: '15G',  color: 'hsl(0 0% 22%)',     text: 'hsl(0 0% 92%)' },
  { gold: 20,  label: '20G',  color: 'hsl(0 70% 40%)',    text: 'hsl(0 0% 100%)' },
  { gold: 25,  label: '25G',  color: 'hsl(200 70% 40%)',  text: 'hsl(0 0% 100%)' },
  { gold: 50,  label: '50G',  color: 'hsl(140 60% 35%)',  text: 'hsl(0 0% 100%)' },
  { gold: 100, label: '100G', color: 'hsl(45 100% 50%)',  text: 'hsl(0 0% 10%)' },
  { gold: 150, label: '150G', color: 'hsl(280 90% 55%)',  text: 'hsl(0 0% 100%)' },
  { gold: 200, label: '200G', color: 'hsl(0 90% 45%)',    text: 'hsl(0 0% 100%)' },
];

const SEGMENT_COUNT = PRIZES.length;
const SEG_ANGLE = 360 / SEGMENT_COUNT;

export default function RoulettePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ gameNick: '', username: '', email: '', whatsapp: '', pixKey: '' });
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const wheelRef = useRef<HTMLDivElement>(null);

  const freeSpins = profile?.free_spins || 0;
  const gold = profile?.gold || 0;
  const canSpin = freeSpins > 0;

  const playStartSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 4);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 4);
      osc.start(); osc.stop(ctx.currentTime + 4);
    } catch { /* noop */ }
  };

  const playWinSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      osc.frequency.setValueAtTime(1046, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    } catch { /* noop */ }
  };

  const handleSpin = async () => {
    if (!user || !profile || spinning) return;
    if (!canSpin) { toast.error('Você precisa de uma roleta grátis para girar!'); return; }

    setSpinning(true);
    setResult(null);

    const { data, error } = await supabase.rpc('spin_roulette');
    if (error || !data) {
      setSpinning(false);
      toast.error(error?.message || 'Erro ao girar');
      return;
    }
    const reward = (data as { reward: number }).reward;
    const prizeIndex = PRIZES.findIndex(p => p.gold === reward);
    if (prizeIndex < 0) {
      setSpinning(false);
      toast.error('Prêmio inválido');
      return;
    }

    playStartSound();
    const baseTurns = 6;
    const targetAngle = 360 - (prizeIndex * SEG_ANGLE + SEG_ANGLE / 2);
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((targetAngle - currentMod) + 360) % 360;
    const next = rotation + baseTurns * 360 + delta;
    setRotation(next);

    setTimeout(async () => {
      setSpinning(false);
      setResult(reward);
      playWinSound();
      await refreshProfile();
      toast.success(`🎉 Você ganhou ${reward}G!`, { duration: 4000 });
    }, 4200);
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

      <div className="flex flex-col items-center gap-6">
        <div className="relative w-72 h-72 md:w-96 md:h-96" style={{ perspective: '1000px' }}>
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-60 pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, hsl(0 100% 50% / 0.6), hsl(45 100% 50% / 0.6), hsl(280 100% 60% / 0.6), hsl(0 100% 50% / 0.6))',
              animation: spinning ? 'spin 2s linear infinite' : 'none',
            }}
          />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-30">
            <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-gold drop-shadow-[0_0_12px_hsl(45,100%,50%,0.9)]" />
          </div>

          <div
            className="absolute inset-0 rounded-full"
            style={{ transform: 'rotateX(28deg)', transformStyle: 'preserve-3d' }}
          >
            <div
              ref={wheelRef}
              className="relative w-full h-full rounded-full border-4 border-gold/60 overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? 'transform 4.2s cubic-bezier(0.12, 0.72, 0.18, 1)'
                  : 'none',
                boxShadow: spinning
                  ? '0 0 60px hsl(45 100% 50% / 0.6), 0 0 120px hsl(0 100% 50% / 0.4), inset 0 0 40px rgba(0,0,0,0.6)'
                  : '0 0 30px hsl(0 100% 50% / 0.3), inset 0 0 30px rgba(0,0,0,0.7)',
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
                <defs>
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(45 100% 60% / 0.4)" />
                    <stop offset="100%" stopColor="hsl(0 0% 0% / 0)" />
                  </radialGradient>
                </defs>
                {PRIZES.map((p, i) => {
                  const start = i * SEG_ANGLE - 90;
                  const end = (i + 1) * SEG_ANGLE - 90;
                  const x1 = 50 + 50 * Math.cos((start * Math.PI) / 180);
                  const y1 = 50 + 50 * Math.sin((start * Math.PI) / 180);
                  const x2 = 50 + 50 * Math.cos((end * Math.PI) / 180);
                  const y2 = 50 + 50 * Math.sin((end * Math.PI) / 180);
                  const large = SEG_ANGLE > 180 ? 1 : 0;
                  return (
                    <path
                      key={i}
                      d={`M50,50 L${x1},${y1} A50,50 0 ${large},1 ${x2},${y2} Z`}
                      fill={p.color}
                      stroke="hsl(45 100% 50% / 0.5)"
                      strokeWidth="0.4"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="50" fill="url(#centerGlow)" />
              </svg>

              {PRIZES.map((prize, i) => {
                const mid = i * SEG_ANGLE + SEG_ANGLE / 2 - 90;
                const r = 34;
                const x = 50 + r * Math.cos((mid * Math.PI) / 180);
                const y = 50 + r * Math.sin((mid * Math.PI) / 180);
                return (
                  <div
                    key={i}
                    className="absolute font-heading text-xs md:text-sm pointer-events-none"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      color: prize.text,
                      transform: `translate(-50%, -50%) rotate(${mid + 90}deg)`,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {prize.label}
                  </div>
                );
              })}

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center z-10 border-2 border-gold"
                  style={{
                    background: 'radial-gradient(circle, hsl(0 0% 8%) 0%, hsl(0 0% 0%) 100%)',
                    boxShadow: '0 0 20px hsl(45 100% 50% / 0.6)',
                  }}
                >
                  <span className="font-heading text-gold text-xs md:text-sm tracking-widest">N7i</span>
                </div>
              </div>
            </div>
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
