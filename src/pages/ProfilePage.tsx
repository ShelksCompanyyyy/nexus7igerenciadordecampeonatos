import { useAuth } from '@/contexts/AuthContext';
import { getTeams, getMatches } from '@/lib/store';
import { UserCircle, Copy, Trophy, Target, Zap, Shield, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const teams = getTeams();
  const userTeam = teams.find(t => t.players.includes(user.id));
  const kd = user.deaths > 0 ? (user.kills / user.deaths).toFixed(2) : user.kills.toFixed(2);

  const copyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success('ID copiado!');
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div className="bg-card rounded-lg neon-border-strong p-6 text-center">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-3xl mx-auto mb-4">
          {user.gameNick?.[0]?.toUpperCase() || user.username[0]?.toUpperCase()}
        </div>
        <h1 className={`text-2xl font-heading ${user.coloredNick ? 'text-primary text-glow' : 'text-foreground'}`}>
          {user.gameNick || user.username}
        </h1>
        <p className="text-muted-foreground font-display text-sm">@{user.username}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-display">ID: {user.id}</span>
          <button onClick={copyId} className="text-primary hover:text-neon-glow"><Copy size={12} /></button>
        </div>
        {user.badges.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {user.badges.map(b => (
              <span key={b} className="px-2 py-1 bg-primary/10 border border-primary/30 rounded text-xs font-heading text-primary">{b}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm font-display">
          <span className="text-gold">{user.gold}G</span>
          <span className="text-primary">{user.freeSpins} Giros</span>
        </div>
      </div>

      {/* Stats */}
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
