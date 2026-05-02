import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Package, Palette, Frame, Crown, Sparkles, Check, Gift, Zap, Ticket, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { NICK_COLORS, FRAMES } from '@/lib/shopData';
import { RARITY_STYLES, type LuckyRarity } from './lucky/LuckyNexelData';

interface ShopInv { id: string; item_id: string; item_category: string; item_name: string | null; acquired_at: string }
interface LuckyInv { id: string; item_type: string; item_label: string; rarity: LuckyRarity; metadata: any; opened: boolean; acquired_at: string }
interface BoostRow { id: string; boost_type: string; multiplier: number; expires_at: string }
interface VipRow { id: string; days: number; expires_at: string }
interface TicketRow { id: string; used: boolean; acquired_at: string }

const SHOP_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  nick_color: { label: 'Cores de Nick', icon: Palette, color: 'text-purple-400' },
  frame: { label: 'Molduras', icon: Frame, color: 'text-yellow-400' },
  badge: { label: 'Emblemas', icon: Crown, color: 'text-pink-400' },
  effect: { label: 'Efeitos', icon: Sparkles, color: 'text-cyan-400' },
};

export default function InventoryPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [shopItems, setShopItems] = useState<ShopInv[]>([]);
  const [luckyItems, setLuckyItems] = useState<LuckyInv[]>([]);
  const [boosts, setBoosts] = useState<BoostRow[]>([]);
  const [vips, setVips] = useState<VipRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [boxResult, setBoxResult] = useState<{ label: string; rarity: LuckyRarity; emoji: string } | null>(null);

  const reload = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const [shop, lucky, bo, vp, tk] = await Promise.all([
      supabase.from('user_inventory').select('*').eq('user_id', user.id).order('acquired_at', { ascending: false }),
      supabase.from('lucky_inventory').select('*').eq('user_id', user.id).order('acquired_at', { ascending: false }),
      supabase.from('lucky_boosts').select('*').eq('user_id', user.id).gt('expires_at', now),
      supabase.from('lucky_vips').select('*').eq('user_id', user.id).gt('expires_at', now),
      supabase.from('lucky_tickets').select('*').eq('user_id', user.id).eq('used', false),
    ]);
    setShopItems((shop.data as any) || []);
    setLuckyItems((lucky.data as any) || []);
    setBoosts((bo.data as any) || []);
    setVips((vp.data as any) || []);
    setTickets((tk.data as any) || []);
  };

  useEffect(() => { reload(); }, [user]);

  const equipColor = async (id: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ nick_color_id: id, colored_nick: true }).eq('user_id', user.id);
    toast.success('Cor equipada!'); refreshProfile();
  };
  const equipFrame = async (id: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ frame_id: id }).eq('user_id', user.id);
    toast.success('Moldura equipada!'); refreshProfile();
  };
  const removeColor = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ nick_color_id: null, colored_nick: false }).eq('user_id', user.id);
    toast.success('Cor removida'); refreshProfile();
  };
  const removeFrame = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ frame_id: null }).eq('user_id', user.id);
    toast.success('Moldura removida'); refreshProfile();
  };

  const openBox = async (invId: string) => {
    setOpening(invId);
    try {
      const { data, error } = await supabase.rpc('lucky_open_box' as any, { _inv_id: invId });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error || 'Falha ao abrir');
      setBoxResult({
        label: res.reward_label || 'Recompensa',
        rarity: (res.rarity || 'rare') as LuckyRarity,
        emoji: res.emoji || '🎁',
      });
      reload();
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao abrir caixa');
    } finally {
      setOpening(null);
    }
  };

  const groupedShop = shopItems.reduce<Record<string, ShopInv[]>>((acc, it) => {
    (acc[it.item_category] ||= []).push(it); return acc;
  }, {});

  const boxes = luckyItems.filter(i => i.item_type.startsWith('box_') && !i.opened);
  const luckyOthers = luckyItems.filter(i => !i.item_type.startsWith('box_') || i.opened);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up pb-10">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Package size={24} /> INVENTÁRIO
      </h1>

      {/* Status ativos */}
      {(boosts.length > 0 || vips.length > 0 || tickets.length > 0) && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-sky-900/30 border border-sky-400/40 rounded-lg p-2.5 text-center">
            <Zap className="mx-auto text-sky-300 mb-1" size={18} />
            <p className="text-[10px] text-muted-foreground font-display">Boosts ativos</p>
            <p className="font-heading text-sky-200 text-base">{boosts.length}</p>
          </div>
          <div className="bg-amber-900/30 border border-amber-400/40 rounded-lg p-2.5 text-center">
            <Crown className="mx-auto text-amber-300 mb-1" size={18} />
            <p className="text-[10px] text-muted-foreground font-display">VIP ativo</p>
            <p className="font-heading text-amber-200 text-base">{vips.length > 0 ? 'Sim' : 'Não'}</p>
          </div>
          <div className="bg-fuchsia-900/30 border border-fuchsia-400/40 rounded-lg p-2.5 text-center">
            <Ticket className="mx-auto text-fuchsia-300 mb-1" size={18} />
            <p className="text-[10px] text-muted-foreground font-display">Tickets CW</p>
            <p className="font-heading text-fuchsia-200 text-base">{tickets.length}</p>
          </div>
        </div>
      )}

      {/* Caixas Lucky Nexel */}
      {boxes.length > 0 && (
        <div className="bg-card border-2 border-fuchsia-500/40 rounded-xl p-4 space-y-3 shadow-[0_0_18px_rgba(217,70,239,0.25)]">
          <h3 className="font-heading text-sm text-fuchsia-200 flex items-center gap-2">
            <Gift size={16} /> CAIXAS PARA ABRIR ({boxes.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {boxes.map(b => {
              const r = RARITY_STYLES[b.rarity] || RARITY_STYLES.rare;
              return (
                <div key={b.id} className={`rounded-xl border-2 ${r.border} ${r.bg} ${r.glow} p-3 text-center`}>
                  <div className="text-3xl">📦</div>
                  <p className={`font-heading text-xs mt-1 ${r.text}`}>{b.item_label}</p>
                  <button onClick={() => openBox(b.id)} disabled={opening === b.id}
                    className="mt-2 w-full text-[11px] py-1.5 rounded bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-heading flex items-center justify-center gap-1 disabled:opacity-50">
                    {opening === b.id ? <Loader2 className="animate-spin" size={12} /> : 'Abrir'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recompensas Lucky reivindicadas */}
      {luckyOthers.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-heading text-sm text-primary flex items-center gap-2">
            <Sparkles size={16} /> RECOMPENSAS LUCKY NEXEL
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {luckyOthers.map(it => {
              const r = RARITY_STYLES[it.rarity] || RARITY_STYLES.common;
              return (
                <div key={it.id} className={`rounded-lg border ${r.border} ${r.bg} p-2.5`}>
                  <p className={`font-heading text-xs ${r.text}`}>{it.item_label}</p>
                  <p className="text-[10px] text-muted-foreground font-display uppercase">{it.rarity}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cosméticos da loja */}
      {Object.keys(groupedShop).length === 0 && luckyItems.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Package className="mx-auto text-muted-foreground mb-2" size={32} />
          <p className="text-sm font-display text-muted-foreground">Inventário vazio. Compre na Loja ou gire no Lucky Nexel!</p>
        </div>
      )}

      {Object.entries(groupedShop).map(([cat, list]) => {
        const meta = SHOP_LABELS[cat] || { label: cat, icon: Package, color: 'text-primary' };
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
                    {colorMeta && <div className="my-1.5 h-2 rounded" style={{ background: colorMeta.color }} />}
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

      {/* Modal resultado caixa */}
      {boxResult && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur flex items-center justify-center p-4">
          <div className={`relative bg-card border-2 ${RARITY_STYLES[boxResult.rarity].border} ${RARITY_STYLES[boxResult.rarity].glow} rounded-2xl p-6 w-full max-w-sm text-center space-y-3 animate-scale-in`}>
            <button onClick={() => setBoxResult(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <p className="text-[11px] uppercase font-display text-muted-foreground">Você ganhou</p>
            <div className="text-6xl">{boxResult.emoji}</div>
            <p className={`font-heading text-lg ${RARITY_STYLES[boxResult.rarity].text}`}>{boxResult.label}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-display">{boxResult.rarity}</p>
            <button onClick={() => setBoxResult(null)} className="w-full py-2 rounded bg-primary text-primary-foreground font-heading text-sm">
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}