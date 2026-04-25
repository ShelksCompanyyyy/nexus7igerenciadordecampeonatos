import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useI18n, type Locale } from '@/contexts/I18nContext';
import {
  UserCircle, Wallet, Bell, Palette, Lock, MessageCircle, LogOut, Globe, ChevronRight, Sun, Moon, Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();

  const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'dark', label: t('settings.theme.dark'), icon: Moon },
    { id: 'light', label: t('settings.theme.light'), icon: Sun },
    { id: 'neon', label: t('settings.theme.neon'), icon: Sparkles },
  ];

  const localeOptions: { id: Locale; label: string }[] = [
    { id: 'pt-BR', label: 'PT-BR' },
    { id: 'en', label: 'EN' },
    { id: 'es', label: 'ES' },
  ];

  const items: { icon: typeof UserCircle; label: string; onClick: () => void }[] = [
    { icon: UserCircle, label: '👤 ' + t('settings.profile'), onClick: () => navigate('/profile') },
    { icon: Wallet, label: '💰 ' + t('settings.wallet'), onClick: () => navigate('/roulette') },
    { icon: Bell, label: '🔔 ' + t('settings.notifications'), onClick: () => navigate('/notifications') },
    { icon: Lock, label: '🔒 ' + t('settings.security'), onClick: () => navigate('/profile?tab=security') },
    { icon: MessageCircle, label: '📞 ' + t('settings.support'), onClick: () => navigate('/support') },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">⚙️ {t('settings.title')}</h1>

      {/* Quick links */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border/50 overflow-hidden">
        {items.map(it => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
          >
            <it.icon size={18} className="text-primary" />
            <span className="flex-1 font-display text-sm text-foreground">{it.label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Theme */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-primary" />
          <p className="font-heading text-sm text-foreground">🎨 {t('settings.theme')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(opt => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <opt.icon size={18} />
                <span className="text-xs font-display">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary" />
          <p className="font-heading text-sm text-foreground">💬 {t('settings.language')}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {localeOptions.map(opt => {
            const active = locale === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setLocale(opt.id)}
                className={`py-3 rounded-lg border font-heading text-sm transition-all ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={async () => { await logout(); }}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-destructive/10 border border-destructive/40 text-destructive font-heading text-sm rounded-xl hover:bg-destructive/15 transition-colors"
      >
        <LogOut size={16} /> 🚪 {t('settings.logout')}
      </button>

      {profile && (
        <p className="text-center text-[10px] text-muted-foreground font-display">
          ID: {profile.unique_id || '—'} · Nexel · FPS Competitive Platform
        </p>
      )}
    </div>
  );
}