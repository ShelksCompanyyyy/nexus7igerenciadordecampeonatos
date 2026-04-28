import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Send, Check, X, Calendar, Clock, MessageCircle, Crown, Trophy, RefreshCw, Users as UsersIcon, CheckCircle2, Clock as ClockIcon, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import CancelCWDialog from '@/components/CancelCWDialog';
import CWStatusTimeline from '@/components/CWStatusTimeline';

interface Clan { id: string; name: string; logo: string | null; }
interface Team { id: string; name: string; clan_id: string; }
interface MatchCW {
  id: string;
  clan_a_id: string;
  clan_b_id: string | null;
  requested_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'confirmed' | 'finalized';
  scheduled_date: string | null;
  scheduled_time: string | null;
  rounds: number;
  notes: string | null;
  score_a: number;
  score_b: number;
  created_at: string;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_rounds: number | null;
  is_bet_match: boolean;
  bet_amount: number;
  bet_status: string;
  winner_clan_id: string | null;
  line_a_id: string | null;
  line_b_id: string | null;
  line_a_confirmed: boolean | null;
  line_b_confirmed: boolean | null;
}
interface MatchMessage {
  id: string;
  matchcw_id: string;
  user_id: string;
  username: string;
  clan_id: string;
  message: string;
  created_at: string;
}

type Tab = 'available' | 'mine' | 'create';
const ROUND_OPTIONS = [1, 3, 5, 7];
const DAILY_LIMIT = 10;

