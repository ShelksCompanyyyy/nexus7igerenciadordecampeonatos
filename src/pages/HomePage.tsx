import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import nexusLogo from '@/assets/nexus7i-logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Trophy, Swords, Target, Zap, BookOpen, Coins, Activity, ChevronRight, Plus, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const { profile, user } = useAuth();
  const clanId = profile?.clan_id || '';
  const [clan, setClan] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [matchcw, setMatchcw] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);

  useEffect(() => {
    if (!clanId) return;
    supabase.from('clans').select('*').eq('id', clanId).single().then(({ data }) => setClan(data));
    supabase.from('profiles').select('*').eq('clan_id', clanId).then(({ data }) => setMembers(data || []));
    supabase.from('teams').select('*').eq('clan_id', clanId).then(({ data }) => setTeams(data || []));
    supabase.from('matchcw').select('*').or(`clan_a_id.eq.${clanId},clan_b_id.eq.${clanId}`)
      .order('created_at', { ascending: false }).limit(5).then(({ data }) => setMatchcw(data || []));
    supabase.from('trainings').select('*').eq('clan_id', clanId)
      .order('training_date', { ascending: true }).limit(5).then(({ data }) => setTrainings(data || []));
  }, [clanId]);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setNotifications(data || []));
  }, [user]);

  const topMvp = [...members].sort((a, b) => (b.mvps || 0) - (a.mvps || 0))[0];
  const clanRank = clan ? `${clan.wins || 0}V / ${clan.losses || 0}D` : '—';
  const nextMatchCW = matchcw.find(m => m.status === 'accepted' || m.status === 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const nextTraining = trainings.find(t => (t.training_date || '') >= today) || trainings[0];

  const isNewUser = profile ? (new Date().getTime() - new Date(profile.created_at).getTime()) < 1000 * 60 * 60 * 24 * 3 : false;

  const activity: { icon: any; text: string; sub: string; when: string }[] = [];
  matchcw.slice(0, 2).forEach(m => activity.push({
    icon: Swords,
    text: m.status === 'pending' ? 'Desafio MatchCW pendente' : m.status === 'accepted' ? 'MatchCW aceito' : 'MatchCW finalizado',
    sub: `${m.scheduled_date || m.proposed_date || ''} ${m.scheduled_time || m.proposed_time || ''}`.trim() || '—',
    when: new Date(m.created_at).toLocaleDateString('pt-BR'),
  }));
  trainings.slice(0, 2).forEach(t => activity.push({
    icon: Target,
    text: t.title || 'Treino agendado',
    sub: `${t.training_date} ${t.training_time || ''}`.trim(),
    when: new Date(t.created_at).toLocaleDateString('pt-BR'),
  }));
  if (topMvp) activity.push({ icon: Trophy, text: `${topMvp.game_nick} é o TOP MVP`, sub: `${topMvp.mvps || 0} MVPs`, when: '' });

  return (
    <div className="space-y-6 animate-slide-up">
      {isNewUser && (
        <Link to="/tutorial" className="block bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 hover:border-primary/60 transition-all group">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-primary shrink-0" />
            <span className="font-heading text-[11px] text-primary">TUTORIAL</span>
            <span className="text-[10px] text-muted-foreground font-display truncate">Aprenda a usar o app</span>
            <Zap size={12} className="text-primary ml-auto" />
          </div>
        </Link>
      )}

      {notifications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xs text-primary flex items-center gap-2">🔔 NOTIFICAÇÕES ({notifications.length})</h3>
            <Link to="/notifications" className="text-[10px] text-primary font-display hover:underline">Ver todas →</Link>
          </div>
          {notifications.slice(0, 3).map(n => (
            <Link key={n.id} to="/notifications" className={`block p-3 rounded-lg border text-sm font-display hover:border-primary/60 transition-all ${
              n.type === 'withdrawal' ? 'border-gold/30 bg-gold/5' : 'border-primary/30 bg-primary/5'
            }`}>
              <p className="font-heading text-xs text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
            </Link>
          ))}
        </div>
      )}

      {/* 1. BANNER PRINCIPAL */}
      <div className="relative rounded-xl overflow-hidden neon-border-strong" style={{ minHeight: '260px' }}>
        {clan?.banner ? <img src={clan.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" /> :
          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center py-12 px-4 text-center">
          {clan?.logo ? <img src={clan.logo} alt="" className="w-24 h-24 rounded-xl animate-float drop-shadow-[0_0_40px_hsl(0,100%,50%,0.6)] mb-3 object-cover" /> :
            <img src={nexusLogo} alt="Nexel" className="w-24 h-24 animate-float drop-shadow-[0_0_40px_hsl(0,100%,50%,0.6)] mb-3" />}
          <h1 className="text-3xl md:text-5xl font-heading text-primary text-glow tracking-widest">{clan?.name || 'NEXEL'}</h1>
          <p className="text-xs md:text-sm font-display text-foreground/80 tracking-[0.25em] mt-1">FPS COMPETITIVE PLATFORM</p>
          <p className="mt-3 text-sm font-display text-muted-foreground">Bem-vindo, <span className="text-primary">{profile?.username}</span></p>
          <div className="mt-3 inline-flex items-center gap-2 bg-card/80 border border-gold/40 rounded-full px-4 py-1.5">
            <Coins size={14} className="text-gold" />
            <span className="font-heading text-sm text-gold">{profile?.gold || 0}G</span>
          </div>
        </div>
      </div>

      {/* 2. CARDS RESUMO */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/ranking" className="bg-card rounded-lg neon-border p-4 hover:border-primary/60 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <Trophy size={16} className="text-primary" />
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] font-heading text-muted-foreground tracking-wider">RANKING DO CLÃ</p>
          <p className="font-heading text-base text-foreground mt-1 truncate">{clan?.name || '—'}</p>
          <p className="text-xs font-display text-primary mt-0.5">{clanRank}</p>
        </Link>

        <Link to="/matchcw" className="bg-card rounded-lg neon-border p-4 hover:border-primary/60 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <Swords size={16} className="text-primary" />
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] font-heading text-muted-foreground tracking-wider">PRÓX. MATCHCW</p>
          {nextMatchCW ? (
            <>
              <p className="font-heading text-base text-foreground mt-1">{nextMatchCW.scheduled_date || nextMatchCW.proposed_date || 'A definir'}</p>
              <p className="text-xs font-display text-primary mt-0.5">{(nextMatchCW.status || '').toUpperCase()}</p>
            </>
          ) : (
            <>
              <p className="font-heading text-base text-foreground mt-1">Nenhum</p>
              <p className="text-xs font-display text-muted-foreground mt-0.5">Crie um agora</p>
            </>
          )}
        </Link>

        <Link to="/training" className="bg-card rounded-lg neon-border p-4 hover:border-primary/60 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <Target size={16} className="text-primary" />
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] font-heading text-muted-foreground tracking-wider">PRÓX. TREINO</p>
          {nextTraining ? (
            <>
              <p className="font-heading text-base text-foreground mt-1 truncate">{nextTraining.title || 'Treino'}</p>
              <p className="text-xs font-display text-primary mt-0.5">{nextTraining.training_date} {nextTraining.training_time || ''}</p>
            </>
          ) : (
            <>
              <p className="font-heading text-base text-foreground mt-1">Sem treinos</p>
              <p className="text-xs font-display text-muted-foreground mt-0.5">Agendar</p>
            </>
          )}
        </Link>

        <Link to="/shop" className="bg-card rounded-lg border border-gold/40 p-4 hover:border-gold transition-all group">
          <div className="flex items-center justify-between mb-2">
            <Coins size={16} className="text-gold" />
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-gold transition-colors" />
          </div>
          <p className="text-[10px] font-heading text-muted-foreground tracking-wider">SALDO / GIROS</p>
          <p className="font-heading text-base text-gold mt-1">{profile?.gold || 0}G</p>
          <p className="text-xs font-display text-muted-foreground mt-0.5">{profile?.free_spins || 0} giros grátis</p>
        </Link>
      </div>

      {/* 3. CTA PRINCIPAL */}
      <Link to="/matchcw"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-lg gradient-primary text-primary-foreground font-heading text-sm tracking-widest hover:opacity-90 transition-all neon-border-strong">
        <Plus size={18} />
        CRIAR MATCHCW
      </Link>

      {/* 4. ATIVIDADE RECENTE */}
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-xs text-primary mb-4 flex items-center gap-2 tracking-wider">
          <Activity size={14} /> ATIVIDADE RECENTE
        </h3>
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-sm font-display text-center py-4">Sem atividades recentes</p>
        ) : (
          <div className="space-y-3">
            {activity.slice(0, 5).map((it, i) => (
              <div key={i} className="flex items-center gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <it.icon size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm text-foreground truncate">{it.text}</p>
                  <p className="text-[11px] text-muted-foreground font-display truncate">{it.sub}</p>
                </div>
                {it.when && <span className="text-[10px] text-muted-foreground font-display shrink-0">{it.when}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. SOBRE O NEXEL */}
      <Link to="/about" className="block bg-card rounded-lg border border-primary/30 p-5 hover:border-primary/60 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Info size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-sm text-primary mb-1">O que é o Nexel?</h3>
            <p className="text-xs font-display text-muted-foreground leading-relaxed">
              Plataforma competitiva para jogadores de FPS gerenciar clãs, lines/times, treinos, campeonatos e muito mais em um só lugar.
            </p>
            <p className="text-[11px] font-heading text-primary mt-2">Saber mais →</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
