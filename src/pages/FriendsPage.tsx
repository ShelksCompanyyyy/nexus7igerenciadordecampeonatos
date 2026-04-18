import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { UserPlus, Check, X, Trash, Ban, Search, Users as UsersIcon } from 'lucide-react';

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  username: string;
  game_nick: string;
  unique_id: string;
  avatar: string | null;
}

type TabKey = 'friends' | 'requests' | 'add' | 'blocked';

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('friends');
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    const list = (data || []) as FriendRow[];
    setRows(list);

    const ids = Array.from(new Set(list.flatMap(r => [r.user_id, r.friend_id]))).filter(id => id !== user.id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, username, game_nick, unique_id, avatar')
        .in('user_id', ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach(p => { map[p.user_id] = p as ProfileLite; });
      setProfiles(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  if (!user) return null;

  // Categorize
  const accepted = rows.filter(r => r.status === 'accepted');
  const pendingIncoming = rows.filter(r => r.status === 'pending' && r.friend_id === user.id);
  const pendingOutgoing = rows.filter(r => r.status === 'pending' && r.user_id === user.id);
  const blocked = rows.filter(r => r.status === 'blocked' && r.user_id === user.id);

  const otherIdOf = (r: FriendRow) => r.user_id === user.id ? r.friend_id : r.user_id;

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, game_nick, unique_id, avatar')
      .or(`username.ilike.%${q}%,game_nick.ilike.%${q}%,unique_id.eq.${q}`)
      .neq('user_id', user.id)
      .limit(20);
    setSearchResults((data || []) as ProfileLite[]);
  };

  const sendRequest = async (targetId: string) => {
    // Check if already exists in either direction
    const exists = rows.find(r =>
      (r.user_id === user.id && r.friend_id === targetId) ||
      (r.user_id === targetId && r.friend_id === user.id)
    );
    if (exists) { toast.error('Já existe uma relação com esse usuário'); return; }
    const { error } = await supabase.from('friends').insert({
      user_id: user.id, friend_id: targetId, status: 'pending',
    });
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Pedido enviado!');
    refetch();
  };

  const accept = async (r: FriendRow) => {
    const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Amigo aceito!');
    refetch();
  };

  const reject = async (r: FriendRow) => {
    const { error } = await supabase.from('friends').delete().eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    refetch();
  };

  const remove = async (r: FriendRow) => {
    if (!confirm('Remover este amigo?')) return;
    await supabase.from('friends').delete().eq('id', r.id);
    refetch();
  };

  const block = async (targetId: string) => {
    // Remove existing rows first
    const existing = rows.find(r =>
      (r.user_id === user.id && r.friend_id === targetId) ||
      (r.user_id === targetId && r.friend_id === user.id)
    );
    if (existing) await supabase.from('friends').delete().eq('id', existing.id);
    const { error } = await supabase.from('friends').insert({
      user_id: user.id, friend_id: targetId, status: 'blocked',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Usuário bloqueado');
    refetch();
  };

  const unblock = async (r: FriendRow) => {
    await supabase.from('friends').delete().eq('id', r.id);
    refetch();
  };

  const renderProfile = (id: string) => {
    const p = profiles[id];
    if (!p) return <span className="text-muted-foreground font-display text-sm">Carregando...</span>;
    return (
      <div className="flex items-center gap-3 min-w-0">
        {p.avatar ? <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> :
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center font-heading text-xs text-primary-foreground">
            {p.username?.[0]?.toUpperCase() || '?'}
          </div>}
        <div className="min-w-0">
          <p className="font-display text-sm text-foreground truncate">{p.username}</p>
          <p className="text-[10px] text-muted-foreground font-display truncate">{p.game_nick} • #{p.unique_id}</p>
        </div>
      </div>
    );
  };

  const tabs: { id: TabKey; label: string; count: number }[] = [
    { id: 'friends', label: 'Amigos', count: accepted.length },
    { id: 'requests', label: 'Pedidos', count: pendingIncoming.length },
    { id: 'add', label: 'Adicionar', count: 0 },
    { id: 'blocked', label: 'Bloqueados', count: blocked.length },
  ];

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <UsersIcon size={28} className="text-primary" />
        <div>
          <h1 className="text-xl font-heading text-primary text-glow">AMIGOS</h1>
          <p className="text-xs text-muted-foreground font-display">Gerencie sua lista de amigos</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded font-heading text-xs flex items-center gap-2 transition-all ${
              tab === t.id ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-background/30' : 'bg-primary/20 text-primary'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-muted-foreground font-display p-6">Carregando...</p>}

      {!loading && tab === 'friends' && (
        <div className="space-y-2">
          {accepted.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Você ainda não tem amigos</p>}
          {accepted.map(r => (
            <div key={r.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between gap-3">
              {renderProfile(otherIdOf(r))}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => block(otherIdOf(r))} className="p-2 rounded bg-warning/10 text-warning hover:bg-warning/20" title="Bloquear">
                  <Ban size={14} />
                </button>
                <button onClick={() => remove(r)} className="p-2 rounded bg-destructive/10 text-destructive hover:bg-destructive/20" title="Remover">
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'requests' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-xs text-muted-foreground mb-2">RECEBIDOS ({pendingIncoming.length})</h3>
            {pendingIncoming.length === 0 && <p className="text-xs text-muted-foreground font-display">Nenhum pedido recebido</p>}
            {pendingIncoming.map(r => (
              <div key={r.id} className="bg-card p-3 rounded-lg border border-primary/20 flex items-center justify-between gap-3 mb-2">
                {renderProfile(otherIdOf(r))}
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => accept(r)} className="p-2 rounded bg-success/10 text-success hover:bg-success/20" title="Aceitar">
                    <Check size={14} />
                  </button>
                  <button onClick={() => reject(r)} className="p-2 rounded bg-destructive/10 text-destructive hover:bg-destructive/20" title="Recusar">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-heading text-xs text-muted-foreground mb-2">ENVIADOS ({pendingOutgoing.length})</h3>
            {pendingOutgoing.length === 0 && <p className="text-xs text-muted-foreground font-display">Nenhum pedido enviado</p>}
            {pendingOutgoing.map(r => (
              <div key={r.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between gap-3 mb-2 opacity-80">
                {renderProfile(otherIdOf(r))}
                <button onClick={() => reject(r)} className="p-2 rounded bg-destructive/10 text-destructive" title="Cancelar">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === 'add' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por username, nick ou ID..."
                className="w-full pl-10 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm" />
            </div>
            <button onClick={handleSearch} className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">
              Buscar
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map(p => {
              const existing = rows.find(r =>
                (r.user_id === user.id && r.friend_id === p.user_id) ||
                (r.user_id === p.user_id && r.friend_id === user.id)
              );
              return (
                <div key={p.user_id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between gap-3">
                  {renderProfile(p.user_id) || (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center font-heading text-xs text-primary-foreground">{p.username[0]?.toUpperCase()}</div>
                      <div><p className="font-display text-sm text-foreground">{p.username}</p></div>
                    </div>
                  )}
                  {!existing ? (
                    <button onClick={() => sendRequest(p.user_id)} className="px-3 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 font-heading text-[10px] flex items-center gap-1">
                      <UserPlus size={14} /> ADD
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-display px-2 py-1 rounded bg-muted">
                      {existing.status === 'accepted' ? 'Amigo' : existing.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                    </span>
                  )}
                </div>
              );
            })}
            {search && searchResults.length === 0 && (
              <p className="text-center text-muted-foreground font-display p-4 text-xs">Nenhum usuário encontrado</p>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'blocked' && (
        <div className="space-y-2">
          {blocked.length === 0 && <p className="text-center text-muted-foreground font-display p-6">Nenhum usuário bloqueado</p>}
          {blocked.map(r => (
            <div key={r.id} className="bg-card p-3 rounded-lg border border-warning/30 flex items-center justify-between gap-3">
              {renderProfile(otherIdOf(r))}
              <button onClick={() => unblock(r)} className="px-3 py-2 rounded bg-success/10 text-success font-heading text-[10px]">
                DESBLOQUEAR
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
