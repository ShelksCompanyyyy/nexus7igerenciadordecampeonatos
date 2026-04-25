import { useI18n } from '@/contexts/I18nContext';
import { Sparkles, Shield, Trophy, Target } from 'lucide-react';

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="text-center">
        <h1 className="text-3xl font-heading text-primary text-glow tracking-wider">NEXEL</h1>
        <p className="text-muted-foreground font-display text-sm mt-1">{t('app.tagline')}</p>
      </div>

      <div className="bg-card border border-primary/30 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={20} />
          <h2 className="font-heading text-lg text-primary">{t('app.about_title')}</h2>
        </div>
        <p className="text-foreground font-display text-sm leading-relaxed">{t('app.about_text')}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { icon: Shield, title: 'Clãs & Lines', desc: 'Crie e gerencie clãs, lines, líderes e vice-líderes.' },
          { icon: Trophy, title: 'MatchCW', desc: 'Desafie outros clãs em CWs normais ou apostados.' },
          { icon: Target, title: 'XTreinos', desc: 'Organize treinos, registre estatísticas e evolua.' },
        ].map(f => (
          <div key={f.title} className="bg-card border border-border rounded-lg p-4">
            <f.icon className="text-primary mb-2" size={22} />
            <p className="font-heading text-sm text-foreground">{f.title}</p>
            <p className="text-xs text-muted-foreground font-display mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}