import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getFrameStyle, getNickColor } from '@/lib/shopData';
import { EmblemBadges } from '@/components/Emblems';
import { UserCircle, Copy, Trophy, Target, Zap, Shield, Award, Camera, Edit, Check, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import PromoCodeRedeem from '@/components/PromoCodeRedeem';
import { RARITY_STYLES, type LuckyRarity } from './lucky/LuckyNexelData';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editGameNick, setEditGameNick] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [trophies, setTrophies] = useState<any[]>([]);
  const [equippedLucky, setEquippedLucky] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('xtreino_winners')
        .select('id, notes, awarded_at, trophy:xtreino_trophies(name, icon, color, kind, description)')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false });
      setTrophies((data as any) || []);
      const eqId = (profile as any)?.equipped_lucky_id;
      if (eqId) {
        const { data: lk } = await supabase.from('lucky_inventory').select('*').eq('id', eqId).maybeSingle();
        setEquippedLucky(lk);
      } else {
        setEquippedLucky(null);
      }
    })();
  }, [user, (profile as any)?.equipped_lucky_id]);

  if (!user || !profile) return null;

  const kd = (profile.deaths || 0) > 0 ? ((profile.kills || 0) / (profile.deaths || 1)).toFixed(2) : (profile.kills || 0).toFixed(2);
  const frameStyle = profile.frame_id ? getFrameStyle(profile.frame_id) : null;
  const nickColor = profile.nick_color_id ? getNickColor(profile.nick_color_id) : null;

  const copyId = () => {
    navigator.clipboard.writeText(profile.unique_id || user.id);
    toast.success('ID copiado!');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 2MB)');
      return;
    }

    const filePath = `${user.id}/avatar.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error('Erro ao enviar imagem'); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await supabase.from('profiles').update({ avatar: publicUrl }).eq('user_id', user.id);
    await refreshProfile();
    toast.success('Foto de perfil atualizada!');
  };

  const startEditing = () => {
    setEditUsername(profile.username);
    setEditGameNick(profile.game_nick);
    setEditWhatsapp(profile.whatsapp || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!editUsername.trim() || !editGameNick.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    await supabase.from('profiles').update({
      username: editUsername,
      game_nick: editGameNick,
      whatsapp: editWhatsapp,
    }).eq('user_id', user.id);
    await refreshProfile();
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
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-3xl"
            style={frameStyle ? { border: frameStyle.border, boxShadow: frameStyle.boxShadow } : undefined}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.game_nick?.[0]?.toUpperCase() || profile.username[0]?.toUpperCase()
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors shadow-lg">
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

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
              <h1 className={`text-2xl font-heading ${!nickColor && profile.colored_nick ? 'text-primary text-glow' : 'text-foreground'}`}
                style={nickColor ? nickStyle : undefined}>
                {profile.game_nick || profile.username}
              </h1>
              <button onClick={startEditing} className="text-muted-foreground hover:text-primary transition-colors"><Edit size={16} /></button>
            </div>
            <p className="text-muted-foreground font-display text-sm">@{profile.username}</p>
          </>
        )}

        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-display">ID: #{profile.unique_id}</span>
          <button onClick={copyId} className="text-primary hover:text-neon-glow"><Copy size={12} /></button>
        </div>
        {profile.badges && profile.badges.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-heading text-muted-foreground tracking-widest mb-1.5">🏅 EMBLEMAS</p>
            <div className="flex items-center justify-center">
              <EmblemBadges ids={profile.badges} size="md" clickable />
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-4 mt-4 text-sm font-display">
          <span className="text-gold">{profile.gold || 0}G</span>
          <span className="text-primary">{profile.free_spins || 0} Giros</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Kills', value: profile.kills || 0, icon: Target },
          { label: 'Mortes', value: profile.deaths || 0, icon: Zap },
          { label: 'Assistências', value: profile.assists || 0, icon: Shield },
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
        <h3 className="font-heading text-sm text-primary mb-3">MVPs: {profile.mvps || 0}</h3>
        <p className="text-xs text-muted-foreground font-display">Partidas: {profile.matches_played || 0}</p>
      </div>

      <PromoCodeRedeem />

      {equippedLucky && (() => {
        const r = RARITY_STYLES[(equippedLucky.rarity || 'common') as LuckyRarity];
        return (
          <div className={`rounded-xl border-2 ${r.border} ${r.bg} ${r.glow} p-4 flex items-center gap-3`}>
            <Star className="text-amber-300" size={20} />
            <div className="flex-1">
              <p className="text-[10px] uppercase font-display text-muted-foreground tracking-widest">Recompensa em destaque</p>
              <p className={`font-heading text-base ${r.text}`}>{equippedLucky.item_label}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-display">{equippedLucky.rarity}</p>
            </div>
          </div>
        );
      })()}

      {trophies.length > 0 && (
        <div className="bg-card rounded-lg border border-gold/40 p-5" style={{ boxShadow: '0 0 16px hsl(45 100% 50% / 0.15)' }}>
          <h3 className="font-heading text-sm text-gold flex items-center gap-2 mb-3">
            <Trophy size={16} /> TROFÉUS XTREINO ({trophies.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {trophies.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  const desc = w.trophy?.description ? `\n\n${w.trophy.description}` : '';
                  const note = w.notes ? `\n\nObs: "${w.notes}"` : '';
                  alert(`${w.trophy?.icon || '🏆'} ${w.trophy?.name || 'Troféu'}${desc}${note}`);
                }}
                className="border-2 rounded-lg p-2 text-center hover:scale-105 transition-transform cursor-pointer"
                style={{ borderColor: (w.trophy?.color || '#FFD700') + '80', boxShadow: `0 0 10px ${w.trophy?.color || '#FFD700'}40` }}>
                <div className="text-2xl">{w.trophy?.icon || '🏆'}</div>
                <p className="font-heading text-[10px] mt-1" style={{ color: w.trophy?.color || '#FFD700' }}>{w.trophy?.name}</p>
                {w.notes && <p className="text-[9px] text-muted-foreground italic mt-1">"{w.notes}"</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
