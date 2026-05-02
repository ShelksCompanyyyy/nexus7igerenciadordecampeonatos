import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Wallet, Coins, Dices, ArrowDownToLine, History, Sparkles, BadgeDollarSign, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PayoutRow { id: string; amount_brl: number; status: string; created_at: string; pix_key: string; failure_reason?: string | null }
interface PaymentRow { id: string; amount_brl: number; spins: number; bonus_spins: number; status: string; created_at: string }

const PIX_TYPES = ['cpf', 'email', 'phone', 'random'] as const;

export default function WalletPage() {
  const { user, profile } = useAuth();
  const [walletBrl, setWalletBrl] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState(50);
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState<typeof PIX_TYPES[number]>('random');
  const [beneficiary, setBeneficiary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const freeSpins = profile?.free_spins || 0;

  const reload = async () => {
    if (!user) return;
    const [w, po, pm] = await Promise.all([
      supabase.from('wallet').select('balance_brl,total_earned').eq('user_id', user.id).maybeSingle(),
      supabase.from('mp_payouts').select('id,amount_brl,status,created_at,pix_key,failure_reason').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('mp_payments').select('id,amount_brl,spins,bonus_spins,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    setWalletBrl(Number(w.data?.balance_brl || 0));
    setTotalEarned(Number(w.data?.total_earned || 0));
    setPayouts((po.data as any) || []);
    setPayments((pm.data as any) || []);
  };

  useEffect(() => { reload(); }, [user]);

  // Realtime: atualiza wallet quando webhook credita.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet', filter: `user_id=eq.${user.id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mp_payouts', filter: `user_id=eq.${user.id}` }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleWithdraw = async () => {
    if (!user) return;
    if (amount < 50) return toast.error('Mínimo R$ 50,00');
    if (amount > walletBrl) return toast.error('Saldo insuficiente');
    if (!pixKey.trim()) return toast.error('Informe a chave PIX');
    if (!beneficiary.trim()) return toast.error('Informe o nome do titular');

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_pix_withdrawal' as any, {
        _amount: amount,
        _beneficiary_name: beneficiary,
        _pix_key: pixKey,
        _pix_key_type: pixType,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error || 'Falha ao solicitar saque');

      // Dispara payout automático
      if (res?.payout_id) {
        const { data: payoutResp } = await supabase.functions.invoke('mp-payout', { body: { payout_id: res.payout_id } });
        if ((payoutResp as any)?.error) {
          toast.warning('Saque registrado — pagamento será processado manualmente');
        } else {
          toast.success('Saque PIX enviado!');
        }
      } else {
        toast.success('Saque solicitado!');
      }

      setShowWithdraw(false);
      setPixKey('');
      setBeneficiary('');
      reload();
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up pb-10">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Wallet size={24} /> CARTEIRA
      </h1>

      {/* Saldos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-amber-900/40 to-amber-700/20 border-2 border-amber-400/40 rounded-xl p-4 text-center shadow-[0_0_18px_rgba(251,191,36,0.25)]">
          <BadgeDollarSign className="mx-auto text-amber-300 mb-1" size={28} />
          <p className="text-xs font-display text-muted-foreground">Saldo PIX</p>
          <p className="text-2xl font-heading text-amber-300">R$ {walletBrl.toFixed(2).replace('.', ',')}</p>
          <p className="text-[10px] text-muted-foreground font-display mt-0.5">Total ganho: R$ {totalEarned.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="bg-gradient-to-br from-fuchsia-900/40 to-purple-900/30 border-2 border-fuchsia-400/40 rounded-xl p-4 text-center shadow-[0_0_18px_rgba(217,70,239,0.25)]">
          <Dices className="mx-auto text-fuchsia-300 mb-1" size={28} />
          <p className="text-xs font-display text-muted-foreground">Giros</p>
          <p className="text-2xl font-heading text-fuchsia-200">{freeSpins}</p>
          <Link to="/roulette" className="text-[10px] text-fuchsia-300 underline font-display">Ir para Lucky Nexel</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowWithdraw(true)} disabled={walletBrl < 50}
          className="bg-amber-500/10 border border-amber-400/40 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all disabled:opacity-40">
          <ArrowDownToLine className="text-amber-300" size={18} />
          <span className="font-heading text-amber-300 text-sm">Sacar PIX</span>
        </button>
        <Link to="/roulette" className="bg-fuchsia-500/10 border border-fuchsia-400/40 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-fuchsia-500/20 transition-all">
          <Sparkles className="text-fuchsia-300" size={18} />
          <span className="font-heading text-fuchsia-200 text-sm">Comprar Giros</span>
        </Link>
      </div>

      {/* Saques */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading text-primary text-sm mb-3 flex items-center gap-2">
          <History size={16} /> Histórico de Saques PIX
        </h3>
        {payouts.length === 0 ? (
          <p className="text-xs text-muted-foreground font-display">Nenhum saque ainda.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1.5">
                <span className="text-foreground">R$ {Number(w.amount_brl).toFixed(2).replace('.', ',')}</span>
                <span className={`px-2 py-0.5 rounded ${
                  w.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                  w.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                  w.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{w.status}</span>
                <span className="text-muted-foreground">{new Date(w.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagamentos */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-heading text-primary text-sm mb-3 flex items-center gap-2">
          <Coins size={16} /> Histórico de Compras
        </h3>
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground font-display">Nenhuma compra ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1.5">
                <span className="text-amber-300">R$ {Number(p.amount_brl).toFixed(2).replace('.', ',')}</span>
                <span className="text-fuchsia-200">{p.spins + p.bonus_spins} giros</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  p.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  p.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-card border-2 border-amber-400/40 rounded-xl p-5 w-full max-w-sm space-y-3 shadow-[0_0_24px_rgba(251,191,36,0.3)]">
            <h3 className="font-heading text-amber-300 text-glow">SOLICITAR SAQUE PIX</h3>
            <p className="text-xs text-muted-foreground font-display">Mínimo R$ 50,00 • Saldo: R$ {walletBrl.toFixed(2).replace('.', ',')}</p>

            <input type="number" min={50} max={walletBrl} value={amount} onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" placeholder="Valor (R$)" />

            <select value={pixType} onChange={e => setPixType(e.target.value as any)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display">
              <option value="random">Chave aleatória</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="phone">Celular</option>
            </select>

            <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" placeholder="Chave PIX" />
            <input type="text" value={beneficiary} onChange={e => setBeneficiary(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" placeholder="Nome do titular (igual no banco)" />

            <div className="flex gap-2">
              <button onClick={() => setShowWithdraw(false)} className="flex-1 px-3 py-2 rounded border border-border text-sm font-display">Cancelar</button>
              <button onClick={handleWithdraw} disabled={submitting}
                className="flex-1 px-3 py-2 rounded bg-amber-500 text-amber-950 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin" size={14} /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}