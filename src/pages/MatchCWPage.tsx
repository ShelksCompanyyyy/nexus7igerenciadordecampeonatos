import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Swords, Send, Check, X, Plus, Calendar, Clock, MessageCircle, History, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface Clan { id: string; name: string; logo: string | null; }
interface MatchCW {
  id: string;
  clan_a_id: string;
  clan_b_id: string;
  requested_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'confirmed' | 'finalized';
  scheduled_date: string | null;
  scheduled_time: string | null;
  rounds: number;
  notes: string | null;
  score_a: number;
  score_b: number;
  created_at: string;
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

export default function MatchCWPage() {
  const { user, profile, role } = useAuth();
  const myClanId = profile?.clan_id || '';
  const [clans, setClans] = useState<Clan[]>([]);
  const [matches, setMatches] = useState<MatchCW[]>([]);
  const [isClanLeader, setIsClanLeader] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [notes, setNotes] = useState('');
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const { data: c } = await supabase.from('clans').select('id, name, logo').eq('is_banned', false);
    setClans(c || []);
    const { data: m } = await supabase
      .from('matchcw')
      .select('*')
      .order('created_at', { ascending: false });
    setMatches((m || []) as MatchCW[]);
  }, [myClanId]);

  useEffect(() => {
    if (!myClanId || !user) return;
    loadAll();

    // Verifica se é líder/vice do clã
    supabase.from('clan_members').select('role').eq('clan_id', myClanId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsClanLeader(!!data && (data.role === 'leader' || data.role === 'co_leader')));

    const ch = supabase
      .channel('matchcw-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchcw' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myClanId, user, loadAll]);

  const clanName = (id: string | null) => (id ? clans.find(c => c.id === id)?.name || '???' : 'AGUARDANDO...');

  const canManage = isClanLeader || role === 'superadmin';

  const sendRequest = async () => {
    const { error } = await supabase.rpc('request_matchcw', { _clan_a: myClanId, _clan_b: undefined, _notes: notes || null });
    if (error) toast.error(error.message);
    else { toast.success('⚔️ Procurando adversário...'); setShowRequest(false); setNotes(''); loadAll(); }
  };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_matchcw', { _match_id: id, _accept: accept });
    if (error) toast.error(error.message);
    else { toast.success(accept ? 'Match aceito!' : 'Match recusado'); loadAll(); }
  };

  const myMatches = matches.filter(m => m.clan_a_id === myClanId || m.clan_b_id === myClanId);
  // Pedidos abertos de OUTROS clãs (procurando alguém)
  const lookingForOpponent = matches.filter(m => m.status === 'pending' && !m.clan_b_id && m.clan_a_id !== myClanId);
  // Meus pedidos enviados ainda em aberto
  const outgoing = myMatches.filter(m => m.status === 'pending');
  const accepted = myMatches.filter(m => m.status === 'accepted');
  const confirmed = myMatches.filter(m => m.status === 'confirmed');
  const history = myMatches.filter(m => ['declined','finalized'].includes(m.status));

  const todayCount = myMatches.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString() && m.status !== 'declined').length;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
          <Swords size={28} /> MATCH CW
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-display text-muted-foreground">Hoje: {todayCount}/10</span>
          {canManage && (
            <button onClick={() => setShowRequest(s => !s)} className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs flex items-center gap-2">
              <Plus size={14} /> Desafiar Clã
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-sm text-muted-foreground font-display">Apenas líderes e vice-líderes do clã podem enviar e responder MatchCW.</p>
        </div>
      )}

      {showRequest && canManage && (
        <div className="bg-card rounded-lg neon-border p-5 space-y-3">
          <h3 className="font-heading text-sm text-primary">Novo Desafio</h3>
          <select value={targetClanId} onChange={e => setTargetClanId(e.target.value)} className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm">
            <option value="">Selecione o clã alvo</option>
            {clans.filter(c => c.id !== myClanId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mensagem opcional..." rows={2}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <div className="flex gap-2">
            <button onClick={sendRequest} className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">Enviar</button>
            <button onClick={() => setShowRequest(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded font-heading text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* Pedidos recebidos */}
      {incoming.length > 0 && (
        <Section title="📩 PEDIDOS RECEBIDOS" tone="primary">
          {incoming.map(m => (
            <MatchRow key={m.id} m={m} clanName={clanName} actions={canManage && (
              <div className="flex gap-2">
                <button onClick={() => respond(m.id, true)} className="px-3 py-1.5 bg-success/15 text-success border border-success/30 rounded font-heading text-xs flex items-center gap-1"><Check size={12} /> Aceitar</button>
                <button onClick={() => respond(m.id, false)} className="px-3 py-1.5 bg-destructive/15 text-destructive border border-destructive/30 rounded font-heading text-xs flex items-center gap-1"><X size={12} /> Recusar</button>
              </div>
            )} />
          ))}
        </Section>
      )}

      {/* Pedidos enviados */}
      {outgoing.length > 0 && (
        <Section title="📤 PEDIDOS ENVIADOS" tone="muted">
          {outgoing.map(m => <MatchRow key={m.id} m={m} clanName={clanName} actions={<span className="text-xs text-muted-foreground font-display">Aguardando resposta…</span>} />)}
        </Section>
      )}

      {/* Aceitos - chat de coordenação */}
      {accepted.length > 0 && (
        <Section title="💬 ACEITOS - COORDENAÇÃO" tone="success">
          {accepted.map(m => (
            <div key={m.id} className="space-y-2">
              <MatchRow m={m} clanName={clanName} actions={canManage && (
                <button onClick={() => setOpenChatId(openChatId === m.id ? null : m.id)} className="px-3 py-1.5 bg-primary/15 text-primary border border-primary/30 rounded font-heading text-xs flex items-center gap-1">
                  <MessageCircle size={12} /> {openChatId === m.id ? 'Fechar' : 'Abrir Chat'}
                </button>
              )} />
              {openChatId === m.id && canManage && <CoordChat match={m} myClanId={myClanId} username={profile?.game_nick || profile?.username || ''} userId={user?.id || ''} onConfirm={loadAll} />}
            </div>
          ))}
        </Section>
      )}

      {/* Confirmados */}
      {confirmed.length > 0 && (
        <Section title="✅ CW MARCADOS" tone="gold">
          {confirmed.map(m => (
            <MatchRow key={m.id} m={m} clanName={clanName} actions={
              <div className="text-xs text-gold font-display flex items-center gap-3">
                <span className="flex items-center gap-1"><Calendar size={12} /> {m.scheduled_date}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {m.scheduled_time}</span>
                <span>{m.rounds} {m.rounds === 1 ? 'partida' : 'partidas'}</span>
              </div>
            } />
          ))}
        </Section>
      )}

      {/* Histórico */}
      <Section title="📜 HISTÓRICO" tone="muted" icon={<History size={14} />}>
        {history.length === 0 && <p className="text-center text-muted-foreground text-sm font-display">Nenhum CW finalizado ou recusado</p>}
        {history.map(m => (
          <MatchRow key={m.id} m={m} clanName={clanName} actions={
            <span className={`text-xs font-heading ${m.status === 'finalized' ? 'text-success' : 'text-destructive'}`}>
              {m.status === 'finalized' ? `${m.score_a} x ${m.score_b}` : 'RECUSADO'}
            </span>
          } />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, tone, icon, children }: { title: string; tone: 'primary' | 'success' | 'muted' | 'gold'; icon?: React.ReactNode; children: React.ReactNode }) {
  const toneClass = {
    primary: 'border-primary/30 text-primary',
    success: 'border-success/30 text-success',
    gold: 'border-gold/30 text-gold',
    muted: 'border-border text-muted-foreground',
  }[tone];
  return (
    <div className={`bg-card rounded-lg border p-5 space-y-3 ${toneClass.split(' ')[0]}`}>
      <h3 className={`font-heading text-sm flex items-center gap-2 ${toneClass.split(' ')[1]}`}>{icon}{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MatchRow({ m, clanName, actions }: { m: MatchCW; clanName: (id: string) => string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-secondary/40 rounded-md">
      <div className="flex items-center gap-2 text-sm font-display">
        <span className="text-foreground font-heading">{clanName(m.clan_a_id)}</span>
        <span className="text-primary font-heading">VS</span>
        <span className="text-foreground font-heading">{clanName(m.clan_b_id)}</span>
      </div>
      {actions}
    </div>
  );
}

function CoordChat({ match, myClanId, username, userId, onConfirm }: {
  match: MatchCW; myClanId: string; username: string; userId: string; onConfirm: () => void;
}) {
  const [msgs, setMsgs] = useState<MatchMessage[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rounds, setRounds] = useState(1);
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
    await supabase.from('matchcw_messages').insert({
      matchcw_id: match.id, user_id: userId, username, clan_id: myClanId, message: text.trim(),
    });
    setText('');
  };

  const confirm = async () => {
    if (!date || !time) { toast.error('Defina data e horário'); return; }
    const { error } = await supabase.rpc('confirm_matchcw', { _match_id: match.id, _date: date, _time: time, _rounds: rounds });
    if (error) toast.error(error.message);
    else { toast.success('CW marcado! Chat fechado.'); onConfirm(); }
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
        <button onClick={send} className="px-3 py-2 gradient-primary text-primary-foreground rounded"><Send size={14} /></button>
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-xs font-heading text-primary mb-2">📅 MARCAR CW</p>
        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 bg-secondary rounded text-xs font-display border border-border" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-2 bg-secondary rounded text-xs font-display border border-border" />
          <input type="number" min={1} max={10} value={rounds} onChange={e => setRounds(Number(e.target.value))} placeholder="Partidas" className="p-2 bg-secondary rounded text-xs font-display border border-border" />
        </div>
        <button onClick={confirm} className="mt-2 w-full px-3 py-2 bg-gold/20 text-gold border border-gold/40 rounded font-heading text-xs">Confirmar e Fechar Chat</button>
      </div>
    </div>
  );
}
