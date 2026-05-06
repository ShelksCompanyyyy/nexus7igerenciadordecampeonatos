import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Package, Palette, Frame, Crown, Sparkles, Check, Gift, Zap, Ticket, Loader2, X, Star, Coins, Info, Power } from 'lucide-react';
import { toast } from 'sonner';
import { NICK_COLORS, FRAMES } from '@/lib/shopData';
import { RARITY_STYLES, type LuckyRarity } from './lucky/LuckyNexelData';

interface ShopInv { id: string; item_id: string; item_category: string; item_name: string | null; acquired_at: string }
interface LuckyInv { id: string; item_type: string; item_label: string; rarity: LuckyRarity; metadata: any; opened: boolean; acquired_at: string }
interface BoostRow { id: string; boost_type: string; multiplier: number; expires_at: string; active: boolean; activated_at: string | null; consumed_at: string | null }
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
  const [animPhase, setAnimPhase] = useState<'idle' | 'shaking' | 'flash' | 'reveal'>('idle');
  const [animBox, setAnimBox] = useState<{ rarity: LuckyRarity; label: string } | null>(null);

  const reload = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const [shop, lucky, bo, vp, tk] = await Promise.all([
      supabase.from('user_inventory').select('*').eq('user_id', user.id).order('acquired_at', { ascending: false }),
      supabase.from('lucky_inventory').select('*').eq('user_id', user.id).eq('sold' as any, false).order('acquired_at', { ascending: false }),
      supabase.from('lucky_boosts').select('*').eq('user_id', user.id).gt('expires_at', now).is('consumed_at' as any, null),
      supabase.from('lucky_vips').select('*').eq('user_id', user.id).gt('expires_at', now),
      supabase.from('lucky_tickets').select('*').eq('user_id', user.id).eq('used', false),
    ]);
    setShopItems((shop.data as any) || []);
    setLuckyItems((lucky.data as any) || []);
    setBoosts((bo.data as any) || []);
    setVips((vp.data as any) || []);
    setTickets((tk.data as any) || []);
  };

  const sellVisual = async (invId: string, rarity: LuckyRarity) => {
    if (rarity !== 'common' && rarity !== 'rare') return toast.error('Apenas visuais comuns e raros podem ser vendidos.');
    if (!confirm(`Vender este visual por ${rarity === 'common' ? 50 : 200} NexelGolds?`)) return;
    const { data, error } = await supabase.rpc('lucky_sell_visual' as any, { _inv_id: invId });
    if (error) return toast.error(error.message);
    toast.success(`+${(data as any)?.gold || 0} NexelGolds`);
    reload(); refreshProfile();
  };

  const activateBoost = async (boostId: string) => {
    const { error } = await supabase.rpc('lucky_activate_boost' as any, { _boost_id: boostId });
    if (error) return toast.error(error.message);
    toast.success('Boost ativado! Próximo giro terá +10% de chance de prêmio raro.');
    reload();
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

  const equipLucky = async (id: string) => {
    if (!user) return;
    await (supabase.from('profiles') as any).update({ equipped_lucky_id: id }).eq('user_id', user.id);
    toast.success('Equipado no perfil!'); refreshProfile();
  };
  const unequipLucky = async () => {
    if (!user) return;
    await (supabase.from('profiles') as any).update({ equipped_lucky_id: null }).eq('user_id', user.id);
    toast.success('Removido do perfil'); refreshProfile();
  };

  const openBox = async (invId: string) => {
    const target = boxes.find(b => b.id === invId);
    setOpening(invId);
    setAnimBox({ rarity: target?.rarity || 'rare', label: target?.item_label || 'Caixa' });
    setAnimPhase('shaking');
    try {
      // Anima por 1.6s, depois flash, depois chama RPC e revela
      const rpcPromise = supabase.rpc('lucky_open_box' as any, { _inv_id: invId });
      await new Promise(r => setTimeout(r, 1600));
      setAnimPhase('flash');
      await new Promise(r => setTimeout(r, 500));
      const { data, error } = await rpcPromise;
      if (error) throw error;
      const res = data as any;
      if (!res || res.success === false) throw new Error(res?.error || 'Falha ao abrir');
      const rarity = (res.rarity || 'rare') as LuckyRarity;
      const emoji =
        res.type === 'gold' ? '🪙' :
        res.type === 'visual' ? '🎨' :
        res.type === 'vip' ? '👑' :
        res.type === 'ticket' ? '🎟️' :
        res.type === 'boost' ? '⚡' : '🎁';
      setAnimPhase('reveal');
      setBoxResult({ label: res.label || 'Recompensa', rarity, emoji });
      reload();
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao abrir caixa');
      setAnimPhase('idle');
      setAnimBox(null);
    } finally {
      setOpening(null);
    }
  };

  const closeBoxModal = () => {
    setBoxResult(null);
    setAnimPhase('idle');
    setAnimBox(null);
  };

  const groupedShop = shopItems.reduce<Record<string, ShopInv[]>>((acc, it) => {
    (acc[it.item_category] ||= []).push(it); return acc;
  }, {});

  const boxes = luckyItems.filter(i => i.item_type.startsWith('box_') && !i.opened);
  const luckyOthers = luckyItems.filter(i => !i.item_type.startsWith('box_') || i.opened);

  const activeBoosts = boosts.filter(b => b.active);
  const availableBoosts = boosts.filter(b => !b.active);
  const activatedToday = boosts.filter(b => {
    if (!b.activated_at) return false;
    const d = new Date(b.activated_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

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
            <p className="font-heading text-sky-200 text-base">{activeBoosts.length}/{boosts.length}</p>
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

      {/* BOOSTS — gerenciamento */}
      {boosts.length > 0 && (
        <div className="bg-card border-2 border-sky-500/40 rounded-xl p-4 space-y-3 shadow-[0_0_18px_rgba(56,189,248,0.2)]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm text-sky-200 flex items-center gap-2">
              <Zap size={16} /> BOOSTS ({boosts.length}/6)
            </h3>
            <span className="text-[10px] text-sky-300/70 font-display">Hoje: {activatedToday}/2 ativados</span>
          </div>
          <div className="bg-sky-950/40 border border-sky-500/30 rounded-lg p-2.5 text-[10px] text-sky-100/90 font-display flex gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>
              Cada Boost ativo aumenta em <b>+10%</b> a chance de prêmios raros ou superiores no <b>próximo giro</b>.
              Limite: <b>2 boosters/dia</b> e <b>6 no inventário</b> (excedente vira 100g cada automaticamente).
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {boosts.map(b => (
              <div key={b.id} className={`rounded-lg border-2 p-2 text-center ${b.active ? 'border-amber-400 bg-amber-900/30 shadow-[0_0_14px_rgba(251,191,36,0.5)]' : 'border-sky-500/40 bg-sky-900/20'}`}>
                <Zap className={`mx-auto ${b.active ? 'text-amber-300' : 'text-sky-300'}`} size={18} />
                <p className={`text-[10px] font-heading mt-0.5 ${b.active ? 'text-amber-200' : 'text-sky-200'}`}>+10% raro</p>
                <p className="text-[9px] text-muted-foreground font-display">
                  {b.active ? 'ATIVO (próx. giro)' : `Exp: ${new Date(b.expires_at).toLocaleDateString('pt-BR')}`}
                </p>
                {!b.active && (
                  <button
                    onClick={() => activateBoost(b.id)}
                    disabled={activatedToday >= 2}
                    className="mt-1.5 w-full text-[10px] py-1 rounded bg-sky-500 hover:bg-sky-400 text-white font-heading flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <Power size={10} /> Ativar
                  </button>
                )}
              </div>
            ))}
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
              const isEquipped = (profile as any)?.equipped_lucky_id === it.id;
              const isVisual = it.item_type === 'visual_item';
              const sellable = isVisual && (it.rarity === 'common' || it.rarity === 'rare');
              const sellPrice = it.rarity === 'common' ? 50 : 200;
              return (
                <div key={it.id} className={`rounded-lg border-2 ${isEquipped ? 'border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.6)]' : r.border} ${r.bg} p-2.5 space-y-1.5`}>
                  <p className={`font-heading text-xs ${r.text}`}>{it.item_label}</p>
                  <p className="text-[10px] text-muted-foreground font-display uppercase">{it.rarity}</p>
                  {isEquipped ? (
                    <button onClick={unequipLucky} className="w-full text-[10px] py-1 rounded bg-destructive/20 text-destructive font-display flex items-center justify-center gap-1">
                      <X size={10} /> Desequipar
                    </button>
                  ) : (
                    <button onClick={() => equipLucky(it.id)} className="w-full text-[10px] py-1 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 font-display flex items-center justify-center gap-1">
                      <Star size={10} /> Equipar
                    </button>
                  )}
                  {sellable && !isEquipped && (
                    <button onClick={() => sellVisual(it.id, it.rarity)}
                      className="w-full text-[10px] py-1 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 font-display flex items-center justify-center gap-1">
                      <Coins size={10} /> Vender ({sellPrice}g)
                    </button>
                  )}
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

      {/* Modal animação + resultado caixa */}
      {animBox && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
          {/* Flash overlay */}
          {animPhase === 'flash' && (
            <div className="absolute inset-0 bg-white animate-[fadeOut_0.5s_ease-out_forwards] pointer-events-none"
              style={{ animation: 'fadeOut 0.5s ease-out forwards' }} />
          )}
          {/* Light rays on reveal */}
          {animPhase === 'reveal' && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(217,70,239,0.35) 0%, transparent 60%)' }} />
          )}
          <div className="relative w-full max-w-sm flex flex-col items-center">
            {(animPhase === 'shaking' || animPhase === 'flash') && (
              <div className={`relative ${animPhase === 'shaking' ? 'animate-[boxShake_0.4s_ease-in-out_infinite]' : 'scale-150 transition-transform duration-500'}`}>
                <div className={`text-[120px] drop-shadow-[0_0_30px_rgba(217,70,239,0.9)] ${RARITY_STYLES[animBox.rarity].text}`}>
                  📦
                </div>
                <p className={`text-center font-heading text-sm uppercase tracking-widest mt-2 ${RARITY_STYLES[animBox.rarity].text}`}>
                  {animBox.label}
                </p>
              </div>
            )}
            {animPhase === 'reveal' && boxResult && (
              <div className={`relative bg-card border-2 ${RARITY_STYLES[boxResult.rarity].border} ${RARITY_STYLES[boxResult.rarity].glow} rounded-2xl p-6 w-full text-center space-y-3 animate-scale-in`}>
                <button onClick={closeBoxModal} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
                <p className="text-[11px] uppercase font-display text-muted-foreground tracking-widest">Você ganhou</p>
                <div className="text-7xl drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-[bounce_1s_ease-in-out_infinite]">{boxResult.emoji}</div>
                <p className={`font-heading text-xl ${RARITY_STYLES[boxResult.rarity].text}`}>{boxResult.label}</p>
                <p className="text-[10px] uppercase text-muted-foreground font-display tracking-widest">{boxResult.rarity}</p>
                <button onClick={closeBoxModal} className="w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-heading text-sm shadow-[0_0_18px_rgba(217,70,239,0.5)]">
                  Continuar
                </button>
              </div>
            )}
          </div>
          <style>{`
            @keyframes boxShake {
              0%,100% { transform: rotate(-8deg) scale(1); }
              25%     { transform: rotate(8deg) scale(1.05); }
              50%     { transform: rotate(-6deg) scale(0.98); }
              75%     { transform: rotate(6deg) scale(1.05); }
            }
            @keyframes fadeOut {
              0% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}