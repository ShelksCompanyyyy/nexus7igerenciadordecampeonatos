import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { MessageCircle, Plus, Send, ArrowLeft, X, RotateCcw } from 'lucide-react';

interface Ticket { id: string; subject: string; status: string; created_at: string; updated_at: string; user_id: string; }
interface Message { id: string; ticket_id: string; user_id: string; is_staff: boolean; message: string; created_at: string; }

export default function SupportPage() {
  const { user, isSuperAdminUser } = useAuth();
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [firstMsg, setFirstMsg] = useState('');

  const loadTickets = useCallback(async () => {
    let q = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
    if (!isSuperAdminUser && user) q = q.eq('user_id', user.id);
    const { data } = await q;
    setTickets((data || []) as Ticket[]);
  }, [isSuperAdminUser, user]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    const ch = supabase.channel('support-tickets-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadTickets]);

  const createTicket = async () => {
    if (!user) return;
    if (!subject.trim() || !firstMsg.trim()) { toast.error('Preencha assunto e mensagem'); return; }
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({ user_id: user.id, subject: subject.trim() })
      .select()
      .single();
    if (error || !ticket) { toast.error(error?.message || 'Erro ao criar chamado'); return; }
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id, user_id: user.id, is_staff: false, message: firstMsg.trim(),
    });
    setSubject(''); setFirstMsg(''); setCreating(false);
    setOpenId(ticket.id);
    loadTickets();
  };

  if (openId) {
    return <TicketView ticketId={openId} onBack={() => { setOpenId(null); loadTickets(); }} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
          <MessageCircle size={22} /> 📞 {t('support.title')}
        </h1>
        {!isSuperAdminUser && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded font-heading text-xs">
            <Plus size={14} /> {t('support.new')}
          </button>
        )}
      </div>

      {creating && !isSuperAdminUser && (
        <div className="bg-card border border-primary/40 rounded-lg p-4 space-y-3 animate-fade-in">
          <input
            value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('support.subject')}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm"
          />
          <textarea
            value={firstMsg} onChange={e => setFirstMsg(e.target.value)} placeholder={t('support.message')} rows={3}
            className="w-full p-3 bg-secondary rounded border border-border text-foreground font-display text-sm"
          />
          <div className="flex gap-2">
            <button onClick={createTicket} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded font-heading text-sm">{t('support.send')}</button>
            <button onClick={() => setCreating(false)} className="px-3 py-2 bg-secondary text-muted-foreground rounded"><X size={14} /></button>
          </div>
        </div>
      )}

      {tickets.length === 0 && !creating && (
        <div className="text-center py-12 text-muted-foreground font-display text-sm">{t('support.empty')}</div>
      )}

      <div className="space-y-2">
        {tickets.map(tk => (
          <button
            key={tk.id}
            onClick={() => setOpenId(tk.id)}
            className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm text-foreground truncate">{tk.subject}</p>
                <p className="text-[10px] text-muted-foreground font-display mt-1">
                  {new Date(tk.updated_at).toLocaleString()}
                </p>
              </div>
              <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-heading uppercase ${
                tk.status === 'open' ? 'bg-primary/15 text-primary border border-primary/40' :
                tk.status === 'closed' ? 'bg-muted text-muted-foreground border border-border' :
                'bg-warning/15 text-warning border border-warning/40'
              }`}>
                {t(`support.status.${tk.status === 'in_progress' ? 'in_progress' : tk.status}`)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TicketView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { user, isSuperAdminUser, profile } = useAuth();
  const { t } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data: tk } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
    setTicket(tk as Ticket);
    const { data: ms } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    setMessages((ms || []) as Message[]);
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!user || !text.trim() || !ticket) return;
    if (ticket.status === 'closed') { toast.error('Chamado fechado. Reabra para responder.'); return; }
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: ticketId, user_id: user.id, is_staff: !!isSuperAdminUser, message: text.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setText('');
    if (isSuperAdminUser && ticket.status === 'open') {
      await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticketId);
    } else {
      await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
    }
  };

  const toggleStatus = async () => {
    if (!ticket) return;
    const next = ticket.status === 'closed' ? 'open' : 'closed';
    await supabase.from('support_tickets').update({ status: next, updated_at: new Date().toISOString() }).eq('id', ticketId);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded bg-secondary"><ArrowLeft size={16} /></button>
        <h2 className="font-heading text-lg text-primary truncate flex-1">{ticket?.subject || '...'}</h2>
        {(ticket && (ticket.user_id === user?.id || isSuperAdminUser)) && (
          <button onClick={toggleStatus} className="px-3 py-2 bg-secondary border border-border text-xs font-heading rounded flex items-center gap-1">
            {ticket.status === 'closed' ? (<><RotateCcw size={12} /> {t('support.reopen')}</>) : (<><X size={12} /> {t('support.close')}</>)}
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2 min-h-[40vh] max-h-[60vh] overflow-y-auto">
        {messages.map(m => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`max-w-[80%] p-3 rounded-lg ${
              mine ? 'ml-auto bg-primary/15 border border-primary/30' :
              m.is_staff ? 'bg-gold/10 border border-gold/30' :
              'bg-secondary'
            }`}>
              <p className="text-[10px] text-muted-foreground font-display mb-1">
                {m.is_staff ? `🛡️ ${t('support.staff')}` : (mine ? t('support.you') : 'Usuário')}
              </p>
              <p className="text-sm text-foreground font-display whitespace-pre-wrap">{m.message}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('support.message')}
          className="flex-1 p-3 bg-secondary rounded border border-border text-foreground font-display text-sm"
        />
        <button onClick={send} className="px-4 bg-primary text-primary-foreground rounded font-heading"><Send size={16} /></button>
      </div>
    </div>
  );
}