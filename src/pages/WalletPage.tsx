import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { MIN_WITHDRAWAL } from '@/lib/store';
import { toast } from 'sonner';
import { Wallet, Coins, Dices, ArrowDownToLine, History, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WithdrawalRow { id: string; amount: number; status: string; created_at: string; pix_key: string }
interface SpinRow { id: string; reward: number; cost: number; spin_type: string; created_at: string }

export default function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [spinHistory, setSpinHistory] = useState<SpinRow[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState(MIN_WITHDRAWAL);
  const [pixKey, setPixKey] = useState('');

  const gold = profile?.gold || 0;
  const freeSpins = profile?.free_spins || 0;

  useEffect(() => {
    if (!user) return;
    supabase.from('withdrawals').select('id,amount,status,created_at,pix_key').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20).then(({ data }) => setWithdrawals((data as any) || []));
    supabase.from('spins').select('id,reward,cost,spin_type,created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20).then(({ data }) => setSpinHistory((data as any) || []));
  }, [user]);

  const handleWithdraw = async () => {
    if (!user || !profile) return;
    if (amount < MIN_WITHDRAWAL) return toast.error(`Mínimo ${MIN_WITHDRAWAL}G`);
    if (amount > gold) return toast.error('Saldo insuficiente');
    if (!pixKey.trim()) return toast.error('Informe a chave PIX');
    const { error } = await supabase.from('withdrawals').insert({
      user_id: user.id,
      amount,
      pix_key: pixKey,
      game_nick: profile.game_nick || profile.username,
      username: profile.username,
      email: profile.email,
      whatsapp: profile.whatsapp || '',
      user_unique_id: profile.unique_id,
      status: 'pending',
    });
    if (error) return toast.error(error.message);
    await supabase.from('profiles').update({ gold: gold - amount }).eq('user_id', user.id);
    toast.success('Saque solicitado!');
    setShowWithdraw(false);
    setPixKey('');
    refreshProfile();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Wallet size={24} /> CARTEIRA
      </h1>

      {/* Saldos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card neon-border rounded-xl p-4 text-center">
          <Coins className="mx-auto text-gold mb-1" size={28} />
          <p className="text-xs font-display text-muted-foreground">NexelGolds</p>
          <p className="text-2xl font-heading text-gold">{gold}</p>
        </div>
        <div className="bg-card neon-border rounded-xl p-4 text-center">
          <Dices className="mx-auto text-primary mb-1" size={28} />
          <p className="text-xs font-display text-muted-foreground">Giros</p>
          <p className="text-2xl font-heading text-primary text-glow">{freeSpins}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowWithdraw(true)}
          className="bg-gold/10 border border-gold/40 rounded-lg p-3 flex items-center gap-2 hover:bg-gold/20 transition-all">
          <ArrowDownToLine className="text-gold" size={18} />
          <span className="font-heading text-gold text-sm">Sacar</span>
        </button>
        <Link to="/roulette" className="bg-primary/10 border border-primary/40 rounded-lg p-3 flex items-center gap-2 hover:bg-primary/20 transition-all">
          <Sparkles className="text-primary" size={18} />
          <span className="font-heading text-primary text-sm">Ir para Roleta</span>
        </Link>
      </div>

      {/* Saques */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading text-primary text-sm mb-3 flex items-center gap-2">
          <History size={16} /> Histórico de Saques
        </h3>
        {withdrawals.length === 0 ? (
          <p className="text-xs text-muted-foreground font-display">Nenhum saque ainda.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1.5">
                <span className="text-foreground">{w.amount}G</span>
                <span className={`px-2 py-0.5 rounded ${
                  w.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                  w.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{w.status}</span>
                <span className="text-muted-foreground">{new Date(w.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roletas */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading text-primary text-sm mb-3 flex items-center gap-2">
          <Dices size={16} /> Histórico de Giros
        </h3>
        {spinHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground font-display">Nenhum giro ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {spinHistory.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1.5">
                <span className="text-gold">+{s.reward}G</span>
                <span className="text-muted-foreground">{s.spin_type}</span>
                <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal saque */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-card neon-border rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-heading text-primary text-glow">SOLICITAR SAQUE</h3>
            <p className="text-xs text-muted-foreground font-display">Mínimo {MIN_WITHDRAWAL}G • Saldo: {gold}G</p>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" placeholder="Quantidade (G)" />
            <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" placeholder="Sua chave PIX" />
            <div className="flex gap-2">
              <button onClick={() => setShowWithdraw(false)} className="flex-1 px-3 py-2 rounded border border-border text-sm font-display">Cancelar</button>
              <button onClick={handleWithdraw} className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-heading">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}