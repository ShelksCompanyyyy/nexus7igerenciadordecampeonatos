import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PromoCodeRedeem() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('redeem_promo_code', { _code: code.trim() });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { reward: number; code: string } | null;
    toast.success(`+${result?.reward ?? 0}G resgatados! 🎁`);
    setCode('');
    await refreshProfile();
  };

  return (
    <div className="bg-card border border-gold/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-gold" />
        <h3 className="font-heading text-sm text-gold">CÓDIGO PROMOCIONAL</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && !loading && redeem()}
          placeholder="DIGITE O CÓDIGO"
          className="flex-1 p-3 bg-secondary rounded border border-border focus:border-gold outline-none text-foreground font-display text-sm uppercase tracking-wider"
        />
        <button
          onClick={redeem}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-gradient-to-r from-gold/30 to-gold/10 text-gold border border-gold/40 rounded font-heading text-xs disabled:opacity-50"
        >
          {loading ? '...' : 'RESGATAR'}
        </button>
      </div>
    </div>
  );
}
