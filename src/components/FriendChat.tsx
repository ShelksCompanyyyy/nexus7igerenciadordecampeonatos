import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Smile } from 'lucide-react';
import { toast } from 'sonner';

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

const EMOJIS = ['😀','😂','😎','🥳','😍','🤔','😡','😢','👍','👎','🙏','🔥','💯','🎯','🏆','💀','🎮','⚔️','🛡️','💰','✅','❌','🚀','💪'];

export default function FriendChat({
  open, onOpenChange, myId, friendId, friendName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  myId: string;
  friendId: string;
  friendName: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('friend_messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${myId})`)
      .order('created_at', { ascending: true })
      .limit(200);
    setMsgs((data || []) as Msg[]);
    // mark as read
    await supabase.from('friend_messages').update({ read: true })
      .eq('recipient_id', myId).eq('sender_id', friendId).eq('read', false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase.channel(`friend-chat-${myId}-${friendId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_messages' }, (payload) => {
        const m = payload.new as Msg;
        if (
          (m.sender_id === myId && m.recipient_id === friendId) ||
          (m.sender_id === friendId && m.recipient_id === myId)
        ) {
          setMsgs(prev => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, myId, friendId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const { error } = await supabase.from('friend_messages').insert({
      sender_id: myId, recipient_id: friendId, message: text,
    });
    if (error) { toast.error(error.message); setInput(text); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/30">
        <DialogHeader className="p-4 border-b border-border bg-card">
          <DialogTitle className="font-heading text-primary text-glow-sm flex items-center gap-2">
            💬 {friendName}
          </DialogTitle>
        </DialogHeader>

        <div className="h-[55vh] overflow-y-auto p-3 space-y-2 bg-background/50">
          {msgs.length === 0 && (
            <p className="text-center text-xs text-muted-foreground font-display py-8">
              Comece a conversa! 👋
            </p>
          )}
          {msgs.map(m => {
            const mine = m.sender_id === myId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm font-display whitespace-pre-wrap break-words ${
                  mine ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-foreground rounded-bl-none'
                }`}>
                  {m.message}
                  <div className={`text-[9px] mt-1 opacity-70 ${mine ? 'text-right' : ''}`}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {showEmojis && (
          <div className="px-3 py-2 border-t border-border bg-card grid grid-cols-8 gap-1">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => { setInput(p => p + e); }}
                className="text-xl hover:bg-secondary rounded p-1 transition-colors">
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-border bg-card flex items-center gap-2">
          <button type="button" onClick={() => setShowEmojis(s => !s)}
            className="p-2 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Emojis">
            <Smile size={18} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Mensagem..."
            className="flex-1 p-2 bg-secondary rounded border border-border text-foreground font-display text-sm outline-none focus:border-primary"
          />
          <button onClick={send} disabled={!input.trim()}
            className="p-2 rounded gradient-primary text-primary-foreground disabled:opacity-50">
            <Send size={16} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
