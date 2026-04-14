import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { SHOP_ITEMS, NICK_COLORS, FRAMES } from '@/lib/shopData';
import { toast } from 'sonner';
import { ShoppingBag, Coins, Palette, Frame, Award, Dices } from 'lucide-react';
import type { ShopItem } from '@/lib/shopData';

type Category = 'all' | 'nick_color' | 'frame' | 'badge' | 'spin';

export default function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [category, setCategory] = useState<Category>('all');

  const filtered = category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter(i => i.category === category);

  const alreadyOwned = (item: ShopItem) => {
    if (!profile) return false;
    if (item.category === 'nick_color') return profile.nick_color_id === item.id;
    if (item.category === 'frame') return profile.frame_id === item.id;
    if (item.category === 'badge') return profile.badges?.includes(item.id);
    return false;
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user || !profile) return;
    if (alreadyOwned(item)) { toast.error('Você já possui este item!'); return; }
    if ((profile.gold || 0) < item.price) { toast.error('Gold insuficiente!'); return; }

    const updates: any = { gold: (profile.gold || 0) - item.price };

    if (item.category === 'nick_color') {
      updates.nick_color_id = item.id;
      updates.colored_nick = true;
    }
    if (item.category === 'frame') updates.frame_id = item.id;
    if (item.id.startsWith('badge_')) updates.badges = [...(profile.badges || []), item.id];
    if (item.id === 'extra_spin_1') updates.free_spins = (profile.free_spins || 0) + 1;
    if (item.id === 'extra_spin_5') updates.free_spins = (profile.free_spins || 0) + 5;

    await supabase.from('profiles').update(updates).eq('user_id', user.id);
    await refreshProfile();
    toast.success(`${item.name} adquirido!`);
  };

  const categories: { id: Category; label: string; icon: any }[] = [
    { id: 'all', label: 'Todos', icon: ShoppingBag },
    { id: 'nick_color', label: 'Nicks', icon: Palette },
    { id: 'frame', label: 'Quadros', icon: Frame },
    { id: 'badge', label: 'Badges', icon: Award },
    { id: 'spin', label: 'Giros', icon: Dices },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
        <ShoppingBag size={28} /> LOJA
      </h1>
      <div className="flex items-center gap-2 text-gold font-heading">
        <Coins size={20} /> Seu saldo: {profile?.gold || 0}G
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              category === c.id ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground'
            }`}
          >
            <c.icon size={14} /> {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const owned = alreadyOwned(item);
          const nickColor = item.category === 'nick_color' ? NICK_COLORS.find(c => c.id === item.id) : null;
          const frame = item.category === 'frame' ? FRAMES.find(f => f.id === item.id) : null;

          return (
            <div key={item.id} className={`bg-card rounded-lg neon-border p-5 flex flex-col ${owned ? 'opacity-60' : ''}`}>
              {nickColor && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-heading text-sm" style={{
                    color: nickColor.color.startsWith('linear') ? undefined : nickColor.color,
                    backgroundImage: nickColor.color.startsWith('linear') ? nickColor.color : undefined,
                    WebkitBackgroundClip: nickColor.color.startsWith('linear') ? 'text' : undefined,
                    WebkitTextFillColor: nickColor.color.startsWith('linear') ? 'transparent' : undefined,
                    textShadow: nickColor.color.startsWith('linear') ? 'none' : `0 0 10px ${nickColor.color}`,
                  }}>
                    EXEMPLO_NICK
                  </span>
                </div>
              )}
              {frame && (
                <div className="mb-3 flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center font-heading text-foreground text-lg"
                    style={{ border: frame.borderStyle, boxShadow: frame.glowColor }}>
                    N7
                  </div>
                </div>
              )}

              <h3 className="font-heading text-sm text-foreground mb-2">{item.name}</h3>
              <p className="text-sm text-muted-foreground font-display flex-1">{item.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="font-heading text-gold">{item.price}G</span>
                {owned ? (
                  <span className="px-4 py-2 bg-success/20 text-success rounded font-heading text-xs">EQUIPADO</span>
                ) : (
                  <button onClick={() => handleBuy(item)}
                    className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs"
                  >
                    COMPRAR
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
