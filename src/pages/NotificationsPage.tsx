import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Bell, Trash2, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  read: boolean | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems((data || []) as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  // Realtime: keep list synced when notifications are created/updated/deleted
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetch]);

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setItems(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
    }
    if (n.type === 'withdrawal') navigate('/roulette');
    else if (n.type === 'friend') navigate('/friends');
  };

  const removeOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id);
    setItems(prev => prev.filter(p => p.id !== id));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setItems(prev => prev.map(p => ({ ...p, read: true })));
    toast.success('Todas marcadas como lidas');
  };

  const clearAll = async () => {
    if (!user) return;
    if (!confirm('Limpar todas as notificações?')) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setItems([]);
    toast.success('Notificações limpas');
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
          <Bell size={26} /> NOTIFICAÇÕES
        </h1>
        <div className="flex gap-2">
          <button onClick={markAllRead}
            className="px-3 py-2 bg-secondary text-foreground rounded font-heading text-xs flex items-center gap-1">
            <CheckCheck size={14} /> LER TUDO
          </button>
          <button onClick={clearAll}
            className="px-3 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded font-heading text-xs flex items-center gap-1">
            <Trash2 size={14} /> LIMPAR
          </button>
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground font-display p-6">Carregando...</p>}

      <div className="space-y-2">
        {items.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left p-4 rounded-lg border flex items-start justify-between gap-3 transition-all hover:border-primary/50 ${
              n.read
                ? 'bg-card/50 border-border'
                : n.type === 'withdrawal'
                  ? 'bg-gold/5 border-gold/30'
                  : 'bg-primary/5 border-primary/30'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                <p className="font-heading text-sm text-foreground">{n.title}</p>
              </div>
              <p className="text-xs text-muted-foreground font-display mt-1">{n.message}</p>
              <p className="text-[10px] text-muted-foreground font-display mt-1">
                {new Date(n.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!n.read && <Check size={14} className="text-primary" />}
              <button onClick={e => removeOne(n.id, e)}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                <Trash2 size={14} />
              </button>
            </div>
          </button>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-center text-muted-foreground font-display p-12 text-sm">Nenhuma notificação</p>
        )}
      </div>
    </div>
  );
}
