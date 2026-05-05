import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getFrameStyle, getNickColor } from '@/lib/shopData';
import { EmblemBadges } from '@/components/Emblems';
import { UserCircle, Trophy, Target, Zap, Shield, Award, Star, ArrowLeft, Users } from 'lucide-react';
import { RARITY_STYLES, type LuckyRarity } from './lucky/LuckyNexelData';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [equippedLucky, setEquippedLucky] = useState<any>(null);
  const [clan, setClan] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      // Try by unique_id first, fallback to user_id
      let { data: p } = await supabase.from('profiles').select('*').eq('unique_id', id).maybeSingle();
      if (!p) {
        const r = await supabase.from('profiles').select('*').eq('user_id', id).maybeSingle();
        p = r.data;
      }
      if (!p) { setLoading(false); return; }
      setProfile(p);

      const [tr, lk, cl, tm] = await Promise.all([
        supabase.from('xtreino_winners').select('id, notes, awarded_at, trophy:xtreino_trophies(name, icon, color, kind, description)').eq('user_id', p.user_id).order('awarded_at', { ascending: false }),
        (p as any).equipped_lucky_id ? supabase.from('lucky_inventory').select('*').eq('id', (p as any).equipped_lucky_id).maybeSingle() : Promise.resolve({ data: null }),
        p.clan_id ? supabase.from('clans').select('id,name,logo').eq('id', p.clan_id).maybeSingle() : Promise.resolve({ data: null }),
        p.team_id ? supabase.from('teams').select('id,name,logo').eq('id', p.team_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setTrophies((tr.data as any) || []);
      setEquippedLucky((lk as any).data);
      setClan((cl as any).data);
      setTeam((tm as any).data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-center py-10 text-muted-foreground font-display">Carregando...</div>;
  if (!profile) return <div className="text-center py-10 text-muted-foreground font-display">Jogador não encontrado.</div>;

  const kd = (profile.deaths || 0) > 0 ? ((profile.kills || 0) / (profile.deaths || 1)).toFixed(2) : (profile.kills || 0).toFixed(2);
  const frameStyle = profile.frame_id ? getFrameStyle(profile.frame_id) : null;
  const nickColor = profile.nick_color_id ? getNickColor(profile.nick_color_id) : null;
  const nickStyle: React.CSSProperties = {};
  if (nickColor) {
    if (nickColor.startsWith('linear')) {
      nickStyle.backgroundImage = nickColor;
      (nickStyle as any).WebkitBackgroundClip = 'text';
      (nickStyle as any).WebkitTextFillColor = 'transparent';
    } else {
      nickStyle.color = nickColor;
      nickStyle.textShadow = `0 0 12px ${nickColor}`;
    }
  }

  const luckyRarity = (equippedLucky?.rarity || 'common') as LuckyRarity;
  const luckyR = RARITY_STYLES[luckyRarity];

  return (
    <div className="space-y-5 animate-slide-up max-w-2xl mx-auto pb-10">
      <Link to="/ranking" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-display">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-fuchsia-950/30 p-5 text-center">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.5), transparent 50%), radial-gradient(circle at 80% 80%, rgba(217,70,239,0.3), transparent 45%)' }} />
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-3xl mb-3"
            style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : undefined}>
            {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (profile.game_nick?.[0]?.toUpperCase() || 'U')}
          </div>
          <h1 className="text-2xl font-heading text-foreground" style={nickStyle}>{profile.game_nick || profile.username}</h1>
          <p className="text-xs text-muted-foreground font-display">@{profile.username} · #{profile.unique_id}</p>

          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap text-xs font-display">
            {clan && <span className="px-2 py-1 rounded bg-primary/20 text-primary border border-primary/40 flex items-center gap-1"><Users size={11} />{clan.name}</span>}
            {team && <span className="px-2 py-1 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40">Line: {team.name}</span>}
          </div>

          {profile.badges?.length > 0 && (
            <div className="mt-3"><EmblemBadges ids={profile.badges} size="md" /></div>
          )}
        </div>
      </div>

      {/* EQUIPPED LUCKY */}
      {equippedLucky && (
        <div className={`rounded-xl border-2 ${luckyR.border} ${luckyR.bg} ${luckyR.glow} p-4 flex items-center gap-3`}>
          <Star className="text-amber-300" size={20} />
          <div className="flex-1">
            <p className="text-[10px] uppercase font-display text-muted-foreground tracking-widest">Recompensa em destaque</p>
            <p className={`font-heading text-base ${luckyR.text}`}>{equippedLucky.item_label}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-display">{equippedLucky.rarity}</p>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Kills', value: profile.kills || 0, icon: Target },
          { label: 'Mortes', value: profile.deaths || 0, icon: Zap },
          { label: 'Assistências', value: profile.assists || 0, icon: Shield },
          { label: 'K/D', value: kd, icon: Award },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg neon-border p-4 text-center">
            <s.icon size={20} className="text-primary mx-auto mb-2" />
            <p className="font-heading text-lg text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground font-display">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-lg neon-border p-4 text-center">
          <Trophy size={18} className="text-gold mx-auto mb-1" />
          <p className="font-heading text-lg text-gold">{profile.mvps || 0}</p>
          <p className="text-xs text-muted-foreground font-display">MVPs</p>
        </div>
        <div className="bg-card rounded-lg neon-border p-4 text-center">
          <UserCircle size={18} className="text-primary mx-auto mb-1" />
          <p className="font-heading text-lg text-foreground">{profile.matches_played || 0}</p>
          <p className="text-xs text-muted-foreground font-display">Partidas</p>
        </div>
      </div>

      {/* TROPHIES */}
      {trophies.length > 0 && (
        <div className="bg-card rounded-lg border border-gold/40 p-5" style={{ boxShadow: '0 0 16px hsl(45 100% 50% / 0.15)' }}>
          <h3 className="font-heading text-sm text-gold flex items-center gap-2 mb-3">
            <Trophy size={16} /> TROFÉUS XTREINO ({trophies.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {trophies.map((w) => (
              <div key={w.id} className="border-2 rounded-lg p-2 text-center"
                style={{ borderColor: (w.trophy?.color || '#FFD700') + '80', boxShadow: `0 0 10px ${w.trophy?.color || '#FFD700'}40` }}>
                <div className="text-2xl">{w.trophy?.icon || '🏆'}</div>
                <p className="font-heading text-[10px] mt-1" style={{ color: w.trophy?.color || '#FFD700' }}>{w.trophy?.name}</p>
                {w.notes && <p className="text-[9px] text-muted-foreground italic mt-1">"{w.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}