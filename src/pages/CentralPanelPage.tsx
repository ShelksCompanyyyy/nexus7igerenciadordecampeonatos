import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Settings, Plus, Trash2, Award, Save, Star, Crown, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface Trophy { id: string; name: string; description: string | null; icon: string; color: string; kind: string }
interface Winner { id: string; trophy_id: string; user_id: string | null; team_id: string | null; clan_id: string | null; notes: string | null; awarded_at: string }
interface Profile { user_id: string; username: string; game_nick: string }
interface Team { id: string; name: string; clan_id: string }
interface Clan { id: string; name: string; owner_id: string }

type Tab = 'trophies' | 'winners' | 'settings' | 'discounts';

export default function CentralPanelPage() {
  const { user, profile, isSuperAdminUser } = useAuth();
  const [tab, setTab] = useState<Tab>('trophies');
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [dailyTickets, setDailyTickets] = useState<number>(3);
  const [vipDiscount, setVipDiscount] = useState<number>(0);
  const [isClanLeader, setIsClanLeader] = useState(false);

  // Trophy form
  const [tForm, setTForm] = useState({ name: '', description: '', icon: '🏆', color: '#FFD700', kind: 'trophy' });
  // Award form
  const [aForm, setAForm] = useState({ trophy_id: '', user_id: '', team_id: '', clan_id: profile?.clan_id || '', notes: '' });

  const load = async () => {
    const [tr, wn, pf, tm, cl, st, sv] = await Promise.all([
      supabase.from('xtreino_trophies').select('*').order('created_at', { ascending: false }),
      supabase.from('xtreino_winners').select('*').order('awarded_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('user_id,username,game_nick').limit(1000),
      supabase.from('teams').select('id,name,clan_id'),
      supabase.from('clans').select('id,name,owner_id'),
      supabase.from('admin_settings').select('*').eq('key', 'daily_cw_tickets').maybeSingle(),
      supabase.from('admin_settings').select('*').eq('key', 'vip_discount_percent').maybeSingle(),
    ]);
    setTrophies((tr.data as any) || []);
    setWinners((wn.data as any) || []);
    setProfiles((pf.data as any) || []);
    setTeams((tm.data as any) || []);
    setClans((cl.data as any) || []);
    if (st.data) setDailyTickets((st.data as any).value?.count ?? 3);
    if (sv.data) setVipDiscount((sv.data as any).value?.percent ?? 0);
    if (user && profile?.clan_id) {
      const { data } = await supabase.from('clan_members').select('role').eq('clan_id', profile.clan_id).eq('user_id', user.id).maybeSingle();
      setIsClanLeader(!!data && (data.role === 'leader' || data.role === 'co_leader'));
    }
  };

  useEffect(() => { load(); }, [user, profile?.clan_id]);

  const canManageWinners = isSuperAdminUser || isClanLeader;

  const createTrophy = async () => {
    if (!isSuperAdminUser) return toast.error('Apenas superadmin');
    if (!tForm.name.trim()) return toast.error('Nome obrigatório');
    const { error } = await supabase.from('xtreino_trophies').insert({ ...tForm, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success('Troféu criado!');
    setTForm({ name: '', description: '', icon: '🏆', color: '#FFD700', kind: 'trophy' });
    load();
  };

  const deleteTrophy = async (id: string) => {
    if (!confirm('Excluir este troféu? (remove todas as concessões)')) return;
    const { error } = await supabase.from('xtreino_trophies').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Removido');
    load();
  };

  const awardTrophy = async () => {
    if (!aForm.trophy_id) return toast.error('Selecione um troféu');
    if (!aForm.user_id && !aForm.team_id) return toast.error('Selecione jogador ou line');
    const payload: any = {
      trophy_id: aForm.trophy_id,
      user_id: aForm.user_id || null,
      team_id: aForm.team_id || null,
      clan_id: aForm.clan_id || null,
      notes: aForm.notes || null,
      awarded_by: user?.id,
    };
    const { error } = await supabase.from('xtreino_winners').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('🏆 Troféu concedido!');
    setAForm({ ...aForm, user_id: '', team_id: '', notes: '' });
    load();
  };

  const removeWinner = async (id: string) => {
    if (!confirm('Remover concessão?')) return;
    const { error } = await supabase.from('xtreino_winners').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveDaily = async () => {
    if (!isSuperAdminUser) return toast.error('Apenas superadmin');
    const { error } = await supabase.rpc('set_admin_setting' as any, {
      _key: 'daily_cw_tickets',
      _value: { count: dailyTickets },
    });
    if (error) return toast.error(error.message);
    toast.success('Configuração salva');
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'trophies', label: 'Troféus', icon: Trophy },
    { id: 'winners', label: 'Vencedores', icon: Award },
    { id: 'settings', label: 'Config CW', icon: Settings },
    { id: 'discounts', label: 'Descontos', icon: Percent },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-slide-up pb-10">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Crown size={22} /> CENTRAL DE PREMIAÇÕES
      </h1>

      <div className="grid grid-cols-3 gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 rounded font-display text-xs flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'trophies' && (
        <div className="space-y-4">
          {isSuperAdminUser && (
            <div className="bg-card border border-primary/40 rounded-xl p-4 space-y-3">
              <h3 className="font-heading text-sm text-primary">CRIAR TROFÉU/MEDALHA/BANNER</h3>
              <div className="grid grid-cols-2 gap-2">
                <input value={tForm.name} onChange={e => setTForm({ ...tForm, name: e.target.value })} placeholder="Nome"
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm" />
                <select value={tForm.kind} onChange={e => setTForm({ ...tForm, kind: e.target.value })}
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option value="trophy">🏆 Troféu</option>
                  <option value="medal">🥇 Medalha</option>
                  <option value="banner">🚩 Banner</option>
                </select>
                <input value={tForm.icon} onChange={e => setTForm({ ...tForm, icon: e.target.value })} placeholder="Ícone (emoji)"
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm" />
                <input type="color" value={tForm.color} onChange={e => setTForm({ ...tForm, color: e.target.value })}
                  className="bg-secondary border border-border rounded px-3 py-2 h-10 w-full" />
              </div>
              <input value={tForm.description} onChange={e => setTForm({ ...tForm, description: e.target.value })} placeholder="Descrição"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <button onClick={createTrophy} className="w-full bg-primary text-primary-foreground py-2 rounded font-heading text-sm flex items-center justify-center gap-1">
                <Plus size={14} /> Criar
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {trophies.map(t => (
              <div key={t.id} className="bg-card border-2 rounded-xl p-3 text-center" style={{ borderColor: t.color + '80', boxShadow: `0 0 12px ${t.color}40` }}>
                <div className="text-3xl">{t.icon}</div>
                <p className="font-heading text-sm mt-1" style={{ color: t.color }}>{t.name}</p>
                <p className="text-[10px] uppercase text-muted-foreground font-display">{t.kind}</p>
                {t.description && <p className="text-[10px] text-muted-foreground mt-1">{t.description}</p>}
                {isSuperAdminUser && (
                  <button onClick={() => deleteTrophy(t.id)} className="mt-2 text-[10px] text-destructive flex items-center justify-center gap-1 mx-auto">
                    <Trash2 size={10} /> Excluir
                  </button>
                )}
              </div>
            ))}
            {trophies.length === 0 && <p className="col-span-full text-center text-xs text-muted-foreground py-6">Nenhum troféu criado.</p>}
          </div>
        </div>
      )}

      {tab === 'winners' && (
        <div className="space-y-4">
          {canManageWinners && trophies.length > 0 && (
            <div className="bg-card border border-gold/40 rounded-xl p-4 space-y-3">
              <h3 className="font-heading text-sm text-gold">CONCEDER TROFÉU XTREINO</h3>
              <select value={aForm.trophy_id} onChange={e => setAForm({ ...aForm, trophy_id: e.target.value })}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm">
                <option value="">Selecione um troféu</option>
                {trophies.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={aForm.user_id} onChange={e => setAForm({ ...aForm, user_id: e.target.value, team_id: '' })}
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option value="">— Jogador —</option>
                  {profiles.slice(0, 200).map(p => <option key={p.user_id} value={p.user_id}>{p.game_nick || p.username}</option>)}
                </select>
                <select value={aForm.team_id} onChange={e => setAForm({ ...aForm, team_id: e.target.value, user_id: '' })}
                  className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option value="">— Line —</option>
                  {teams.filter(t => isSuperAdminUser || t.clan_id === profile?.clan_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <input value={aForm.notes} onChange={e => setAForm({ ...aForm, notes: e.target.value })} placeholder="Observação (ex: Campeão do Xtreino #5)"
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <button onClick={awardTrophy} className="w-full bg-gold/20 text-gold border border-gold/40 py-2 rounded font-heading text-sm">
                🏆 Conceder
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-heading text-sm text-primary mb-3">VENCEDORES RECENTES</h3>
            {winners.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum vencedor ainda.</p>}
            <div className="space-y-2">
              {winners.map(w => {
                const tr = trophies.find(t => t.id === w.trophy_id);
                const winner = w.user_id ? profiles.find(p => p.user_id === w.user_id) : null;
                const team = w.team_id ? teams.find(t => t.id === w.team_id) : null;
                return (
                  <div key={w.id} className="flex items-center gap-3 border-b border-border/30 pb-2">
                    <div className="text-2xl">{tr?.icon || '🏆'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm" style={{ color: tr?.color || '#FFD700' }}>{tr?.name || 'Troféu'}</p>
                      <p className="text-xs text-foreground truncate">
                        {winner ? (winner.game_nick || winner.username) : team ? `Line: ${team.name}` : '—'}
                      </p>
                      {w.notes && <p className="text-[10px] text-muted-foreground italic">"{w.notes}"</p>}
                    </div>
                    {canManageWinners && (
                      <button onClick={() => removeWinner(w.id)} className="text-destructive">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-heading text-sm text-primary">CONFIGURAÇÕES DE CW</h3>
          {!isSuperAdminUser ? (
            <p className="text-xs text-muted-foreground">Apenas superadmin pode editar.</p>
          ) : (
            <>
              <div>
                <label className="text-xs font-display text-muted-foreground">Tickets diários de CW (reset 00:00 BRT)</label>
                <input type="number" min={0} max={50} value={dailyTickets} onChange={e => setDailyTickets(Number(e.target.value))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm mt-1" />
              </div>
              <button onClick={saveDaily} className="w-full bg-primary text-primary-foreground py-2 rounded font-heading text-sm flex items-center justify-center gap-1">
                <Save size={14} /> Salvar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
