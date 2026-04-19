import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Gift, Plus, Trash, Power, PowerOff, Coins, Sparkles } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  reward: number;
  reward_type: 'gold' | 'free_spins';
  free_spins: number;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromoCodesPanel() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'gold' | 'free_spins'>('gold');
  const [formReward, setFormReward] = useState(50);
  const [formFreeSpins, setFormFreeSpins] = useState(1);
  const [formMaxUses, setFormMaxUses] = useState<string>('');

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    setCodes((data || []) as PromoCode[]);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async () => {
    if (!formCode.trim()) { toast.error('Informe o código'); return; }
    if (formType === 'gold' && formReward <= 0) { toast.error('Recompensa em Gold inválida'); return; }
    if (formType === 'free_spins' && formFreeSpins <= 0) { toast.error('Quantidade de roletas inválida'); return; }

    const payload = {
      code: formCode.trim().toUpperCase(),
      reward_type: formType,
      reward: formType === 'gold' ? formReward : 0,
      free_spins: formType === 'free_spins' ? formFreeSpins : 0,
      max_uses: formMaxUses ? parseInt(formMaxUses, 10) : null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('promo_codes').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Código criado!');
    setFormCode(''); setFormReward(50); setFormFreeSpins(1); setFormMaxUses(''); setShowForm(false);
    refetch();
  };

  const toggleActive = async (c: PromoCode) => {
    await supabase.from('promo_codes').update({ is_active: !c.is_active }).eq('id', c.id);
    refetch();
  };

  const remove = async (c: PromoCode) => {
    if (!confirm(`Excluir o código "${c.code}"?`)) return;
    await supabase.from('promo_codes').delete().eq('id', c.id);
    toast.success('Código removido');
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm text-gold flex items-center gap-2">
          <Gift size={16} /> CÓDIGOS PROMOCIONAIS ({codes.length})
        </h3>
        <button onClick={() => setShowForm(s => !s)}
          className="px-3 py-2 bg-gold/10 text-gold border border-gold/30 rounded font-heading text-xs flex items-center gap-1">
          <Plus size={14} /> {showForm ? 'CANCELAR' : 'NOVO'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card p-4 rounded-lg border border-gold/30 space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-display">CÓDIGO</label>
            <input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())}
              placeholder="EX: BONUS50"
              className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm uppercase tracking-wider" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-display block mb-1">TIPO DE RECOMPENSA</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFormType('gold')}
                className={`p-3 rounded font-heading text-xs flex items-center justify-center gap-2 border transition-all ${
                  formType === 'gold' ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-secondary border-border text-muted-foreground'
                }`}>
                <Coins size={14} /> GOLD
              </button>
              <button type="button" onClick={() => setFormType('free_spins')}
                className={`p-3 rounded font-heading text-xs flex items-center justify-center gap-2 border transition-all ${
                  formType === 'free_spins' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary border-border text-muted-foreground'
                }`}>
                <Sparkles size={14} /> ROLETAS GRÁTIS
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {formType === 'gold' ? (
              <div>
                <label className="text-[10px] text-muted-foreground font-display">RECOMPENSA (GOLD)</label>
                <input type="number" min={1} value={formReward} onChange={e => setFormReward(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-muted-foreground font-display">QTD DE ROLETAS GRÁTIS</label>
                <input type="number" min={1} value={formFreeSpins} onChange={e => setFormFreeSpins(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
              </div>
            )}
            <div>
              <label className="text-[10px] text-muted-foreground font-display">USOS MÁX (vazio = ∞)</label>
              <input type="number" min={1} value={formMaxUses} onChange={e => setFormMaxUses(e.target.value)}
                placeholder="Ilimitado"
                className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
            </div>
          </div>
          <button onClick={create}
            className="w-full p-3 bg-gradient-to-r from-gold/30 to-gold/10 text-gold border border-gold/40 rounded font-heading text-xs">
            CRIAR CÓDIGO
          </button>
        </div>
      )}

      {loading && <p className="text-center text-muted-foreground font-display p-6">Carregando...</p>}

      <div className="space-y-2">
        {codes.map(c => (
          <div key={c.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
            c.is_active ? 'bg-card border-border' : 'bg-card/50 border-muted opacity-60'
          }`}>
            <div className="min-w-0">
              <p className="font-heading text-sm text-foreground tracking-wider">{c.code}</p>
              <p className="text-[10px] text-muted-foreground font-display">
                {c.reward_type === 'free_spins'
                  ? <>+{c.free_spins} 🎰 roleta(s) grátis</>
                  : <>+{c.reward}G</>
                }
                {' • '}{c.uses}/{c.max_uses ?? '∞'} usos
                {!c.is_active && ' • DESATIVADO'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleActive(c)}
                className={`p-2 rounded ${c.is_active ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}
                title={c.is_active ? 'Desativar' : 'Ativar'}>
                {c.is_active ? <PowerOff size={14} /> : <Power size={14} />}
              </button>
              <button onClick={() => remove(c)} className="p-2 rounded bg-destructive/10 text-destructive">
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
        {!loading && codes.length === 0 && (
          <p className="text-center text-muted-foreground font-display p-6">Nenhum código criado</p>
        )}
      </div>
    </div>
  );
}
