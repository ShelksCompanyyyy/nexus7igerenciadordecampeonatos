import { SHOP_ITEMS } from '@/lib/shopData';
import { useState } from 'react';

// Visual map para emblemas (antigamente "badges"). Mantém compat. com IDs legados.
const EMBLEM_VISUAL: Record<string, { emoji: string; tint: string; label: string; description: string }> = {
  badge_vip:     { emoji: '👑', tint: '#FFD700', label: 'VIP',       description: 'Status VIP — destaque exclusivo no perfil.' },
  badge_legend:  { emoji: '🌟', tint: '#FFA500', label: 'LENDÁRIO',  description: 'Reservado para jogadores lendários da plataforma.' },
  badge_pro:     { emoji: '🎯', tint: '#00BFFF', label: 'PRO',       description: 'Marca de jogador profissional e veterano.' },
  badge_mvp:     { emoji: '🏆', tint: '#FF4500', label: 'MVP',       description: 'Mais Valioso da partida — performance excepcional.' },
  badge_killer:  { emoji: '💀', tint: '#888888', label: 'KILLER',    description: 'Para os caçadores implacáveis em CWs.' },
  badge_clutch:  { emoji: '🔱', tint: '#BF00FF', label: 'CLUTCH',    description: 'Para quem fecha clutches em situações críticas.' },
  badge_fire:    { emoji: '🔥', tint: '#FF6600', label: 'ON FIRE',   description: 'Sequência impressionante de vitórias.' },
  badge_diamond: { emoji: '💎', tint: '#B9F2FF', label: 'DIAMANTE',  description: 'Status raro de elite — top da plataforma.' },
  badge_founder: { emoji: '🛡️', tint: '#FFD700', label: 'FUNDADOR', description: 'Concedido aos fundadores de clãs lendários.' },
  superadmin:    { emoji: '⚡', tint: '#FF0040', label: 'CRIADOR',   description: 'Criador da plataforma Nexel.' },
  founder:       { emoji: '🛡️', tint: '#FFD700', label: 'FUNDADOR', description: 'Membro fundador da plataforma.' },
};

export function getEmblemVisual(id: string) {
  if (EMBLEM_VISUAL[id]) return EMBLEM_VISUAL[id];
  const item = SHOP_ITEMS.find(i => i.id === id && i.category === 'badge');
  return {
    emoji: '🏅',
    tint: '#FFD700',
    label: (item?.name || id).replace(/badge_/i, '').toUpperCase(),
    description: item?.description || 'Emblema personalizado.',
  };
}

interface EmblemBadgesProps {
  ids: string[] | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  max?: number;
  className?: string;
  clickable?: boolean;
}

export function EmblemBadges({ ids, size = 'sm', max, className = '', clickable = false }: EmblemBadgesProps) {
  const [open, setOpen] = useState<string | null>(null);
  if (!ids || ids.length === 0) return null;
  const list = max ? ids.slice(0, max) : ids;
  const overflow = max && ids.length > max ? ids.length - max : 0;

  const sz = size === 'xs'
    ? { box: 'h-4 px-1 text-[8px]', emoji: 'text-[10px]' }
    : size === 'md'
    ? { box: 'h-6 px-2 text-[10px]', emoji: 'text-sm' }
    : { box: 'h-5 px-1.5 text-[9px]', emoji: 'text-xs' };

  return (
    <span className={`inline-flex items-center gap-1 flex-wrap ${className}`}>
      {list.map(id => {
        const v = getEmblemVisual(id);
        return (
          <button
            key={id}
            type="button"
            onClick={(e) => { if (clickable) { e.stopPropagation(); setOpen(id); } }}
            title={v.label}
            className={`inline-flex items-center gap-1 rounded font-heading ${sz.box} ${clickable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
            style={{
              background: `linear-gradient(135deg, ${v.tint}33, ${v.tint}11)`,
              border: `1px solid ${v.tint}66`,
              color: v.tint,
              boxShadow: `0 0 6px ${v.tint}40`,
            }}
          >
            <span className={sz.emoji}>{v.emoji}</span>
            <span className="tracking-wider">{v.label}</span>
          </button>
        );
      })}
      {overflow > 0 && (
        <span className={`inline-flex items-center rounded font-heading text-muted-foreground bg-muted/40 border border-border ${sz.box}`}>
          +{overflow}
        </span>
      )}
      {open && clickable && (() => {
        const v = getEmblemVisual(open);
        return (
          <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
               onClick={() => setOpen(null)}>
            <div className="bg-card border-2 rounded-2xl p-5 max-w-xs text-center space-y-3"
                 style={{ borderColor: v.tint, boxShadow: `0 0 22px ${v.tint}88` }}
                 onClick={(e) => e.stopPropagation()}>
              <div className="text-5xl">{v.emoji}</div>
              <p className="font-heading text-lg" style={{ color: v.tint }}>{v.label}</p>
              <p className="text-xs text-muted-foreground font-display">{v.description}</p>
              <button onClick={() => setOpen(null)} className="w-full py-2 rounded bg-secondary text-foreground font-heading text-sm">Fechar</button>
            </div>
          </div>
        );
      })()}
    </span>
  );
}

export default EmblemBadges;