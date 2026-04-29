import { SHOP_ITEMS } from '@/lib/shopData';

// Visual map para emblemas (antigamente "badges"). Mantém compat. com IDs legados.
const EMBLEM_VISUAL: Record<string, { emoji: string; tint: string; label: string }> = {
  badge_vip:     { emoji: '👑', tint: '#FFD700', label: 'VIP' },
  badge_legend:  { emoji: '🌟', tint: '#FFA500', label: 'LENDÁRIO' },
  badge_pro:     { emoji: '🎯', tint: '#00BFFF', label: 'PRO' },
  badge_mvp:     { emoji: '🏆', tint: '#FF4500', label: 'MVP' },
  badge_killer:  { emoji: '💀', tint: '#888888', label: 'KILLER' },
  badge_clutch:  { emoji: '🔱', tint: '#BF00FF', label: 'CLUTCH' },
  badge_fire:    { emoji: '🔥', tint: '#FF6600', label: 'ON FIRE' },
  badge_diamond: { emoji: '💎', tint: '#B9F2FF', label: 'DIAMANTE' },
  badge_founder: { emoji: '🛡️', tint: '#FFD700', label: 'FUNDADOR' },
  superadmin:    { emoji: '⚡', tint: '#FF0040', label: 'CRIADOR' },
  founder:       { emoji: '🛡️', tint: '#FFD700', label: 'FUNDADOR' },
};

export function getEmblemVisual(id: string) {
  if (EMBLEM_VISUAL[id]) return EMBLEM_VISUAL[id];
  // Fallback: tenta achar na loja
  const item = SHOP_ITEMS.find(i => i.id === id && i.category === 'badge');
  return { emoji: '🏅', tint: '#FFD700', label: (item?.name || id).replace(/badge_/i, '').toUpperCase() };
}

interface EmblemBadgesProps {
  ids: string[] | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  max?: number;
  className?: string;
}

export function EmblemBadges({ ids, size = 'sm', max, className = '' }: EmblemBadgesProps) {
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
          <span
            key={id}
            title={v.label}
            className={`inline-flex items-center gap-1 rounded font-heading ${sz.box}`}
            style={{
              background: `linear-gradient(135deg, ${v.tint}33, ${v.tint}11)`,
              border: `1px solid ${v.tint}66`,
              color: v.tint,
              boxShadow: `0 0 6px ${v.tint}40`,
            }}
          >
            <span className={sz.emoji}>{v.emoji}</span>
            <span className="tracking-wider">{v.label}</span>
          </span>
        );
      })}
      {overflow > 0 && (
        <span className={`inline-flex items-center rounded font-heading text-muted-foreground bg-muted/40 border border-border ${sz.box}`}>
          +{overflow}
        </span>
      )}
    </span>
  );
}

export default EmblemBadges;