import React, { createContext, useContext, useEffect, useState } from 'react';

export type Locale = 'pt-BR' | 'en' | 'es';

const STORAGE_KEY = 'nexel.locale';

const dict: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    'app.tagline': 'FPS Competitive Platform',
    'app.about_title': 'O que é o Nexel?',
    'app.about_text': 'Plataforma competitiva para jogadores de FPS gerenciar clãs, lines/times, treinos, campeonatos e muito mais em um só lugar.',
    'app.manage_clan': 'Gerencie seu clã do seu jeito',
    'settings.title': 'Configurações',
    'settings.profile': 'Perfil',
    'settings.wallet': 'Carteira (NexelGolds)',
    'settings.notifications': 'Notificações',
    'settings.theme': 'Tema',
    'settings.theme.dark': 'Escuro',
    'settings.theme.light': 'Claro',
    'settings.theme.neon': 'Neon',
    'settings.theme.midnight': 'Midnight',
    'settings.theme.gold': 'Gold',
    'settings.theme.matrix': 'Matrix',
    'settings.security': 'Segurança',
    'settings.support': 'Suporte',
    'settings.logout': 'Sair da conta',
    'settings.language': 'Idioma',
    'support.title': 'Suporte',
    'support.new': 'Novo chamado',
    'support.subject': 'Assunto',
    'support.message': 'Mensagem',
    'support.send': 'Enviar',
    'support.empty': 'Nenhum chamado aberto',
    'support.you': 'Você',
    'support.staff': 'Equipe Nexel',
    'support.status.open': 'Aberto',
    'support.status.in_progress': 'Em andamento',
    'support.status.closed': 'Fechado',
    'support.close': 'Fechar chamado',
    'support.reopen': 'Reabrir',
  },
  en: {
    'app.tagline': 'FPS Competitive Platform',
    'app.about_title': 'What is Nexel?',
    'app.about_text': 'A competitive platform for FPS players to manage clans, lines/teams, trainings, championships and more — all in one place.',
    'app.manage_clan': 'Manage your clan your way',
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.wallet': 'Wallet (NexelGolds)',
    'settings.notifications': 'Notifications',
    'settings.theme': 'Theme',
    'settings.theme.dark': 'Dark',
    'settings.theme.light': 'Light',
    'settings.theme.neon': 'Neon',
    'settings.theme.midnight': 'Midnight',
    'settings.theme.gold': 'Gold',
    'settings.theme.matrix': 'Matrix',
    'settings.security': 'Security',
    'settings.support': 'Support',
    'settings.logout': 'Log out',
    'settings.language': 'Language',
    'support.title': 'Support',
    'support.new': 'New ticket',
    'support.subject': 'Subject',
    'support.message': 'Message',
    'support.send': 'Send',
    'support.empty': 'No tickets yet',
    'support.you': 'You',
    'support.staff': 'Nexel Team',
    'support.status.open': 'Open',
    'support.status.in_progress': 'In progress',
    'support.status.closed': 'Closed',
    'support.close': 'Close ticket',
    'support.reopen': 'Reopen',
  },
  es: {
    'app.tagline': 'Plataforma Competitiva FPS',
    'app.about_title': '¿Qué es Nexel?',
    'app.about_text': 'Plataforma competitiva para jugadores de FPS para gestionar clanes, lines/equipos, entrenamientos, campeonatos y mucho más en un solo lugar.',
    'app.manage_clan': 'Administra tu clan a tu manera',
    'settings.title': 'Configuración',
    'settings.profile': 'Perfil',
    'settings.wallet': 'Cartera (NexelGolds)',
    'settings.notifications': 'Notificaciones',
    'settings.theme': 'Tema',
    'settings.theme.dark': 'Oscuro',
    'settings.theme.light': 'Claro',
    'settings.theme.neon': 'Neón',
    'settings.theme.midnight': 'Midnight',
    'settings.theme.gold': 'Gold',
    'settings.theme.matrix': 'Matrix',
    'settings.security': 'Seguridad',
    'settings.support': 'Soporte',
    'settings.logout': 'Cerrar sesión',
    'settings.language': 'Idioma',
    'support.title': 'Soporte',
    'support.new': 'Nuevo ticket',
    'support.subject': 'Asunto',
    'support.message': 'Mensaje',
    'support.send': 'Enviar',
    'support.empty': 'Sin tickets',
    'support.you': 'Tú',
    'support.staff': 'Equipo Nexel',
    'support.status.open': 'Abierto',
    'support.status.in_progress': 'En curso',
    'support.status.closed': 'Cerrado',
    'support.close': 'Cerrar ticket',
    'support.reopen': 'Reabrir',
  },
};

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'pt-BR';
    return (localStorage.getItem(STORAGE_KEY) as Locale) || 'pt-BR';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* noop */ }
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => dict[locale]?.[key] ?? dict['pt-BR'][key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale: setLocaleState, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}