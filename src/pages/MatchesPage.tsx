import { getMatches, getTeams } from '@/lib/store';
import { Swords, Clock, CheckCircle } from 'lucide-react';

export default function MatchesPage() {
  const matches = getMatches();
  const teams = getTeams();
  const upcoming = matches.filter(m => m.status === 'upcoming');
  const completed = matches.filter(m => m.status === 'completed');

  const TeamName = ({ id }: { id: string }) => {
    const t = teams.find(t => t.id === id);
    return <span className="font-display text-foreground">{t?.name || '???'}</span>;
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow">PARTIDAS</h1>

      {/* Upcoming */}
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><Clock size={16} /> PRÓXIMAS</h3>
        <div className="space-y-3">
          {upcoming.map(m => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <TeamName id={m.teamAId} />
              <div className="flex flex-col items-center">
                <span className="text-primary font-heading text-sm">VS</span>
                <span className="text-xs text-muted-foreground font-display">{m.date} • {m.time}</span>
              </div>
              <TeamName id={m.teamBId} />
            </div>
          ))}
          {upcoming.length === 0 && <p className="text-center text-muted-foreground text-sm font-display">Nenhuma partida agendada</p>}
        </div>
      </div>

      {/* Completed */}
      <div className="bg-card rounded-lg neon-border p-5">
        <h3 className="font-heading text-sm text-primary mb-4 flex items-center gap-2"><CheckCircle size={16} /> RESULTADOS</h3>
        <div className="space-y-3">
          {completed.map(m => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TeamName id={m.teamAId} />
                <span className={`font-heading text-lg ${m.scoreA > m.scoreB ? 'text-success' : 'text-destructive'}`}>{m.scoreA}</span>
              </div>
              <span className="text-muted-foreground font-display text-xs">{m.date}</span>
              <div className="flex items-center gap-3">
                <span className={`font-heading text-lg ${m.scoreB > m.scoreA ? 'text-success' : 'text-destructive'}`}>{m.scoreB}</span>
                <TeamName id={m.teamBId} />
              </div>
            </div>
          ))}
          {completed.length === 0 && <p className="text-center text-muted-foreground text-sm font-display">Nenhum resultado</p>}
        </div>
      </div>
    </div>
  );
}
