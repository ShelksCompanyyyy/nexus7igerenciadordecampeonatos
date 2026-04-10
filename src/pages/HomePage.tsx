import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import nexusLogo from '@/assets/nexus7i-logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Trophy, Users, Swords, Dices, Target, Newspaper, Zap, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const QUICK_LINKS = [
  { path: '/ranking', label: 'Ranking', icon: Trophy, desc: 'Ver classificação' },
  { path: '/teams', label: 'Lines', icon: Users, desc: 'Equipes do clã' },
  { path: '/matches', label: 'Partidas', icon: Swords, desc: 'Jogos e resultados' },
  { path: '/roulette', label: 'Roleta', icon: Dices, desc: 'Gire e ganhe' },
  { path: '/training', label: 'XTreino', icon: Target, desc: 'Treinos agendados' },
  { path: '/news', label: 'Notícias', icon: Newspaper, desc: 'Avisos do clã' },
];

export default function HomePage() {
  const { profile, user } = useAuth();
  const clanId = profile?.clan_id || '';
  const [clan, setClan] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!clanId) return;
    supabase.from('clans').select('*').eq('id', clanId).single().then(({ data }) => setClan(data));
    supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setMembers(data || []));
    supabase.from('matches').select('*').eq('clan_id', clanId).then(({ data }) => setMatches(data || []));
    supabase.from('teams').select('*').eq('clan_id', clanId).then(({ data }) => setTeams(data || []));
  }, [clanId]);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setNotifications(data || []));
  }, [user]);

  const topMvp = [...members].sort((a, b) => (b.mvps || 0) - (a.mvps || 0))[0];
  const topKiller = [...members].sort((a, b) => (b.kills || 0) - (a.kills || 0))[0];
  const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 3);

  const isNewUser = profile ? (new Date().getTime() - new Date(profile.created_at).getTime()) < 1000 * 60 * 60 * 24 * 3 : false;

  return (
    <div className="space-y-8 animate-slide-up">
      {isNewUser && (
        <Link to="/tutorial" className="block bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/40 rounded-xl p-5 hover:border-primary/60 transition-all group animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-all">
              <BookOpen size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-lg text-primary text-glow-sm">📖 TUTORIAL DO APP</h2>
              <p className="text-sm text-foreground font-display mt-1">Aprenda a usar todas as funcionalidades do app!</p>
              <p className="text-xs text-muted-foreground font-display mt-1 italic">⭐ Recomendado ler o tutorial, para melhor entendimento do app</p>
            </div>
            <Zap size={20} className="text-primary animate-pulse" />
          </div>
        </Link>
      )}

      {notifications.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-heading text-xs text-primary flex items-center gap-2">🔔 NOTIFICAÇÕES ({notifications.length})</h3>
          {notifications.slice(0, 3).map(n => (
            <div key={n.id} className={`p-3 rounded-lg border text-sm font-display ${
              n.type === 'withdrawal' ? 'border-gold/30 bg-gold/5' : 'border-primary/30 bg-primary/5'
            }`}>
              <p className="font-heading text-xs text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden neon-border-strong" style={{ minHeight: '300px' }}>
        {clan?.banner ? <img src={clan.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" /> :
          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-4 text-center">
          {clan?.logo ? <img src={clan.logo} alt="" className="w-28 h-28 rounded-xl animate-float drop-shadow-[0_0_40px_hsl(0,100%,50%,0.6)] mb-4 object-cover" /> :
            <img src={nexusLogo} alt="Nexus7i" className="w-28 h-28 animate-float drop-shadow-[0_0_40px_hsl(0,100%,50%,0.6)] mb-4" />}
          <h1 className="text-3xl md:text-5xl font-heading text-primary text-glow tracking-widest">{clan?.name || 'NEXUS7i'}</h1>
          <p className="text-lg md:text-xl font-display text-foreground/80 tracking-[0.3em] mt-1">E-SPORTS</p>
          <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm font-display">
            <Zap size={14} className="text-primary" />
            <span>Bem-vindo, <span className="text-primary">{profile?.username}</span></span>
            <Zap size={14} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map(link => (
          <Link key={link.path} to={link.path}
            className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg border border-border hover:neon-border transition-all group">
            <link.icon size={28} className="text-primary group-hover:text-glow transition-all" />
            <span className="font-heading text-xs text-foreground">{link.label}</span>
            <span className="text-[10px] text-muted-foreground font-display">{link.desc}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg neon-border p-5">
          <h3 className="font-heading text-xs text-primary mb-3 flex items-center gap-2"><Trophy size={14} /> TOP MVP</h3>
          {topMvp ? (
            <div className="flex items-center gap-3">
              {topMvp.avatar ? <img src={topMvp.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> :
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading">{topMvp.game_nick?.[0]?.toUpperCase()}</div>}
              <div>
                <p className="font-display text-foreground">{topMvp.game_nick}</p>
                <p className="text-primary text-sm font-heading">{topMvp.mvps || 0} MVPs</p>
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm font-display">Nenhum MVP ainda</p>}
        </div>
        <div className="bg-card rounded-lg neon-border p-5">
          <h3 className="font-heading text-xs text-primary mb-3 flex items-center gap-2"><Target size={14} /> MELHOR JOGADOR</h3>
          {topKiller ? (
            <div className="flex items-center gap-3">
              {topKiller.avatar ? <img src={topKiller.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /> :
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-heading">{topKiller.game_nick?.[0]?.toUpperCase()}</div>}
              <div>
                <p className="font-display text-foreground">{topKiller.game_nick}</p>
                <p className="text-sm text-muted-foreground font-display">{topKiller.kills || 0}K / {topKiller.deaths || 0}D / {topKiller.assists || 0}A</p>
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm font-display">Sem dados</p>}
        </div>
        <div className="bg-card rounded-lg neon-border p-5">
          <h3 className="font-heading text-xs text-primary mb-3 flex items-center gap-2"><Zap size={14} /> ESTATÍSTICAS</h3>
          <div className="space-y-2 font-display text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Membros</span><span className="text-foreground">{members.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lines</span><span className="text-foreground">{teams.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Partidas</span><span className="text-foreground">{matches.length}</span></div>
          </div>
        </div>
      </div>

      {upcomingMatches.length > 0 && (
        <div className="bg-card rounded-lg neon-border p-5">
          <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Swords size={16} /> PRÓXIMOS JOGOS</h3>
          <div className="space-y-3">
            {upcomingMatches.map(m => {
              const tA = teams.find(t => t.id === m.team_a_id);
              const tB = teams.find(t => t.id === m.team_b_id);
              return (
                <div key={m.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <span className="font-display text-foreground text-sm">{tA?.name || '???'}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-primary font-heading text-xs">VS</span>
                    <span className="text-[10px] text-muted-foreground">{m.match_date} {m.match_time}</span>
                  </div>
                  <span className="font-display text-foreground text-sm">{tB?.name || '???'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-2 flex items-center gap-2"><Trophy size={16} /> PREMIAÇÃO DO CAMPEONATO</h3>
        <p className="text-xs text-muted-foreground font-display mb-4">Premiação para o campeonato de Lines contra Lines</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-b from-gold/10 to-transparent rounded-lg border border-gold/30">
            <p className="font-heading text-gold text-lg">🥇 1° LUGAR</p>
            <p className="text-sm text-muted-foreground font-display mt-2">Pot total já contabilizado os 15%</p>
          </div>
          <div className="p-4 bg-gradient-to-b from-metallic/10 to-transparent rounded-lg border border-metallic/30">
            <p className="font-heading text-metallic text-lg">🥈 2° LUGAR</p>
            <p className="text-sm text-muted-foreground font-display mt-2">Entrada gratuita para o próximo campeonato</p>
          </div>
          <div className="p-4 bg-gradient-to-b from-primary/10 to-transparent rounded-lg border border-primary/30">
            <p className="font-heading text-primary text-lg">🥉 3° LUGAR</p>
            <p className="text-sm text-muted-foreground font-display mt-2">4 Rodadas grátis na roleta para cada jogador</p>
          </div>
        </div>
      </div>
    </div>
  );
}
