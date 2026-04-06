import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getChatMessages, addChatMessage, getUserById, getFrameStyle, getNickColor } from '@/lib/store';
import { MessageSquare, Send } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(getChatMessages());
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setMessages(getChatMessages()), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !user) return;
    addChatMessage({
      userId: user.id,
      username: user.gameNick || user.username,
      message: text.trim(),
      timestamp: new Date().toISOString(),
    });
    setText('');
    setMessages(getChatMessages());
  };

  const renderAvatar = (msgUserId: string, username: string) => {
    const msgUser = getUserById(msgUserId);
    const frameStyle = msgUser?.frameId ? getFrameStyle(msgUser.frameId) : null;

    return (
      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xs flex-shrink-0"
        style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : undefined}>
        {username[0]?.toUpperCase()}
      </div>
    );
  };

  const renderUsername = (msgUserId: string, username: string) => {
    const msgUser = getUserById(msgUserId);
    const nickColor = msgUser?.nickColorId ? getNickColor(msgUser.nickColorId) : null;
    const frameStyle = msgUser?.frameId ? getFrameStyle(msgUser.frameId) : null;

    const nameStyle: React.CSSProperties = {};
    if (nickColor) {
      if (nickColor.startsWith('linear')) {
        nameStyle.backgroundImage = nickColor;
        nameStyle.WebkitBackgroundClip = 'text';
        nameStyle.WebkitTextFillColor = 'transparent';
      } else {
        nameStyle.color = nickColor;
        nameStyle.textShadow = `0 0 8px ${nickColor}`;
      }
    }

    return (
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-heading mb-1" style={nameStyle}>
          {username}
        </p>
        {msgUser?.badges && msgUser.badges.length > 0 && (
          <div className="flex gap-1 mb-1">
            {msgUser.badges.map(b => (
              <span key={b} className="px-1 py-0.5 rounded text-[8px] font-heading"
                style={{
                  background: b === 'badge_legend' ? 'linear-gradient(135deg, #FFD700, #FF8C00)' :
                    b === 'badge_vip' ? 'linear-gradient(135deg, #BF00FF, #8B00FF)' :
                    b === 'superadmin' ? 'linear-gradient(135deg, #FF0040, #FF6600)' :
                    b === 'founder' ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                    'hsl(var(--primary) / 0.3)',
                  color: '#fff',
                  textShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}>
                {b.replace('badge_', '').toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow mb-4 flex items-center gap-3"><MessageSquare size={28} /> CHAT GERAL</h1>
      <div className="flex-1 bg-card rounded-lg neon-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
              {renderAvatar(msg.userId, msg.username)}
              <div className={`max-w-[70%] ${msg.userId === user?.id ? 'text-right' : ''}`}>
                {renderUsername(msg.userId, msg.username)}
                <div className={`p-3 rounded-lg ${msg.userId === user?.id ? 'bg-primary/20 neon-border' : 'bg-secondary'}`}>
                  <p className="text-sm text-foreground font-display">{msg.message}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(msg.timestamp).toLocaleTimeString('pt-BR')}</p>
              </div>
            </div>
          ))}
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
