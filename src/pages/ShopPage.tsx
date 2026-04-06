import { useAuth } from '@/contexts/AuthContext';
import { SHOP_ITEMS, updateUser } from '@/lib/store';
import { toast } from 'sonner';
import { ShoppingBag, Coins } from 'lucide-react';

export default function ShopPage() {
  const { user, refreshUser } = useAuth();

  const handleBuy = (item: typeof SHOP_ITEMS[0]) => {
    if (!user) return;
    if ((user.gold || 0) < item.price) {
      toast.error('Gold insuficiente!');
      return;
    }
    const updates: any = { gold: (user.gold || 0) - item.price };
    if (item.id === 'colored_nick') updates.coloredNick = true;
    if (item.id.startsWith('badge_')) updates.badges = [...(user.badges || []), item.id];
    if (item.id === 'extra_spin_1') updates.freeSpins = (user.freeSpins || 0) + 1;
    if (item.id === 'extra_spin_5') updates.freeSpins = (user.freeSpins || 0) + 5;
    updateUser(user.id, updates);
    refreshUser();
    toast.success(`${item.name} adquirido!`);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><ShoppingBag size={28} /> LOJA</h1>
      <div className="flex items-center gap-2 text-gold font-heading">
        <Coins size={20} /> Seu saldo: {user?.gold || 0}G
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOP_ITEMS.map(item => (
          <div key={item.id} className="bg-card rounded-lg neon-border p-5 flex flex-col">
            <h3 className="font-heading text-sm text-foreground mb-2">{item.name}</h3>
            <p className="text-sm text-muted-foreground font-display flex-1">{item.description}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="font-heading text-gold">{item.price}G</span>
              <button onClick={() => handleBuy(item)}
                className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs"
              >
                COMPRAR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
