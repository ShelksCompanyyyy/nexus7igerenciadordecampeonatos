import { useAuth } from '@/contexts/AuthContext';
import { getTeams, getFrameStyle, getNickColor } from '@/lib/store';
import { UserCircle, Copy, Trophy, Target, Zap, Shield, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
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
        <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-3xl mx-auto mb-4"
          style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : undefined}>
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.gameNick?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()
          )}
        </div>
        <h1 className={`text-2xl font-heading ${!nickColor && user.coloredNick ? 'text-primary text-glow' : 'text-foreground'}`}
          style={nickColor ? nickStyle : undefined}>
          {user.gameNick || user.username}
        </h1>
        <p className="text-muted-foreground font-display text-sm">@{user.username}</p>
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
