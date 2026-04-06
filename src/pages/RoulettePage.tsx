import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROULETTE_PRIZES, SPIN_PACKAGES, PIX_KEY, MIN_WITHDRAWAL, spinRoulette, updateUser, getCurrentUser, addWithdrawal, addSpinPurchase } from '@/lib/store';
import { toast } from 'sonner';
import { Dices, Gift, Copy, Wallet, ArrowRight } from 'lucide-react';

const SEGMENT_COLORS = [
  'from-primary/80 to-primary/40',
  'from-secondary to-secondary/80',
];

export default function RoulettePage() {
  const { user, refreshUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showPix, setShowPix] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ gameNick: '', username: '', email: '', whatsapp: '', password: '', pixKey: '' });
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const wheelRef = useRef<HTMLDivElement>(null);

  const totalSpins = (user?.freeSpins || 0);

  const handleSpin = () => {
    if (!user) return;
    if (totalSpins <= 0) {
      toast.error('Você não tem giros disponíveis!');
      return;
    }
    setSpinning(true);
    setResult(null);

    const prize = spinRoulette();
    const prizeIndex = ROULETTE_PRIZES.findIndex(p => p.gold === prize);
    const segmentAngle = 360 / ROULETTE_PRIZES.length;
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = rotation + 360 * 5 + targetAngle;
    setRotation(totalRotation);

    // Play spin sound
    try {
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 3);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 3);
    } catch {}

    setTimeout(() => {
      setSpinning(false);
      setResult(prize);
      updateUser(user.id, {
        gold: (user.gold || 0) + prize,
        freeSpins: Math.max(0, (user.freeSpins || 0) - 1),
      });
      refreshUser();

      // Win sound
      try {
        const audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {}

      toast.success(`🎉 Você ganhou ${prize}G!`, { duration: 4000 });
    }, 3500);
  };

  const handleBuySpins = (pkg: typeof SPIN_PACKAGES[0]) => {
    if (!user) return;
    addSpinPurchase({
      userId: user.id,
      amount: pkg.price,
      spins: pkg.spins + pkg.bonus,
      bonusSpins: pkg.bonus,
      method: 'pix',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    toast.info('Compra registrada! Aguarde confirmação do ADM.');
  };

  const copyPix = (value: number) => {
    navigator.clipboard.writeText(PIX_KEY);
    toast.success(`Chave Pix copiada! Valor: R$${value}`);
  };

  const handleWithdraw = () => {
    if (!user) return;
    if ((user.gold || 0) < MIN_WITHDRAWAL) {
      toast.error(`Mínimo para saque: ${MIN_WITHDRAWAL}G`);
      return;
    }
    if (withdrawAmount > (user.gold || 0)) {
      toast.error('Saldo insuficiente');
      return;
    }
    if (!withdrawData.gameNick || !withdrawData.username || !withdrawData.email || !withdrawData.whatsapp || !withdrawData.password || !withdrawData.pixKey) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (withdrawData.password !== user.password) {
      toast.error('Senha incorreta');
      return;
    }
    addWithdrawal({
      userId: user.id,
      amount: withdrawAmount,
      gameNick: withdrawData.gameNick,
      username: withdrawData.username,
      email: withdrawData.email,
      whatsapp: withdrawData.whatsapp,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userUniqueId: user.uniqueId || user.id,
    });
    updateUser(user.id, { gold: (user.gold || 0) - withdrawAmount });
    refreshUser();
    setShowWithdraw(false);
    toast.success('Saque solicitado! Aguarde 24h a 48h. Entre em contato com ADM com print do valor retirado.');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><Dices size={28} /> ROLETA</h1>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="bg-card rounded-lg neon-border p-4 flex items-center gap-3">
          <Wallet size={20} className="text-gold" />
          <div>
            <p className="text-xs text-muted-foreground font-display">Saldo</p>
            <p className="font-heading text-gold text-lg">{user?.gold || 0}G</p>
          </div>
        </div>
        <div className="bg-card rounded-lg neon-border p-4 flex items-center gap-3">
          <Dices size={20} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground font-display">Giros</p>
            <p className="font-heading text-primary text-lg">{totalSpins}</p>
          </div>
        </div>
      </div>

      {/* Roulette Wheel */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary drop-shadow-[0_0_10px_hsl(0,100%,50%,0.8)]" />
          {/* Glow ring */}
          <div className={`absolute inset-0 rounded-full ${spinning ? 'animate-glow-pulse' : ''}`} style={{ boxShadow: spinning ? 'var(--glow-lg)' : 'var(--glow-md)' }} />
          {/* Wheel */}
          <div ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-primary/50 overflow-hidden relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {ROULETTE_PRIZES.map((prize, i) => {
              const angle = (360 / ROULETTE_PRIZES.length) * i;
              const isEven = i % 2 === 0;
              return (
                <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 origin-bottom h-1/2 flex items-start justify-center pt-6`}
                    style={{ width: '60px', transformOrigin: '50% 100%' }}>
                    <span className={`font-heading text-sm ${isEven ? 'text-primary-foreground' : 'text-foreground'} rotate-180`} style={{ transform: 'rotate(180deg)' }}>
                      {prize.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Background segments */}
            <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
              {ROULETTE_PRIZES.map((_, i) => {
                const segAngle = 360 / ROULETTE_PRIZES.length;
                const startAngle = i * segAngle - 90;
                const endAngle = (i + 1) * segAngle - 90;
                const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
                const largeArc = segAngle > 180 ? 1 : 0;
                return (
                  <path key={i}
                    d={`M50,50 L${x1},${y1} A50,50 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={i % 2 === 0 ? 'hsl(0 100% 25%)' : 'hsl(0 0% 12%)'}
                    stroke="hsl(0 0% 20%)" strokeWidth="0.3"
                  />
                );
              })}
            </svg>
            {/* Labels on top */}
            {ROULETTE_PRIZES.map((prize, i) => {
              const segAngle = 360 / ROULETTE_PRIZES.length;
              const midAngle = i * segAngle + segAngle / 2 - 90;
              const r = 32;
              const x = 50 + r * Math.cos((midAngle * Math.PI) / 180);
              const y = 50 + r * Math.sin((midAngle * Math.PI) / 180);
              return (
                <div key={i} className="absolute font-heading text-xs text-primary-foreground"
                  style={{
                    left: `${x}%`, top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${midAngle + 90}deg)`,
                    textShadow: '0 0 4px rgba(0,0,0,0.8)',
                  }}>
                  {prize.label}
                </div>
              );
            })}
            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10">
                <span className="font-heading text-primary text-xs">N7i</span>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSpin} disabled={spinning || totalSpins <= 0}
          className="px-8 py-3 gradient-primary text-primary-foreground font-heading rounded-lg disabled:opacity-50 transition-all hover:box-glow-lg box-glow text-sm tracking-wider"
        >
          {spinning ? 'GIRANDO...' : `GIRAR (${totalSpins} restantes)`}
        </button>

        {result && !spinning && (
          <div className="text-center animate-slide-up">
            <p className="text-2xl font-heading text-gold text-glow-gold">🎉 {result}G!</p>
          </div>
        )}
      </div>

      {/* Buy Spins */}
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Gift size={16} /> COMPRAR GIROS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPIN_PACKAGES.map((pkg, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-display text-foreground">{pkg.label}</p>
                {pkg.bonus > 0 && <p className="text-xs text-gold">+{pkg.bonus} bônus</p>}
              </div>
              <button onClick={() => copyPix(pkg.price)}
                className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs"
              >
                <Copy size={12} /> PIX R${pkg.price}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-display">
          Ao clicar, a chave Pix será copiada. Após pagamento, aguarde confirmação do ADM.
        </p>
      </div>

      {/* Withdraw */}
      <div className="bg-card rounded-lg neon-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm text-primary flex items-center gap-2"><Wallet size={16} /> SAQUE</h3>
          <span className="text-xs text-muted-foreground font-display">Mínimo: {MIN_WITHDRAWAL}G</span>
        </div>
        {!showWithdraw ? (
          <button onClick={() => setShowWithdraw(true)}
            disabled={(user?.gold || 0) < MIN_WITHDRAWAL}
            className="px-6 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs disabled:opacity-50"
          >
            SOLICITAR SAQUE
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-display">Preencha os dados para saque:</p>
            <input type="number" placeholder="Quantidade de Gold" value={withdrawAmount} onChange={e => setWithdrawAmount(Number(e.target.value))}
              className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display" />
            {['gameNick', 'username', 'email', 'whatsapp', 'password'].map(field => (
              <input key={field}
                type={field === 'password' ? 'password' : 'text'}
                placeholder={field === 'gameNick' ? 'Nick do Jogo' : field === 'username' ? 'Nick de Usuário' : field === 'email' ? 'Gmail' : field === 'whatsapp' ? 'WhatsApp para contato' : 'Senha de confirmação'}
                value={(withdrawData as any)[field]}
                onChange={e => setWithdrawData(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display"
              />
            ))}
            <p className="text-xs text-warning font-display">⚠️ Por favor entrar em contato com ADM e print do valor retirado. Aguarde 24h a 48h para retirada ser concluída.</p>
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
