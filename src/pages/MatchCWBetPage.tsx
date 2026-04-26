import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, Shield, Check, X, Calendar, Clock, RefreshCw, Plus, Wallet, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Clan { id: string; name: string; }
interface MatchCW {
  id: string;
  clan_a_id: string;
  clan_b_id: string | null;
  requested_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'confirmed' | 'finalized';
  scheduled_date: string | null;
  scheduled_time: string | null;
  proposed_date: string | null;
  proposed_time: string | null;
  proposed_rounds: number | null;
  rounds: number;
  notes: string | null;
  is_bet_match: boolean;
  bet_amount: number;
  bet_status: string;
  created_at: string;
}
interface Deposit { id: string; amount: number; status: string; created_at: string; }
interface BetRow { id: string; matchcw_id: string; amount: number; status: string; }

const PIX_KEY = '6d16f765-9587-494c-9f4b-4c12941c716d';

export default function MatchCWBetPage() {
  const { user, profile, role } = useAuth();
  const myClanId = profile?.clan_id || '';
  const [clans, setClans] = useState<Clan[]>([]);
  const [matches, setMatches] = useState<MatchCW[]>([]);
  const [isClanLeader, setIsClanLeader] = useState(false);
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [bets, setBets] = useState<BetRow[]>([]);

  // Create form
  const [betAmount, setBetAmount] = useState(10);
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqRounds, setReqRounds] = useState(3);
  const [notes, setNotes] = useState('');

  // Deposit form
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositProof, setDepositProof] = useState<File | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const { data: c } = await supabase.from('clans').select('id, name').eq('is_banned', false);
    setClans(c || []);
    const { data: m } = await supabase.from('matchcw').select('*').eq('is_bet_match', true).order('created_at', { ascending: false });
    setMatches((m || []) as MatchCW[]);
    const { data: e } = await supabase.from('economy').select('balance').eq('user_id', user.id).maybeSingle();
    setBalance(Number(e?.balance || 0));
    const { data: dep } = await supabase.from('deposits').select('id, amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8);
    setDeposits((dep || []) as Deposit[]);
    const { data: b } = await supabase.from('matchcw_bets').select('id, matchcw_id, amount, status').eq('user_id', user.id);
    setBets((b || []) as BetRow[]);
  }, [user]);

  useEffect(() => {
    loadAll();
    if (myClanId && user) {
      supabase.from('clan_members').select('role').eq('clan_id', myClanId).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setIsClanLeader(!!data && (data.role === 'leader' || data.role === 'co_leader')));
    }
    if (!user) return;
    const ch = supabase.channel('matchcw-bet-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchcw' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'economy', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myClanId, user, loadAll]);

  const canManage = isClanLeader || role === 'superadmin';
  const lockedTotal = bets.filter(b => b.status === 'locked').reduce((s, b) => s + Number(b.amount), 0);
  const clanLabel = (id: string | null) => (id ? clans.find(c => c.id === id)?.name || '???' : 'AGUARDANDO...');

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
      user_id: user.id, amount: depositAmount, method: 'pix', proof_url: proofUrl, pix_key: PIX_KEY,
    });
    if (error) { toast.error(error.message); return; }
    navigator.clipboard.writeText(PIX_KEY);
    toast.success(`✅ Pedido enviado! Chave PIX copiada. Após confirmação do ADM, R$ ${depositAmount.toFixed(2)} será creditado.`);
    setShowDeposit(false); setDepositAmount(50); setDepositProof(null); loadAll();
  };

  const createBetMatch = async () => {
    if (!myClanId) { toast.error('Você precisa estar em um clã'); return; }
    if (!canManage) { toast.error('Apenas líderes/vice podem criar'); return; }
    if (betAmount <= 0) { toast.error('Defina o valor da aposta'); return; }
    if (betAmount > balance) { toast.error(`Saldo insuficiente. Disponível: R$ ${balance.toFixed(2)}`); return; }
    if (!confirm(`Criar MatchCW apostado de R$ ${betAmount.toFixed(2)}? O valor será BLOQUEADO do seu saldo.`)) return;
    const { error } = await supabase.rpc('request_matchcw', {
      _clan_a: myClanId,
      _clan_b: undefined,
      _notes: notes || null,
      _date: reqDate || null,
      _time: reqTime || null,
      _rounds: reqRounds,
      _is_bet: true,
      _bet_amount: betAmount,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`💰 Aposta de R$ ${betAmount.toFixed(2)} bloqueada! Aguardando adversário...`);
    setBetAmount(10); setReqDate(''); setReqTime(''); setNotes('');
    loadAll();
  };

  const acceptBet = async (m: MatchCW) => {
    const need = Number(m.bet_amount);
    if (balance < need) { toast.error(`Saldo insuficiente. Você precisa de R$ ${need.toFixed(2)}`); return; }
    if (!confirm(`Aceitar aposta? R$ ${need.toFixed(2)} será BLOQUEADO (escrow) do seu saldo.`)) return;
    const { error } = await supabase.rpc('respond_matchcw', { _match_id: m.id, _accept: true });
    if (error) toast.error(error.message);
    else { toast.success('Aposta aceita! Valor bloqueado em escrow.'); loadAll(); }
  };

  const cancelBet = async (m: MatchCW) => {
    if (!confirm(`Cancelar este CW apostado? A aposta de R$ ${Number(m.bet_amount).toFixed(2)} será reembolsada para todos os participantes.`)) return;
    const { error } = await supabase.rpc('cancel_matchcw', { _match_id: m.id });
    if (error) { toast.error(error.message); return; }
    toast.success('🗑️ CW apostado cancelado e valores reembolsados');
    loadAll();
  };

  const lookingForOpponent = matches.filter(m => m.status === 'pending' && !m.clan_b_id && m.clan_a_id !== myClanId);
  const myMatches = matches.filter(m => m.clan_a_id === myClanId || m.clan_b_id === myClanId);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try {
      const dt = new Date(d.includes('T') ? d : d + 'T00:00:00');
      return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    } catch { return d; }
  };

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-gold text-glow flex items-center gap-2">
          <DollarSign size={26}/> CW APOSTADO
        </h1>
        <Link to="/matchcw" className="text-xs font-display text-muted-foreground hover:text-primary">← Match CW normal</Link>
      </div>

      {/* Saldo + Escrow + Depositar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card neon-border rounded-lg p-4">
          <p className="text-[10px] text-muted-foreground font-display uppercase flex items-center gap-1"><Wallet size={12}/> Saldo</p>
          <p className="font-heading text-gold text-2xl mt-1">R$ {balance.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground font-display mt-1">Disponível para apostar</p>
        </div>
        <div className="bg-card border border-warning/30 rounded-lg p-4">
          <p className="text-[10px] text-muted-foreground font-display uppercase flex items-center gap-1"><Lock size={12}/> Escrow</p>
          <p className="font-heading text-warning text-2xl mt-1">R$ {lockedTotal.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground font-display mt-1">{bets.filter(b => b.status === 'locked').length} aposta(s) ativas</p>
        </div>
        <button onClick={() => setShowDeposit(s => !s)}
          className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-lg p-4 text-left hover:from-success/30 transition-all">
          <p className="text-[10px] text-muted-foreground font-display uppercase flex items-center gap-1"><Plus size={12}/> Depositar</p>
          <p className="font-heading text-success text-xl mt-1">+ Adicionar saldo</p>
          <p className="text-[10px] text-muted-foreground font-display mt-1">PIX manual · ADM aprova</p>
        </button>
      </div>

      {/* Painel de depósito */}
      {showDeposit && (
        <div className="bg-card rounded-lg border border-success/30 p-5 space-y-3">
          <h3 className="font-heading text-sm text-success">💳 Solicitar Depósito PIX</h3>
          <div className="bg-secondary/50 rounded p-3 space-y-2">
            <p className="text-xs font-display text-foreground">1. Envie o PIX para a chave abaixo:</p>
            <div className="flex items-center justify-between gap-2 bg-background/60 rounded p-2">
              <code className="text-xs text-gold break-all">{PIX_KEY}</code>
              <button onClick={() => { navigator.clipboard.writeText(PIX_KEY); toast.success('Chave copiada!'); }}
                className="text-xs text-primary shrink-0 underline">Copiar</button>
            </div>
            <p className="text-xs font-display text-foreground mt-2">2. Anexe o comprovante e confirme:</p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-display block mb-1">Valor do depósito (R$)</label>
            <input type="number" min={5} step="0.01" value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))}
              className="w-full p-2 bg-secondary rounded border border-success/30 text-sm font-display text-foreground" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-display block mb-1">Comprovante (opcional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setDepositProof(e.target.files?.[0] || null)}
              className="w-full text-xs text-muted-foreground font-display" />
          </div>
          <p className="text-[10px] text-muted-foreground font-display">⏳ Após o ADM confirmar, R$ {depositAmount.toFixed(2)} será creditado automaticamente.</p>
          <div className="flex gap-2">
            <button onClick={submitDeposit} className="px-4 py-2 bg-success/20 text-success border border-success/40 rounded font-heading text-xs">Enviar Pedido</button>
            <button onClick={() => setShowDeposit(false)} className="px-4 py-2 bg-secondary text-muted-foreground rounded font-heading text-xs">Cancelar</button>
          </div>
          {deposits.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1">
              <p className="text-[10px] font-heading text-muted-foreground">MEUS DEPÓSITOS RECENTES</p>
              {deposits.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs font-display p-2 bg-secondary/40 rounded">
                  <span className="text-foreground">R$ {Number(d.amount).toFixed(2)}</span>
                  <span className={d.status === 'approved' ? 'text-success' : d.status === 'rejected' ? 'text-destructive' : 'text-warning'}>
                    {d.status === 'approved' ? '✅ Aprovado' : d.status === 'rejected' ? '❌ Rejeitado' : '⏳ Pendente'}
                  </span>
                  <span className="text-muted-foreground text-[10px]">{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Criar aposta */}
      {myClanId && canManage && (
        <div className="bg-card border border-gold/40 rounded-lg p-5 space-y-3">
          <h3 className="font-heading text-sm text-gold">⚔️ CRIAR MATCH APOSTADO</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)}
              className="p-3 bg-secondary rounded border border-border text-sm font-display" />
            <input type="time" value={reqTime} onChange={e => setReqTime(e.target.value)}
              className="p-3 bg-secondary rounded border border-border text-sm font-display" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 5, 7].map(n => (
              <button key={n} onClick={() => setReqRounds(n)}
                className={`py-2.5 rounded font-heading text-sm ${reqRounds === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{n}</button>
            ))}
          </div>
          <div>
            <label className="text-xs font-display text-muted-foreground block mb-1.5">Valor da aposta (R$)</label>
            <input type="number" min={1} step="0.01" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))}
              className="w-full p-3 bg-secondary rounded border border-gold/30 text-gold text-sm font-display" />
            <p className="text-[10px] text-muted-foreground font-display mt-1.5">
              💰 Saldo: R$ {balance.toFixed(2)} · Vencedor recebe <strong className="text-gold">R$ {(betAmount * 2 * 0.85).toFixed(2)}</strong> (taxa 15%)
            </p>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mensagem opcional..." rows={2}
            className="w-full p-3 bg-secondary rounded border border-border text-sm font-display" />
          <button onClick={createBetMatch} disabled={betAmount > balance}
            className="w-full py-3 bg-gold/20 text-gold border border-gold/40 rounded font-heading text-sm disabled:opacity-50">
            CRIAR APOSTA · BLOQUEAR R$ {betAmount.toFixed(2)}
          </button>
        </div>
      )}

      {/* Disponíveis */}
      <div className="space-y-3">
        <h3 className="font-heading text-sm text-gold">🔥 APOSTAS DISPONÍVEIS</h3>
        {lookingForOpponent.length === 0 && (
          <p className="text-center text-muted-foreground text-sm font-display py-4">Nenhuma aposta aberta agora</p>
        )}
        {lookingForOpponent.map(m => (
          <div key={m.id} className="bg-card border border-gold/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-gold"/>
                <span className="font-heading text-gold">{clanLabel(m.clan_a_id)}</span>
              </div>
              <span className="px-2 py-1 bg-gold/20 border border-gold/60 rounded text-[10px] font-heading text-gold">
                R$ {Number(m.bet_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-display text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar size={14}/> {fmtDate(m.proposed_date)}</span>
              <span className="flex items-center gap-1.5"><Clock size={14}/> {m.proposed_time || '—'}</span>
              <span className="flex items-center gap-1.5"><RefreshCw size={14}/> {m.proposed_rounds} rounds</span>
            </div>
            {m.notes && <p className="text-xs italic text-muted-foreground font-display">"{m.notes}"</p>}
            {canManage && (
              <button onClick={() => acceptBet(m)}
                className="w-full py-3 rounded font-heading text-sm" style={{ background: 'hsl(120 100% 50%)', color: 'hsl(0 0% 5%)' }}>
                <Check size={16} className="inline mr-2" strokeWidth={3}/> ACEITAR APOSTA
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Meus apostados */}
      {myMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-sm text-primary">🎯 MINHAS APOSTAS</h3>
          {myMatches.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading text-foreground text-sm">
                  {clanLabel(m.clan_a_id)} <span className="text-primary mx-1">vs</span> {clanLabel(m.clan_b_id)}
                </span>
                <span className="px-2 py-1 bg-gold/20 border border-gold/60 rounded text-[10px] font-heading text-gold">
                  R$ {Number(m.bet_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-display">
                <span className="text-muted-foreground">{m.status.toUpperCase()}</span>
                <span className="text-warning">Escrow: {m.bet_status}</span>
              </div>
              {canManage && m.status !== 'finalized' && (
                <button
                  onClick={() => cancelBet(m)}
                  className="w-full mt-2 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded font-heading text-xs flex items-center justify-center gap-2 hover:bg-destructive/15"
                >
                  <Trash2 size={14} /> Cancelar e reembolsar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
