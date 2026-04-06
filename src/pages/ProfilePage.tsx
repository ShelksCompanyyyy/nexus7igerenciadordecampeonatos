import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTeams, getFrameStyle, getNickColor, updateUser } from '@/lib/store';
import { UserCircle, Copy, Trophy, Target, Zap, Shield, Award, Camera, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editGameNick, setEditGameNick] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');

  if (!user) return null;

  const teams = getTeams();
  const userTeam = teams.find(t => t.players.includes(user.id));
  const kd = user.deaths > 0 ? (user.kills / user.deaths).toFixed(2) : user.kills.toFixed(2);
  const frameStyle = user.frameId ? getFrameStyle(user.frameId) : null;
  const nickColor = user.nickColorId ? getNickColor(user.nickColorId) : null;

  const copyId = () => {
    navigator.clipboard.writeText(user.uniqueId || user.id);
    toast.success('ID copiado!');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateUser(user.id, { avatar: dataUrl });
      refreshUser();
      toast.success('Foto de perfil atualizada!');
    };
    reader.readAsDataURL(file);
  };

  const startEditing = () => {
    setEditUsername(user.username);
    setEditGameNick(user.gameNick);
    setEditWhatsapp(user.whatsapp);
    setEditing(true);
  };

  const saveProfile = () => {
    if (!editUsername.trim() || !editGameNick.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    updateUser(user.id, { username: editUsername, gameNick: editGameNick, whatsapp: editWhatsapp });
    refreshUser();
    setEditing(false);
    toast.success('Perfil atualizado!');
  };

  const nickStyle: React.CSSProperties = {};
  if (nickColor) {
    if (nickColor.startsWith('linear')) {
      nickStyle.backgroundImage = nickColor;
      nickStyle.WebkitBackgroundClip = 'text';
      nickStyle.WebkitTextFillColor = 'transparent';
    } else {
      nickStyle.color = nickColor;
      nickStyle.textShadow = `0 0 12px ${nickColor}`;
    }
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div className="bg-card rounded-lg neon-border-strong p-6 text-center">
        {/* Avatar with upload */}
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-3xl"
            style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : undefined}>
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user.gameNick?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-lg">
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

        {/* Name / Edit */}
        {editing ? (
          <div className="space-y-3 max-w-xs mx-auto">
            <input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="Username"
              className="w-full p-2 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm text-center" />
            <input value={editGameNick} onChange={e => setEditGameNick(e.target.value)} placeholder="Nick do Jogo"
              className="w-full p-2 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm text-center" />
            <input value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} placeholder="WhatsApp"
              className="w-full p-2 bg-secondary rounded border border-border focus:border-primary outline-none text-foreground font-display text-sm text-center" />
            <div className="flex justify-center gap-2">
              <button onClick={saveProfile} className="px-4 py-1 gradient-primary text-primary-foreground rounded text-xs font-heading flex items-center gap-1"><Check size={12} /> Salvar</button>
              <button onClick={() => setEditing(false)} className="px-4 py-1 bg-secondary text-muted-foreground rounded text-xs font-heading flex items-center gap-1"><X size={12} /> Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <h1 className={`text-2xl font-heading ${!nickColor && user.coloredNick ? 'text-primary text-glow' : 'text-foreground'}`}
                style={nickColor ? nickStyle : undefined}>
                {user.gameNick || user.username}
              </h1>
              <button onClick={startEditing} className="text-muted-foreground hover:text-primary transition-colors"><Edit size={16} /></button>
            </div>
            <p className="text-muted-foreground font-display text-sm">@{user.username}</p>
          </>
        )}

        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-display">ID: #{user.uniqueId || user.id}</span>
          <button onClick={copyId} className="text-primary hover:text-neon-glow"><Copy size={12} /></button>
        </div>
        {user.badges.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {user.badges.map(b => (
              <span key={b} className="px-2 py-1 rounded text-xs font-heading"
                style={{
                  background: b === 'badge_legend' ? 'linear-gradient(135deg, #FFD700, #FF8C00)' :
                    b === 'badge_vip' ? 'linear-gradient(135deg, #BF00FF, #8B00FF)' :
                    b === 'superadmin' ? 'linear-gradient(135deg, #FF0040, #FF6600)' :
                    b === 'founder' ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                    'hsl(var(--primary) / 0.3)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                {b.replace('badge_', '').toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm font-display">
          <span className="text-gold">{user.gold}G</span>
          <span className="text-primary">{user.freeSpins} Giros</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Kills', value: user.kills, icon: Target },
          { label: 'Mortes', value: user.deaths, icon: Zap },
          { label: 'Assistências', value: user.assists, icon: Shield },
          { label: 'K/D', value: kd, icon: Award },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-lg neon-border p-4 text-center">
            <stat.icon size={20} className="text-primary mx-auto mb-2" />
            <p className="font-heading text-lg text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-display">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-3">MVPs: {user.mvps}</h3>
        <h3 className="font-heading text-sm text-foreground mb-1">Time: {userTeam?.name || 'Sem time'}</h3>
        <p className="text-xs text-muted-foreground font-display">Partidas: {user.matchesPlayed}</p>
      </div>
    </div>
  );
}
