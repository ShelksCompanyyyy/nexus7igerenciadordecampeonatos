import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Swords, Send, Check, X, Plus, Calendar, Clock, MessageCircle, History, Crown, DollarSign, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Clan { id: string; name: string; logo: string | null; }
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
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqRounds, setReqRounds] = useState(1);
  const [isBet, setIsBet] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositProof, setDepositProof] = useState<File | null>(null);
  const [myDeposits, setMyDeposits] = useState<Array<{ id: string; amount: number; status: string; created_at: string }>>([]);
  const [myBets, setMyBets] = useState<Array<{ id: string; matchcw_id: string; amount: number; status: string }>>([]);

  const loadAll = useCallback(async () => {
    const { data: c } = await supabase.from('clans').select('id, name, logo').eq('is_banned', false);
    setClans(c || []);
    const { data: m } = await supabase
      .from('matchcw')
      .select('*')
      .order('created_at', { ascending: false });
    setMatches((m || []) as MatchCW[]);
    if (user) {
      const { data: dep } = await supabase.from('deposits').select('id, amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8);
      setMyDeposits((dep || []) as never);
      const { data: b } = await supabase.from('matchcw_bets').select('id, matchcw_id, amount, status').eq('user_id', user.id);
      setMyBets((b || []) as never);
      const { data: e } = await supabase.from('economy').select('balance').eq('user_id', user.id).maybeSingle();
      setBalance(Number(e?.balance || 0));
    }
  }, [myClanId, user]);

  useEffect(() => {
    if (!myClanId || !user) return;
    loadAll();

    // Verifica se é líder/vice do clã
    supabase.from('clan_members').select('role').eq('clan_id', myClanId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setIsClanLeader(!!data && (data.role === 'leader' || data.role === 'co_leader')));

    const ch = supabase
      .channel('matchcw-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchcw' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchcw_bets', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myClanId, user, loadAll]);

  const clanName = (id: string | null) => (id ? clans.find(c => c.id === id)?.name || '???' : 'AGUARDANDO...');
  const lockedTotal = myBets.filter(b => b.status === 'locked').reduce((s, b) => s + Number(b.amount), 0);

  const submitDeposit = async () => {
    if (!user) return;
    if (depositAmount <= 0) { toast.error('Valor inválido'); return; }
    let proofUrl: string | null = null;
    if (depositProof) {
      const path = `${user.id}/${Date.now()}_${depositProof.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const { error: upErr } = await supabase.storage.from('deposit-proofs').upload(path, depositProof);
      if (upErr) { toast.error('Erro no upload: ' + upErr.message); return; }
      const { data } = supabase.storage.from('deposit-proofs').getPublicUrl(path);
      proofUrl = data.publicUrl;
    }
    const { error } = await supabase.from('deposits').insert({
      user_id: user.id, amount: depositAmount, method: 'pix',
      proof_url: proofUrl, pix_key: '6d16f765-9587-494c-9f4b-4c12941c716d',
    });
    if (error) { toast.error(error.message); return; }
    navigator.clipboard.writeText('6d16f765-9587-494c-9f4b-4c12941c716d');
    toast.success(`✅ Pedido enviado! Chave PIX copiada. Após confirmação do ADM, R$ ${depositAmount.toFixed(2)} será creditado.`);
    setShowDeposit(false); setDepositAmount(50); setDepositProof(null); loadAll();
  };

  const canManage = isClanLeader || role === 'superadmin';

  const sendRequest = async () => {
    if (isBet && betAmount <= 0) { toast.error('Defina o valor da aposta'); return; }
    if (isBet && betAmount > balance) { toast.error(`Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)}`); return; }
    const { error } = await supabase.rpc('request_matchcw', {
      _clan_a: myClanId,
      _clan_b: undefined,
      _notes: notes || null,
      _date: reqDate || null,
      _time: reqTime || null,
      _rounds: reqRounds,
      _is_bet: isBet,
      _bet_amount: isBet ? betAmount : 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(isBet ? `⚔️ Aposta de R$ ${betAmount.toFixed(2)} bloqueada!` : '⚔️ Procurando adversário...');
      setShowRequest(false); setNotes(''); setReqDate(''); setReqTime(''); setReqRounds(1); setIsBet(false); setBetAmount(0);
      loadAll();
    }
  };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_matchcw', { _match_id: id, _accept: accept });
    if (error) toast.error(error.message);
    else { toast.success(accept ? 'Match aceito!' : 'Match recusado'); loadAll(); }
  };

  const finalize = async (m: MatchCW, winnerClan: string, sa: number, sb: number) => {
    const { data, error } = await supabase.rpc('finalize_matchcw', {
      _match_id: m.id, _score_a: sa, _score_b: sb, _winner_clan: winnerClan,
    });
    if (error) { toast.error(error.message); return; }
    if (m.is_bet_match && data) {
      const d = data as { winner_payout?: number; site_fee?: number };
      toast.success(`🏆 Pago R$ ${Number(d.winner_payout||0).toFixed(2)} ao vencedor (taxa site: R$ ${Number(d.site_fee||0).toFixed(2)})`);
    } else {
      toast.success('Match finalizado!');
    }
    loadAll();
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
          <h3 className="font-heading text-sm text-primary">🔍 Procurar MatchCW</h3>
          <p className="text-xs text-muted-foreground font-display">Seu pedido ficará público — qualquer outro clã pode aceitar.</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mensagem opcional..." rows={2}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-display flex items-center gap-1 mb-1"><Calendar size={10}/> Data</label>
              <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} className="w-full p-2 bg-secondary rounded border border-border text-xs font-display" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-display flex items-center gap-1 mb-1"><Clock size={10}/> Horário</label>
              <input type="time" value={reqTime} onChange={e => setReqTime(e.target.value)} className="w-full p-2 bg-secondary rounded border border-border text-xs font-display" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-display mb-1 block">Partidas</label>
              <input type="number" min={1} max={10} value={reqRounds} onChange={e => setReqRounds(Number(e.target.value))} className="w-full p-2 bg-secondary rounded border border-border text-xs font-display" />
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBet} onChange={e => setIsBet(e.target.checked)} className="accent-gold" />
              <span className="text-xs font-heading text-gold flex items-center gap-1"><DollarSign size={12}/> MatchCW APOSTADO</span>
            </label>
            {isBet && (
              <div className="bg-gold/10 border border-gold/30 rounded p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground font-display">
                  💰 Saldo atual: <span className="text-gold font-heading">R$ {balance.toFixed(2)}</span>
                </p>
                <input type="number" min={1} step="0.01" value={betAmount || ''} onChange={e => setBetAmount(Number(e.target.value))}
                  placeholder="Valor da aposta (R$)" className="w-full p-2 bg-secondary rounded border border-gold/30 text-xs font-display text-gold" />
                <p className="text-[10px] text-muted-foreground font-display leading-relaxed">
                  ⚠️ O valor será debitado do seu saldo agora. O clã que aceitar deve cobrir o mesmo valor.<br/>
                  🏆 Vencedor recebe <strong className="text-gold">R$ {(betAmount * 2 * 0.85).toFixed(2)}</strong> · Taxa do site: 15% (R$ {(betAmount * 2 * 0.15).toFixed(2)})
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={sendRequest} className="px-4 py-2 gradient-primary text-primary-foreground rounded font-heading text-xs">Procurar Adversário</button>
            <button onClick={() => setShowRequest(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded font-heading text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* Pedidos abertos de OUTROS clãs */}
      <Section title="🔥 CLÃS PROCURANDO ADVERSÁRIO" tone="primary">
        {lookingForOpponent.length === 0 && (
          <p className="text-center text-muted-foreground text-sm font-display py-2">Nenhum clã está procurando agora</p>
        )}
        {lookingForOpponent.map(m => (
          <MatchRow key={m.id} m={m} clanName={clanName} actions={canManage ? (
            <button onClick={() => respond(m.id, true)} className="px-3 py-1.5 bg-success/15 text-success border border-success/30 rounded font-heading text-xs flex items-center gap-1">
              <Check size={12} /> Aceitar Match
            </button>
          ) : (
            <span className="text-xs text-muted-foreground font-display">Apenas líderes podem aceitar</span>
          )} />
        ))}
      </Section>

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
            <div key={m.id} className="space-y-2">
              <MatchRow m={m} clanName={clanName} actions={
                <div className="text-xs text-gold font-display flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {m.scheduled_date}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {m.scheduled_time}</span>
                  <span>{m.rounds} {m.rounds === 1 ? 'partida' : 'partidas'}</span>
                </div>
              } />
              {canManage && <FinalizePanel m={m} clanName={clanName} onFinalize={finalize} />}
            </div>
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
    <div className="p-3 bg-secondary/40 rounded-md space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-display">
          <span className="text-foreground font-heading">{clanName(m.clan_a_id)}</span>
          <span className="text-primary font-heading">VS</span>
          <span className="text-foreground font-heading">{clanName(m.clan_b_id)}</span>
          {m.is_bet_match && (
            <span className="ml-2 px-2 py-0.5 bg-gold/20 text-gold border border-gold/40 rounded text-[10px] font-heading flex items-center gap-1">
              <DollarSign size={10}/> R$ {Number(m.bet_amount).toFixed(2)}
            </span>
          )}
        </div>
        {actions}
      </div>
      {(m.proposed_date || m.proposed_time || m.proposed_rounds) && m.status === 'pending' && (
        <div className="text-[11px] text-muted-foreground font-display flex items-center gap-3 pl-1">
          {m.proposed_date && <span className="flex items-center gap-1"><Calendar size={10}/> {m.proposed_date}</span>}
          {m.proposed_time && <span className="flex items-center gap-1"><Clock size={10}/> {m.proposed_time}</span>}
          {m.proposed_rounds && <span>{m.proposed_rounds} {m.proposed_rounds === 1 ? 'partida' : 'partidas'}</span>}
        </div>
      )}
      {m.notes && m.status === 'pending' && (
        <p className="text-[11px] italic text-muted-foreground font-display pl-1">"{m.notes}"</p>
      )}
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

function FinalizePanel({ m, clanName, onFinalize }: {
  m: MatchCW; clanName: (id: string) => string;
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
          {m.is_bet_match && (
            <p className="text-[10px] text-muted-foreground font-display bg-gold/10 p-2 rounded">
              💰 Aposta total: R$ {(Number(m.bet_amount) * 2).toFixed(2)} → Vencedor recebe R$ {(Number(m.bet_amount) * 2 * 0.85).toFixed(2)} (15% taxa do site)
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-display">{clanName(m.clan_a_id)}</label>
              <input type="number" min={0} value={sa} onChange={e => setSa(Number(e.target.value))} className="w-full p-2 bg-secondary rounded text-xs border border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-display">{clanName(m.clan_b_id)}</label>
              <input type="number" min={0} value={sb} onChange={e => setSb(Number(e.target.value))} className="w-full p-2 bg-secondary rounded text-xs border border-border" />
            </div>
          </div>
          <select value={winner} onChange={e => setWinner(e.target.value)} className="w-full p-2 bg-secondary rounded text-xs font-display border border-border">
            <option value={m.clan_a_id}>Vencedor: {clanName(m.clan_a_id)}</option>
            <option value={m.clan_b_id}>Vencedor: {clanName(m.clan_b_id)}</option>
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
