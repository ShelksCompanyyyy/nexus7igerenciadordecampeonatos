import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SHOP_ITEMS, NICK_COLORS, FRAMES } from '@/lib/shopData';
import { toast } from 'sonner';
import { ShoppingBag, Coins, Palette, Frame, Award, Dices, Sparkles, Search, Check, Lock } from 'lucide-react';
import type { ShopItem } from '@/lib/shopData';

type Category = 'all' | 'nick_color' | 'frame' | 'badge' | 'spin';

const CATEGORY_META: Record<Exclude<Category, 'all'>, { emoji: string; gradient: string; accent: string; label: string }> = {
  nick_color: { emoji: '🎨', gradient: 'from-fuchsia-500/20 via-purple-500/10 to-cyan-500/20',  accent: 'border-fuchsia-500/40', label: 'NICKS COLORIDOS' },
  frame:      { emoji: '🖼️', gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/20',     accent: 'border-amber-500/40',  label: 'QUADROS DE PERFIL' },
  badge:      { emoji: '🏅', gradient: 'from-yellow-500/20 via-amber-500/10 to-red-500/20',      accent: 'border-yellow-500/40', label: 'BADGES EXCLUSIVAS' },
  spin:       { emoji: '🎰', gradient: 'from-emerald-500/20 via-teal-500/10 to-blue-500/20',     accent: 'border-emerald-500/40',label: 'GIROS DA ROLETA' },
};

const BADGE_VISUAL: Record<string, { emoji: string; tint: string }> = {
  badge_vip:     { emoji: '👑', tint: '#FFD700' },
  badge_legend:  { emoji: '🌟', tint: '#FFA500' },
  badge_pro:     { emoji: '🎯', tint: '#00BFFF' },
  badge_mvp:     { emoji: '🏆', tint: '#FF4500' },
  badge_killer:  { emoji: '💀', tint: '#888888' },
  badge_clutch:  { emoji: '🔱', tint: '#BF00FF' },
  badge_fire:    { emoji: '🔥', tint: '#FF6600' },
  badge_diamond: { emoji: '💎', tint: '#B9F2FF' },
  badge_founder: { emoji: '🛡️', tint: '#FFD700' },
};

const SPIN_VISUAL: Record<string, { emoji: string; spins: number }> = {
  extra_spin_1:  { emoji: '🎲', spins: 1 },
  extra_spin_5:  { emoji: '🎰', spins: 5 },
  extra_spin_10: { emoji: '🍀', spins: 10 },
  extra_spin_25: { emoji: '💫', spins: 25 },
  extra_spin_50: { emoji: '🚀', spins: 50 },
};

function nickStyle(color: string): React.CSSProperties {
  if (color.startsWith('linear')) {
    return {
      backgroundImage: color,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    };
  }
  return { color, textShadow: `0 0 10px ${color}, 0 0 20px ${color}` };
}

export default function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  const alreadyOwned = (item: ShopItem) => {
    if (!profile) return false;
    if (item.category === 'nick_color') return profile.nick_color_id === item.id;
    if (item.category === 'frame') return profile.frame_id === item.id;
    if (item.category === 'badge') return profile.badges?.includes(item.id);
    return false; // spins are repeatable
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user || !profile) return;
    if (alreadyOwned(item)) { toast.error('Você já possui este item!'); return; }
    if ((profile.gold || 0) < item.price) { toast.error('NexelGolds insuficientes!'); return; }

    const updates: any = { gold: (profile.gold || 0) - item.price };

    if (item.category === 'nick_color') {
      updates.nick_color_id = item.id;
      updates.colored_nick = true;
    }
    if (item.category === 'frame') updates.frame_id = item.id;
    if (item.category === 'badge') updates.badges = [...(profile.badges || []), item.id];
    if (item.category === 'spin') {
      const spin = SPIN_VISUAL[item.id];
      if (spin) updates.free_spins = (profile.free_spins || 0) + spin.spins;
    }

    await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (['nick_color', 'frame', 'badge'].includes(item.category)) {
      await supabase.rpc('announce_purchase', { _item_name: item.name, _category: item.category });
    }

    // Anunciar para amigos no chat privado
    try {
      const { data: friendsRows } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      const friendIds = (friendsRows || [])
        .map(r => (r.user_id === user.id ? r.friend_id : r.user_id))
        .filter(Boolean);
      if (friendIds.length) {
        const nick = profile.game_nick || profile.username || 'Seu amigo';
        const text = `🛍️ ${nick} acabou de adquirir: ${item.name}!`;
        const rows = friendIds.map(fid => ({
          sender_id: user.id,
          recipient_id: fid,
          message: text,
        }));
        await supabase.from('friend_messages').insert(rows);
      }
    } catch (e) {
      // não bloqueia a compra
      console.warn('friend announce skipped', e);
    }

    await refreshProfile();
    toast.success(`✨ ${item.name} adquirido!`);
  };

  const categories: { id: Category; label: string; emoji: string }[] = [
    { id: 'all', label: 'Todos', emoji: '🛍️' },
    { id: 'nick_color', label: 'Nicks', emoji: '🎨' },
    { id: 'frame', label: 'Quadros', emoji: '🖼️' },
    { id: 'badge', label: 'Badges', emoji: '🏅' },
    { id: 'spin', label: 'Giros', emoji: '🎰' },
  ];

  const counts = useMemo(() => {
    return {
      nick_color: SHOP_ITEMS.filter(i => i.category === 'nick_color').length,
      frame: SHOP_ITEMS.filter(i => i.category === 'frame').length,
      badge: SHOP_ITEMS.filter(i => i.category === 'badge').length,
      spin: SHOP_ITEMS.filter(i => i.category === 'spin').length,
    };
  }, []);

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* HERO */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-fuchsia-500/10 p-6">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={22} className="text-primary" />
              <h1 className="text-2xl font-heading text-primary text-glow tracking-widest">LOJA NEXEL</h1>
            </div>
            <p className="text-xs font-display text-muted-foreground max-w-md">
              Personalize seu perfil com nicks brilhantes, quadros animados, badges raros e turbine suas chances na roleta. ✨
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 backdrop-blur border border-gold/40">
              <Coins size={18} className="text-gold" />
              <span className="font-heading text-gold text-sm">{profile?.gold || 0} NexelGolds</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-card/80 backdrop-blur border border-primary/40">
              <Sparkles size={14} className="text-primary" />
              <span className="font-heading text-primary text-xs">{profile?.free_spins || 0} giros</span>
            </div>
          </div>
        </div>

        {/* category strip stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
          {(Object.keys(counts) as (keyof typeof counts)[]).map(key => (
            <button
              key={key}
              onClick={() => setCategory(key as Category)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                category === key ? 'border-primary bg-primary/10' : 'border-border bg-card/40 hover:border-primary/40'
              }`}
            >
              <span className="text-xl">{CATEGORY_META[key as Exclude<Category,'all'>].emoji}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-heading text-muted-foreground tracking-wider truncate">
                  {CATEGORY_META[key as Exclude<Category,'all'>].label}
                </p>
                <p className="text-xs font-heading text-foreground">{counts[key]} itens</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap flex-1">
          {categories.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`px-3 py-2 rounded-lg font-heading text-[11px] flex items-center gap-1.5 transition-all border ${
                category === c.id
                  ? 'gradient-primary text-primary-foreground box-glow-sm border-transparent'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              }`}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar item..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm font-display text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const owned = alreadyOwned(item);
          const meta = CATEGORY_META[item.category];
          const canAfford = (profile?.gold || 0) >= item.price;

          // Visual blocks per category
          let preview: JSX.Element | null = null;
          if (item.category === 'nick_color') {
            const nc = NICK_COLORS.find(c => c.id === item.id);
            if (nc) {
              preview = (
                <div className="h-24 rounded-lg flex items-center justify-center bg-gradient-to-br from-background to-card overflow-hidden relative">
                  <span className="font-heading text-xl tracking-widest" style={nickStyle(nc.color)}>NEXEL</span>
                  <span className="absolute bottom-1 right-2 text-[9px] font-display text-muted-foreground">PREVIEW</span>
                </div>
              );
            }
          } else if (item.category === 'frame') {
            const f = FRAMES.find(fr => fr.id === item.id);
            if (f) {
              preview = (
                <div className="h-24 rounded-lg flex items-center justify-center bg-gradient-to-br from-background to-card">
                  <div
                    className="w-16 h-16 rounded-full bg-card flex items-center justify-center font-heading text-foreground text-xl"
                    style={{ border: f.borderStyle, boxShadow: f.glowColor }}
                  >
                    N
                  </div>
                </div>
              );
            }
          } else if (item.category === 'badge') {
            const b = BADGE_VISUAL[item.id] || { emoji: '🏅', tint: '#FFD700' };
            preview = (
              <div className="h-24 rounded-lg flex items-center justify-center bg-gradient-to-br from-background to-card relative overflow-hidden">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{
                    background: `radial-gradient(circle, ${b.tint}33, transparent 70%)`,
                    boxShadow: `0 0 20px ${b.tint}80`,
                  }}
                >
                  {b.emoji}
                </div>
              </div>
            );
          } else if (item.category === 'spin') {
            const s = SPIN_VISUAL[item.id] || { emoji: '🎰', spins: 1 };
            preview = (
              <div className="h-24 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-blue-500/10 relative overflow-hidden">
                <span className="text-5xl">{s.emoji}</span>
                <span className="absolute top-1 right-2 text-[10px] font-heading text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                  +{s.spins} GIROS
                </span>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className={`relative rounded-xl border p-4 flex flex-col gap-3 transition-all bg-gradient-to-b ${
                meta ? meta.gradient : 'from-card to-card'
              } ${owned ? 'opacity-60 ' + (meta?.accent || 'border-border') : (meta?.accent || 'border-border') + ' hover:border-primary/60'}`}
            >
              {meta && (
                <span className="absolute top-2 left-2 text-[9px] font-heading text-muted-foreground bg-background/70 backdrop-blur px-2 py-0.5 rounded-full border border-border">
                  {meta.emoji} {meta.label}
                </span>
              )}
              {owned && (
                <span className="absolute top-2 right-2 text-[9px] font-heading text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/40 flex items-center gap-1">
                  <Check size={10} /> EQUIPADO
                </span>
              )}

              <div className="pt-5">{preview}</div>

              <div>
                <h3 className="font-heading text-sm text-foreground">{item.name}</h3>
                <p className="text-[11px] text-muted-foreground font-display mt-0.5 line-clamp-2">{item.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                <span className="font-heading text-gold text-sm flex items-center gap-1">
                  <Coins size={12} /> {item.price}
                </span>
                {owned ? (
                  <span className="px-3 py-1.5 bg-success/15 text-success rounded font-heading text-[10px] flex items-center gap-1">
                    <Check size={12} /> EQUIPADO
                  </span>
                ) : !canAfford ? (
                  <button disabled
                    className="px-3 py-1.5 bg-muted text-muted-foreground rounded font-heading text-[10px] flex items-center gap-1 cursor-not-allowed">
                    <Lock size={12} /> SEM SALDO
                  </button>
                ) : (
                  <button onClick={() => handleBuy(item)}
                    className="px-3 py-1.5 gradient-primary text-primary-foreground rounded font-heading text-[10px] hover:opacity-90 box-glow-sm">
                    COMPRAR
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground font-display text-sm border border-dashed border-border rounded-xl">
            🛒 Nenhum item encontrado
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="text-center text-[10px] font-display text-muted-foreground">
        💡 Ganhe NexelGolds girando a roleta diária ou completando MatchCWs.
      </p>
    </div>
  );
}