export default function MatchCWPage() {
  const { user, profile, role } = useAuth();
  const myClanId = profile?.clan_id || '';
  const [clans, setClans] = useState<Clan[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<MatchCW[]>([]);
  const [isClanLeader, setIsClanLeader] = useState(false);
  const [tab, setTab] = useState<Tab>('available');
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MatchCW | null>(null);

  // Form simples (sem aposta, sem clã — quem cria já é do clã do perfil)
  const [clanName, setClanName] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqRounds, setReqRounds] = useState(3);
  const [notes, setNotes] = useState('');

  const loadAll = useCallback(async () => {
    const { data: c } = await supabase.from('clans').select('id, name, logo').eq('is_banned', false);
    setClans(c || []);
    const { data: t } = await supabase.from('teams').select('id, name, clan_id');
    setTeams((t || []) as Team[]);
    const { data: m } = await supabase
      .from('matchcw')
      .select('*')
      .order('created_at', { ascending: false });
    setMatches((m || []) as MatchCW[]);
  }, []);

  useEffect(() => {
    loadAll();
    if (myClanId && user) {
      supabase.from('clan_members').select('role').eq('clan_id', myClanId).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setIsClanLeader(!!data && (data.role === 'leader' || data.role === 'co_leader')));
      // Pré-preenche o nome do clã para o form
      const myClan = clans.find(c => c.id === myClanId);
      if (myClan) setClanName(myClan.name);
    }
    const ch = supabase
      .channel('matchcw-feed-simple')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchcw' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myClanId, user, loadAll]);

  // Atualiza nome do clã quando os clãs carregam
  useEffect(() => {
    if (myClanId && clans.length && !clanName) {
      const myClan = clans.find(c => c.id === myClanId);
      if (myClan) setClanName(myClan.name);
    }
  }, [clans, myClanId, clanName]);

  const clanLabel = (id: string | null) => (id ? clans.find(c => c.id === id)?.name || '???' : 'AGUARDANDO...');
  const canManage = isClanLeader || role === 'superadmin';

  // Pedidos abertos de OUTROS clãs (procurando alguém)
  const lookingForOpponent = matches.filter(m => m.status === 'pending' && !m.clan_b_id && m.clan_a_id !== myClanId && !m.is_bet_match);
  const myMatches = matches.filter(m => m.clan_a_id === myClanId || m.clan_b_id === myClanId);
  const myActive = myMatches.filter(m => !m.is_bet_match);
  const todayCount = myActive.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString() && m.status !== 'declined').length;
  const remainingToday = Math.max(0, DAILY_LIMIT - todayCount);

  const sendRequest = async () => {
    if (!myClanId) { toast.error('Você precisa estar em um clã'); return; }
    if (!canManage) { toast.error('Apenas líderes/vice do clã podem criar pedidos'); return; }
    if (todayCount >= DAILY_LIMIT) { toast.error(`Limite diário atingido (${DAILY_LIMIT}/dia)`); return; }
    const { error } = await supabase.rpc('request_matchcw', {
      _clan_a: myClanId,
      _clan_b: undefined,
      _notes: notes || null,
      _date: reqDate || null,
      _time: reqTime || null,
      _rounds: reqRounds,
      _is_bet: false,
      _bet_amount: 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('⚔️ Pedido criado! Aguardando outro clã aceitar...');
    setNotes(''); setReqDate(''); setReqTime(''); setReqRounds(3);
    setTab('mine');
    loadAll();
  };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_matchcw', { _match_id: id, _accept: accept });
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? '✅ Match aceito!' : 'Match recusado');
    loadAll();
  };

  const finalize = async (m: MatchCW, winnerClan: string, sa: number, sb: number) => {
    const { error } = await supabase.rpc('finalize_matchcw', {
      _match_id: m.id, _score_a: sa, _score_b: sb, _winner_clan: winnerClan,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('🏆 Match finalizado!');
    loadAll();
  };

  const cancelMatch = async (m: MatchCW) => {
    setCancelTarget(m);
  };

  const performCancel = async (m: MatchCW) => {
    const { error } = await supabase.rpc('cancel_matchcw', { _match_id: m.id });
    if (error) { toast.error(error.message); return; }
    toast.success('🗑️ MatchCW cancelado');
    loadAll();
  };

  const setLine = async (matchId: string, lineId: string) => {
    const { error } = await supabase.rpc('set_matchcw_line', { _match_id: matchId, _line_id: lineId });
    if (error) { toast.error(error.message); return; }
    toast.success('✅ Line confirmada');
    loadAll();
  };

  // Format helpers (formato das fotos)
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try {
      const dt = new Date(d.includes('T') ? d : d + 'T00:00:00');
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yy = dt.getFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch { return d; }
  };
  const fmtTime = (t: string | null) => {
    if (!t) return '—';
    return t.replace(':', 'h').slice(0, 5).includes('h') ? t.split(':').slice(0, 2).join('h') : t;
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'available', label: 'Disponíveis', count: lookingForOpponent.length },
    { id: 'mine', label: 'Meus CWs', count: myActive.filter(m => m.status !== 'finalized' && m.status !== 'declined').length },
    { id: 'create', label: 'Criar CW' },
  ];

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading text-primary text-glow tracking-wider">MATCH CW</h1>
        <span className="px-3 py-1.5 rounded-md bg-secondary/60 border border-border text-xs font-display text-muted-foreground">
          {todayCount}/{DAILY_LIMIT} hoje
        </span>
      </div>

      {/* Atalho para CW Apostado */}
      <Link to="/matchcw-bet" className="block bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 rounded-lg p-3 hover:from-gold/30 transition-all">
        <p className="text-xs font-heading text-gold flex items-center gap-2">
          💰 MATCH CW APOSTADO <span className="text-muted-foreground font-display normal-case ml-auto">→ Saldo, depósitos e apostas</span>
        </p>
      </Link>

      {/* Tabs (3) */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 rounded-md font-display text-sm transition-all ${
                active
                  ? 'bg-primary text-primary-foreground font-heading'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t.label}{typeof t.count === 'number' && t.count > 0 && ` (${t.count})`}
            </button>
          );
        })}
      </div>

      {/* === TAB: DISPONÍVEIS === */}
      {tab === 'available' && (
        <div className="space-y-3">
          {lookingForOpponent.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-display text-sm">
              Nenhum clã está procurando adversário agora
            </div>
          )}
          {lookingForOpponent.map(m => (
            <div key={m.id} className="bg-card border border-gold/50 rounded-lg p-4 space-y-3" style={{ boxShadow: '0 0 12px hsl(45 100% 50% / 0.15)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={18} className="text-gold shrink-0" />
                  <span className="font-heading text-gold text-base truncate">{clanLabel(m.clan_a_id)}</span>
                </div>
                <span className="px-2 py-1 border border-gold/60 rounded text-[10px] font-heading text-gold">
                  ABERTO
                </span>
              </div>
              <div className="text-sm font-display text-foreground">
                Por: <RequesterName userId={m.requested_by} />
              </div>
              <div className="flex items-center gap-4 text-xs font-display text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><Calendar size={14}/> {fmtDate(m.proposed_date || m.scheduled_date)}</span>
                <span className="flex items-center gap-1.5"><Clock size={14}/> {fmtTime(m.proposed_time || m.scheduled_time)}</span>
                <span className="flex items-center gap-1.5"><RefreshCw size={14}/> {m.proposed_rounds || m.rounds} rounds</span>
              </div>
              {m.notes && <p className="text-xs italic text-muted-foreground font-display">"{m.notes}"</p>}
              {canManage ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => respond(m.id, true)}
                    className="flex items-center justify-center gap-2 py-3 rounded-md font-heading text-sm"
                    style={{ background: 'hsl(120 100% 50%)', color: 'hsl(0 0% 5%)' }}
                  >
                    <Check size={18} strokeWidth={3} /> ACEITAR
                  </button>
                  <button
                    onClick={() => respond(m.id, false)}
                    className="flex items-center justify-center gap-2 py-3 rounded-md font-heading text-sm bg-primary text-primary-foreground"
                  >
                    <X size={18} strokeWidth={3} /> RECUSAR
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-display text-center pt-1">Apenas líderes podem aceitar</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === TAB: MEUS CWs === */}
      {tab === 'mine' && (
        <div className="space-y-3">
          {myActive.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-display text-sm">
              Você ainda não tem nenhum MatchCW
            </div>
          )}
          {myActive.map(m => {
            const isOpen = m.status === 'pending' && !m.clan_b_id;
            const isPending = m.status === 'pending';
            const borderColor =
              m.status === 'finalized' ? 'border-success/50' :
              m.status === 'confirmed' ? 'border-gold/50' :
              m.status === 'accepted' ? 'border-primary/50' :
              isOpen ? 'border-gold/50' : 'border-border';
            return (
              <div key={m.id} className={`bg-card border ${borderColor} rounded-lg p-4 space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield size={18} className={isOpen ? 'text-gold' : 'text-primary'} />
                    <span className={`font-heading text-base truncate ${isOpen ? 'text-gold' : 'text-foreground'}`}>
                      {clanLabel(m.clan_a_id)}
                      {m.clan_b_id && (
                        <span className="text-primary mx-1">vs</span>
                      )}
                      {m.clan_b_id && <span className="text-foreground">{clanLabel(m.clan_b_id)}</span>}
                    </span>
                  </div>
                  <span className={`px-2 py-1 border rounded text-[10px] font-heading uppercase tracking-wider ${
                    m.status === 'finalized' ? 'border-success/60 text-success' :
                    m.status === 'confirmed' ? 'border-gold/60 text-gold' :
                    m.status === 'accepted' ? 'border-primary/60 text-primary' :
                    isOpen ? 'border-gold/60 text-gold' :
                    m.status === 'declined' ? 'border-destructive/60 text-destructive' :
                    'border-border text-muted-foreground'
                  }`}>
                    {m.status === 'finalized' ? 'FINALIZADO' :
                     m.status === 'confirmed' ? 'MARCADO' :
                     m.status === 'accepted' ? 'ACEITO' :
                     isOpen ? 'ABERTO' :
                     m.status === 'declined' ? 'RECUSADO' : 'PENDENTE'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-display text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5"><Calendar size={14}/> {fmtDate(m.scheduled_date || m.proposed_date)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14}/> {fmtTime(m.scheduled_time || m.proposed_time)}</span>
                  <span className="flex items-center gap-1.5"><RefreshCw size={14}/> {m.rounds || m.proposed_rounds} rounds</span>
                </div>
                {m.notes && isPending && <p className="text-xs italic text-muted-foreground font-display">"{m.notes}"</p>}
                <div className="pt-1">
                  <CWStatusTimeline status={m.status} />
                </div>
                {m.status === 'finalized' && (
                  <p className="text-sm font-heading text-success">Resultado: {m.score_a} x {m.score_b}</p>
                )}

                {/* Chat para aceitos */}
                {m.status === 'accepted' && canManage && (
                  <button onClick={() => setOpenChatId(openChatId === m.id ? null : m.id)}
                    className="w-full py-2 bg-primary/10 text-primary border border-primary/40 rounded font-heading text-xs flex items-center justify-center gap-2">
                    <MessageCircle size={14} /> {openChatId === m.id ? 'Fechar Chat' : 'Coordenação (Chat)'}
                  </button>
                )}

                {/* Selector de Line + status de confirmação dupla */}
                {(m.status === 'accepted' || m.status === 'confirmed') && (
                  <LinePanel
                    m={m}
                    teams={teams}
                    myClanId={myClanId}
                    canManage={canManage}
                    clanLabel={clanLabel}
                    onSetLine={setLine}
                  />
                )}

                {openChatId === m.id && canManage && user && (
                  <CoordChat match={m} myClanId={myClanId} username={profile?.game_nick || profile?.username || ''} userId={user.id} onConfirm={loadAll} />
                )}

                {/* Finalizar para confirmados */}
                {m.status === 'confirmed' && canManage && (
                  <FinalizePanel m={m} clanLabel={clanLabel} onFinalize={finalize} />
                )}

                {/* Cancelar (apenas líder envolvido, não finalizado) */}
                {canManage && m.status !== 'finalized' && (
                  <button
                    onClick={() => cancelMatch(m)}
                    className="w-full py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded font-heading text-xs flex items-center justify-center gap-2 hover:bg-destructive/15"
                  >
                    <Trash2 size={14} /> Cancelar este CW
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === TAB: CRIAR CW === */}
      {tab === 'create' && (
        <div className="bg-card border border-primary/50 rounded-lg p-5 space-y-4" style={{ boxShadow: '0 0 14px hsl(0 100% 50% / 0.12)' }}>
          <div>
            <h3 className="font-heading text-lg text-primary text-glow-sm">CRIAR PEDIDO DE CW</h3>
            <p className="text-xs text-muted-foreground font-display mt-1">{remainingToday} pedidos restantes hoje</p>
          </div>

          {!myClanId && (
            <div className="bg-destructive/10 border border-destructive/40 rounded p-3 text-xs font-display text-destructive">
              Você precisa estar em um clã para criar um MatchCW.
            </div>
          )}
          {myClanId && !canManage && (
            <div className="bg-warning/10 border border-warning/40 rounded p-3 text-xs font-display text-warning">
              Apenas líderes e vice-líderes do clã podem criar pedidos.
            </div>
          )}

          <div>
            <label className="text-xs font-display text-muted-foreground block mb-1.5">Nome do seu clã</label>
            <input
              value={clanName}
              readOnly
              placeholder="Ex: Alpha Squad"
              className="w-full p-3 bg-secondary/60 rounded border border-border text-foreground font-display text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-display text-muted-foreground block mb-1.5">Data</label>
            <input
              type="date"
              value={reqDate}
              onChange={e => setReqDate(e.target.value)}
              className="w-full p-3 bg-secondary/60 rounded border border-border text-foreground font-display text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-display text-muted-foreground block mb-1.5">Horário</label>
            <input
              type="time"
              value={reqTime}
              onChange={e => setReqTime(e.target.value)}
              className="w-full p-3 bg-secondary/60 rounded border border-border text-foreground font-display text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-display text-muted-foreground block mb-2">Quantidade de rounds</label>
            <div className="grid grid-cols-4 gap-2">
              {ROUND_OPTIONS.map(n => {
                const active = reqRounds === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReqRounds(n)}
                    className={`py-3 rounded font-heading text-base transition-all ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-foreground hover:bg-secondary'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-display text-muted-foreground block mb-1.5">Mensagem (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: aceito 2x2 ou 5x5..."
              className="w-full p-3 bg-secondary/60 rounded border border-border text-foreground font-display text-sm"
            />
          </div>

          <button
            onClick={sendRequest}
            disabled={!myClanId || !canManage || remainingToday === 0}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded font-heading text-sm tracking-wider disabled:opacity-50"
          >
            CRIAR PEDIDO DE CW
          </button>
        </div>
      )}
      {cancelTarget && (
        <CancelCWDialog
          open={!!cancelTarget}
          onOpenChange={(o) => { if (!o) setCancelTarget(null); }}
          matchId={cancelTarget.id}
          isBetMatch={cancelTarget.is_bet_match}
          betAmount={Number(cancelTarget.bet_amount || 0)}
          clanALabel={clanLabel(cancelTarget.clan_a_id)}
          clanBLabel={cancelTarget.clan_b_id ? clanLabel(cancelTarget.clan_b_id) : '—'}
          clanAId={cancelTarget.clan_a_id}
          clanBId={cancelTarget.clan_b_id}
          onConfirm={() => performCancel(cancelTarget)}
        />
      )}
    </div>
  );
}

function RequesterName({ userId }: { userId: string }) {
  const [name, setName] = useState<string>('Carregando...');
  useEffect(() => {
    let cancel = false;
    supabase.from('profiles').select('username, game_nick').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (!cancel && data) setName(data.username || data.game_nick || 'Jogador'); });
    return () => { cancel = true; };
  }, [userId]);
  return <span className="text-primary font-heading">{name}</span>;
}

function CoordChat({ match, myClanId, username, userId, onConfirm }: {
  match: MatchCW; myClanId: string; username: string; userId: string; onConfirm: () => void;
}) {
  const [msgs, setMsgs] = useState<MatchMessage[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rounds, setRounds] = useState(match.proposed_rounds || 3);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('matchcw_messages').select('*').eq('matchcw_id', match.id).order('created_at', { ascending: true });
    setMsgs((data || []) as MatchMessage[]);
  }, [match.id]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`matchcw-msgs-${match.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matchcw_messages', filter: `matchcw_id=eq.${match.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match.id, load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from('matchcw_messages').insert({
      matchcw_id: match.id, user_id: userId, username, clan_id: myClanId, message: text.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setText('');
  };

  const confirm = async () => {
    if (!date || !time) { toast.error('Defina data e horário'); return; }
    const { error } = await supabase.rpc('confirm_matchcw', { _match_id: match.id, _date: date, _time: time, _rounds: rounds });
    if (error) toast.error(error.message);
    else { toast.success('CW marcado!'); onConfirm(); }
  };

  return (
    <div className="bg-background border border-primary/30 rounded-lg p-3 space-y-3">
      <div className="max-h-60 overflow-y-auto space-y-2">
        {msgs.length === 0 && <p className="text-xs text-muted-foreground text-center font-display py-4">Inicie a coordenação...</p>}
        {msgs.map(msg => (
          <div key={msg.id} className={`p-2 rounded text-xs font-display ${msg.clan_id === myClanId ? 'bg-primary/15 ml-auto' : 'bg-secondary'}`} style={{ maxWidth: '80%', marginLeft: msg.clan_id === myClanId ? 'auto' : 0 }}>
            <div className="flex items-center gap-1 mb-1 text-[10px] opacity-80">
              <Crown size={10} /> {msg.username}
            </div>
            <p className="text-foreground">{msg.message}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mensagem..."
          className="flex-1 p-2 bg-secondary rounded text-xs font-display border border-border" />
        <button onClick={send} className="px-3 py-2 bg-primary text-primary-foreground rounded"><Send size={14} /></button>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-heading text-primary mb-2">📅 MARCAR CW</p>
        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-secondary rounded text-xs font-display border border-border" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-2 bg-secondary rounded text-xs font-display border border-border" />
          <input type="number" min={1} max={10} value={rounds} onChange={e => setRounds(Number(e.target.value))} placeholder="Rounds" className="p-2 bg-secondary rounded text-xs font-display border border-border" />
        </div>
        <button onClick={confirm} className="mt-2 w-full px-3 py-2 bg-gold/20 text-gold border border-gold/40 rounded font-heading text-xs">Confirmar e Fechar Chat</button>
      </div>
    </div>
  );
}

function FinalizePanel({ m, clanLabel, onFinalize }: {
  m: MatchCW; clanLabel: (id: string | null) => string;
  onFinalize: (m: MatchCW, winnerClan: string, sa: number, sb: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sa, setSa] = useState(0);
  const [sb, setSb] = useState(0);
  const [winner, setWinner] = useState<string>(m.clan_a_id);
  return (
    <div className="bg-background border border-gold/30 rounded p-3">
      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full px-3 py-2 bg-gold/15 text-gold border border-gold/30 rounded font-heading text-xs flex items-center justify-center gap-1">
          <Trophy size={12}/> Finalizar e declarar vencedor
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-heading text-gold">🏆 RESULTADO FINAL</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-display">{clanLabel(m.clan_a_id)}</label>
              <input type="number" min={0} value={sa} onChange={e => setSa(Number(e.target.value))} className="w-full p-2 bg-secondary rounded text-xs border border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-display">{clanLabel(m.clan_b_id)}</label>
              <input type="number" min={0} value={sb} onChange={e => setSb(Number(e.target.value))} className="w-full p-2 bg-secondary rounded text-xs border border-border" />
            </div>
          </div>
          <select value={winner} onChange={e => setWinner(e.target.value)} className="w-full p-2 bg-secondary rounded text-xs font-display border border-border">
            <option value={m.clan_a_id}>Vencedor: {clanLabel(m.clan_a_id)}</option>
            {m.clan_b_id && <option value={m.clan_b_id}>Vencedor: {clanLabel(m.clan_b_id)}</option>}
          </select>
          <div className="flex gap-2">
            <button onClick={() => { onFinalize(m, winner, sa, sb); setOpen(false); }}
              className="flex-1 px-3 py-2 bg-gold/20 text-gold border border-gold/40 rounded font-heading text-xs">Confirmar Resultado</button>
            <button onClick={() => setOpen(false)} className="px-3 py-2 bg-secondary text-muted-foreground rounded font-heading text-xs">
              <X size={12}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinePanel({ m, teams, myClanId, canManage, clanLabel, onSetLine }: {
  m: MatchCW; teams: Team[]; myClanId: string; canManage: boolean;
  clanLabel: (id: string | null) => string;
  onSetLine: (matchId: string, lineId: string) => void;
}) {
  const myClanTeams = teams.filter(t => t.clan_id === myClanId);
  const isMyClanA = m.clan_a_id === myClanId;
  const myLineId = isMyClanA ? m.line_a_id : m.line_b_id;
  const myConfirmed = isMyClanA ? !!m.line_a_confirmed : !!m.line_b_confirmed;
  const oppLineId = isMyClanA ? m.line_b_id : m.line_a_id;
  const oppConfirmed = isMyClanA ? !!m.line_b_confirmed : !!m.line_a_confirmed;
  const oppClanId = isMyClanA ? m.clan_b_id : m.clan_a_id;

  const StatusBadge = ({ confirmed, pending }: { confirmed: boolean; pending: boolean }) => {
    if (confirmed) return (
      <span className="inline-flex items-center gap-1 text-success text-[10px] font-heading px-2 py-1 rounded border border-success/40 bg-success/10">
        <CheckCircle2 size={12} /> CONFIRMADO
      </span>
    );
    if (pending) return (
      <span className="inline-flex items-center gap-1 text-warning text-[10px] font-heading px-2 py-1 rounded border border-warning/40 bg-warning/10">
        <ClockIcon size={12} /> PENDENTE
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-[10px] font-heading px-2 py-1 rounded border border-border bg-secondary/40">
        <XCircle size={12} /> SEM LINE
      </span>
    );
  };

  return (
    <div className="bg-background border border-primary/30 rounded-lg p-3 space-y-3">
      <p className="text-xs font-heading text-primary flex items-center gap-2">
        <UsersIcon size={14} /> LINES PARA O CONFRONTO
      </p>

      {/* Status visual de ambos os lados */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/40 rounded p-2 space-y-1">
          <p className="text-[10px] font-display text-muted-foreground truncate">{clanLabel(m.clan_a_id)}</p>
          <p className="text-xs font-heading text-foreground truncate">
            {m.line_a_id ? (teams.find(t => t.id === m.line_a_id)?.name || '—') : 'A definir'}
          </p>
          <StatusBadge confirmed={!!m.line_a_confirmed} pending={!!m.line_a_id && !m.line_a_confirmed} />
        </div>
        <div className="bg-secondary/40 rounded p-2 space-y-1">
          <p className="text-[10px] font-display text-muted-foreground truncate">{clanLabel(m.clan_b_id)}</p>
          <p className="text-xs font-heading text-foreground truncate">
            {m.line_b_id ? (teams.find(t => t.id === m.line_b_id)?.name || '—') : 'A definir'}
          </p>
          <StatusBadge confirmed={!!m.line_b_confirmed} pending={!!m.line_b_id && !m.line_b_confirmed} />
        </div>
      </div>

      {/* Selector da minha line (apenas líder pode escolher e o match precisa estar accepted/confirmed) */}
      {canManage && (
        <div>
          <p className="text-[10px] font-display text-muted-foreground mb-1.5">
            {myConfirmed ? 'Sua line confirmada (clique para trocar):' : 'Selecione a line do seu clã:'}
          </p>
          {myClanTeams.length === 0 ? (
            <p className="text-[11px] text-warning font-display">Crie ao menos uma line no painel ADM antes.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {myClanTeams.map(t => {
                const active = myLineId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSetLine(m.id, t.id)}
                    className={`p-2 rounded text-xs font-heading transition-all border ${
                      active
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-secondary/60 border-border text-foreground hover:border-primary/40'
                    }`}
                  >
                    {active && <CheckCircle2 size={12} className="inline mr-1" />}
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mensagem de fluxo */}
      {m.line_a_confirmed && m.line_b_confirmed ? (
        <p className="text-[11px] font-display text-success flex items-center gap-1">
          <CheckCircle2 size={12} /> Ambas as lines confirmadas — pronto para começar!
        </p>
      ) : (
        <p className="text-[11px] font-display text-muted-foreground">
          Aguardando confirmação de ambas as lines para iniciar o confronto.
        </p>
      )}

      {oppClanId && oppLineId && !oppConfirmed && (
        <p className="text-[10px] font-display text-warning">⏳ {clanLabel(oppClanId)} ainda precisa confirmar.</p>
      )}
    </div>
  );
}
