import { getTrainings, getTeams } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Calendar, Clock } from 'lucide-react';

export default function TrainingPage() {
  const { user } = useAuth();
  const clanId = user?.clanId || '';
  const trainings = getTrainings().filter(t => t.clanId === clanId);
  const teams = getTeams().filter(t => t.clanId === clanId);
  const scheduled = trainings.filter(t => t.status === 'scheduled');
  const completed = trainings.filter(t => t.status === 'completed');

  const TeamName = ({ id }: { id: string }) => {
    const t = teams.find(t => t.id === id);
    return <span className="font-display text-foreground">{t?.name || '???'}</span>;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><Target size={28} /> XTREINO</h1>
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Calendar size={16} /> AGENDADOS</h3>
        <div className="space-y-3">
          {scheduled.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <TeamName id={t.teamAId} />
              <div className="flex flex-col items-center">
                <span className="text-primary font-heading text-sm">VS</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
                  <Calendar size={12} /> {t.date} <Clock size={12} /> {t.time}
                </div>
              </div>
              <TeamName id={t.teamBId} />
            </div>
          ))}
          {scheduled.length === 0 && <p className="text-center text-muted-foreground text-sm font-display p-4">Nenhum treino agendado</p>}
        </div>
      </div>
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4">RESULTADOS DE TREINOS</h3>
        <div className="space-y-3">
          {completed.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TeamName id={t.teamAId} />
                <span className={`font-heading text-lg ${t.scoreA > t.scoreB ? 'text-success' : 'text-destructive'}`}>{t.scoreA}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t.date}</span>
              <div className="flex items-center gap-3">
                <span className={`font-heading text-lg ${t.scoreB > t.scoreA ? 'text-success' : 'text-destructive'}`}>{t.scoreB}</span>
                <TeamName id={t.teamBId} />
              </div>
            </div>
          ))}
          {completed.length === 0 && <p className="text-center text-muted-foreground text-sm font-display p-4">Nenhum resultado</p>}
        </div>
      </div>
    </div>
  );
}
