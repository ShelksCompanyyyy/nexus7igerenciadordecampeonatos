import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Package, Palette, Frame, Crown, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { NICK_COLORS, FRAMES } from '@/lib/shopData';

interface InvItem { id: string; item_id: string; item_category: string; item_name: string | null; acquired_at: string }

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  nick_color: { label: 'Cores de Nick', icon: Palette, color: 'text-purple-400' },
  frame: { label: 'Molduras', icon: Frame, color: 'text-yellow-400' },
  badge: { label: 'Emblemas', icon: Crown, color: 'text-pink-400' },
  effect: { label: 'Efeitos', icon: Sparkles, color: 'text-cyan-400' },
};

export default function InventoryPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<InvItem[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_inventory').select('*').eq('user_id', user.id)
      .order('acquired_at', { ascending: false }).then(({ data }) => setItems((data as any) || []));
  }, [user]);

  const equipColor = async (id: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ nick_color_id: id, colored_nick: true }).eq('user_id', user.id);
    toast.success('Cor equipada!');
    refreshProfile();
  };
  const equipFrame = async (id: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ frame_id: id }).eq('user_id', user.id);
    toast.success('Moldura equipada!');
    refreshProfile();
  };
  const removeColor = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ nick_color_id: null, colored_nick: false }).eq('user_id', user.id);
    toast.success('Cor removida');
    refreshProfile();
  };
  const removeFrame = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ frame_id: null }).eq('user_id', user.id);
    toast.success('Moldura removida');
    refreshProfile();
  };

  const grouped = items.reduce<Record<string, InvItem[]>>((acc, it) => {
    (acc[it.item_category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Package size={24} /> INVENTÁRIO
      </h1>
      <p className="text-xs text-muted-foreground font-display">
        Equipe ou troque seus cosméticos a qualquer momento. Nada some quando você desequipa.
      </p>

      {Object.keys(grouped).length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Package className="mx-auto text-muted-foreground mb-2" size={32} />
          <p className="text-sm font-display text-muted-foreground">Inventário vazio. Compre itens na Loja!</p>
        </div>
      )}

      {Object.entries(grouped).map(([cat, list]) => {
        const meta = CATEGORY_LABELS[cat] || { label: cat, icon: Package, color: 'text-primary' };
        const Icon = meta.icon;
        return (
          <div key={cat} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className={`font-heading text-sm flex items-center gap-2 ${meta.color}`}>
              <Icon size={16} /> {meta.label} ({list.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {list.map(it => {
                const equipped =
                  (cat === 'nick_color' && profile?.nick_color_id === it.item_id) ||
                  (cat === 'frame' && profile?.frame_id === it.item_id);
                const colorMeta = cat === 'nick_color' ? NICK_COLORS.find(c => c.id === it.item_id) : null;
                const frameMeta = cat === 'frame' ? FRAMES.find(f => f.id === it.item_id) : null;
                return (
                  <div key={it.id} className={`rounded-lg border p-2.5 ${equipped ? 'border-primary neon-border' : 'border-border'}`}>
                    <p className="font-heading text-xs text-foreground truncate">
                      {colorMeta?.name || frameMeta?.name || it.item_name || it.item_id}
                    </p>
                    {colorMeta && (
                      <div className="my-1.5 h-2 rounded" style={{ background: colorMeta.color }} />
                    )}
                    {cat === 'nick_color' && (
                      equipped
                        ? <button onClick={removeColor} className="w-full text-[10px] py-1 rounded bg-destructive/20 text-destructive font-display">Desequipar</button>
                        : <button onClick={() => equipColor(it.item_id)} className="w-full text-[10px] py-1 rounded bg-primary text-primary-foreground font-display flex items-center justify-center gap-1"><Check size={10} />Equipar</button>
                    )}
                    {cat === 'frame' && (
                      equipped
                        ? <button onClick={removeFrame} className="w-full text-[10px] py-1 rounded bg-destructive/20 text-destructive font-display">Desequipar</button>
                        : <button onClick={() => equipFrame(it.item_id)} className="w-full text-[10px] py-1 rounded bg-primary text-primary-foreground font-display flex items-center justify-center gap-1"><Check size={10} />Equipar</button>
                    )}
                    {cat !== 'nick_color' && cat !== 'frame' && (
                      <p className="text-[10px] text-muted-foreground font-display">Adquirido</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}