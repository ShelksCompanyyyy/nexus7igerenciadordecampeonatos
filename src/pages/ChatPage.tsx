import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getFrameStyle, getNickColor } from '@/lib/shopData';
import { EmblemBadges } from '@/components/Emblems';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatPage() {
  const { user, profile, isSuperAdminUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [authorMap, setAuthorMap] = useState<Record<string, any>>({});
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200);
    setMessages(data || []);
    const ids = Array.from(new Set((data || []).map((m: any) => m.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id,game_nick,username,avatar,colored_nick,nick_color_id,frame_id,badges')
        .in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setAuthorMap(map);
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel('chat').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchMessages()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user || !profile) return;
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      username: profile.game_nick || profile.username,
      message: text.trim(),
    });
    setText('');
  };

  const handleClear = async () => {
    if (!isSuperAdminUser) { toast.error('Apenas ADM Criador pode limpar o chat'); return; }
    // Only superadmin can delete all
    const { error } = await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast.error('Erro ao limpar chat');
    else { setMessages([]); toast.success('Chat limpo!'); }
  };

  const renderNick = (msg: any) => {
    const author = authorMap[msg.user_id];
    if (msg.username === 'SISTEMA') {
      return <span className="text-gold font-heading">{msg.username}</span>;
    }
    const color = author?.colored_nick && author?.nick_color_id ? getNickColor(author.nick_color_id) : null;
    const isGradient = color?.includes('gradient');
    const style = color
      ? isGradient
        ? { background: color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
        : { color, textShadow: `0 0 8px ${color}` }
      : {};
    return <span style={style as any}>{msg.username}</span>;
  };

  const renderBadges = (msg: any) => {
    const author = authorMap[msg.user_id];
    const badges: string[] = author?.badges || [];
    if (!badges.length) return null;
    return <EmblemBadges ids={badges} size="xs" max={3} className="ml-1" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
          <MessageSquare size={28} /> CHAT GERAL
        </h1>
        {isSuperAdminUser && (
          <button onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-heading bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-all">
            <Trash2 size={14} /> Limpar Chat
          </button>
        )}
      </div>
      <div className="flex-1 bg-card rounded-lg neon-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-muted-foreground font-display text-sm">Nenhuma mensagem ainda. Seja o primeiro!</p>
            </div>
          )}
          {messages.map(msg => {
            const author = authorMap[msg.user_id];
            const frameStyle = author?.frame_id ? getFrameStyle(author.frame_id) : null;
            const isSystem = msg.username === 'SISTEMA';
            return (
              <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.id && !isSystem ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xs flex-shrink-0 overflow-hidden"
                  style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : {}}
                >
                  {author?.avatar ? <img src={author.avatar} alt="" className="w-full h-full object-cover" /> : (isSystem ? '⚙️' : (msg.username?.[0]?.toUpperCase() || '?'))}
                </div>
                <div className={`max-w-[70%] ${msg.user_id === user?.id && !isSystem ? 'text-right' : ''}`}>
                  <p className="text-xs font-heading mb-1 flex items-center gap-1 flex-wrap">
                    {renderNick(msg)}
                    {renderBadges(msg)}
                  </p>
                  <div className={`p-3 rounded-lg ${isSystem ? 'bg-gold/10 border border-gold/30' : msg.user_id === user?.id ? 'bg-primary/20 neon-border' : 'bg-secondary'}`}>
                    <p className={`text-sm font-display ${isSystem ? 'text-gold' : 'text-foreground'}`}>{msg.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 p-3 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm"
          />
          <button onClick={handleSend} className="px-4 gradient-primary text-primary-foreground rounded flex items-center">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
