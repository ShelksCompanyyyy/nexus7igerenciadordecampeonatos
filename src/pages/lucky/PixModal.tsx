import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Copy, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string | null;
  amount: number;
  spins: number;
  onClose: () => void;
  onPaid: () => void;
}

export default function PixModal({ paymentId, qrCode, qrCodeBase64, amount, spins, onClose, onPaid }: Props) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    let stop = false;
    const channel = supabase
      .channel(`mp_payment_${paymentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mp_payments', filter: `id=eq.${paymentId}` },
        (payload: any) => {
          const s = payload.new?.status;
          if (s === 'approved') { setStatus('approved'); onPaid(); }
          if (s === 'rejected') setStatus('rejected');
        })
      .subscribe();

    // Polling de fallback (caso webhook atrase)
    const interval = setInterval(async () => {
      if (stop) return;
      const { data } = await supabase.from('mp_payments').select('status').eq('id', paymentId).maybeSingle();
      if (data?.status === 'approved') { setStatus('approved'); onPaid(); }
      if (data?.status === 'rejected') setStatus('rejected');
    }, 5000);

    return () => { stop = true; clearInterval(interval); supabase.removeChannel(channel); };
  }, [paymentId, onPaid]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(qrCode);
    toast.success('Código PIX copiado!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border-2 border-primary/60 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-primary text-glow text-sm">PAGAMENTO PIX</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {status === 'approved' ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="mx-auto text-green-400 animate-scale-in" size={64} />
            <p className="font-heading text-green-400 text-glow">PAGO!</p>
            <p className="text-xs text-muted-foreground font-display">+{spins} giros adicionados</p>
            <button onClick={onClose} className="w-full py-2 rounded bg-primary text-primary-foreground font-heading text-sm">
              Continuar
            </button>
          </div>
        ) : status === 'rejected' ? (
          <div className="text-center py-6 space-y-2">
            <p className="font-heading text-destructive">Pagamento rejeitado</p>
            <button onClick={onClose} className="w-full py-2 rounded border border-border font-display text-sm">Fechar</button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-display">Total</p>
              <p className="text-2xl font-heading text-gold">R$ {amount.toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-primary font-display">{spins} giros</p>
            </div>

            {qrCodeBase64 && (
              <div className="bg-white p-3 rounded-lg flex items-center justify-center">
                <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-display uppercase">PIX Copia e Cola</p>
              <div className="bg-secondary border border-border rounded p-2 break-all text-[10px] font-mono max-h-24 overflow-y-auto">
                {qrCode}
              </div>
              <button onClick={copyCode}
                className="w-full py-2 rounded bg-primary text-primary-foreground font-heading text-sm flex items-center justify-center gap-2 hover:opacity-90">
                <Copy size={14} /> Copiar código
              </button>
            </div>

            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground font-display">
              <Loader2 className="animate-spin" size={14} /> Aguardando pagamento...
            </div>
          </>
        )}
      </div>
    </div>
  );
}