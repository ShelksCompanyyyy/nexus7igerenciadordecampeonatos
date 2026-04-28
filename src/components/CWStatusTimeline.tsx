import { Check, Clock, X } from 'lucide-react';

type Status = 'pending' | 'accepted' | 'declined' | 'confirmed' | 'finalized';

const STEPS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Pendente' },
  { key: 'accepted', label: 'Aceito' },
  { key: 'confirmed', label: 'Marcado' },
  { key: 'finalized', label: 'Finalizado' },
];

export default function CWStatusTimeline({ status }: { status: Status }) {
  if (status === 'declined') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30">
        <X size={14} className="text-destructive" />
        <span className="text-[11px] font-heading text-destructive">RECUSADO</span>
      </div>
    );
  }
  const currentIndex = STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                done ? 'bg-success/20 border-success text-success' :
                current ? 'bg-primary/20 border-primary text-primary animate-pulse' :
                'bg-muted/30 border-border text-muted-foreground'
              }`}>
                {done ? <Check size={12} strokeWidth={3} /> :
                  current ? <Clock size={11} /> :
                  <span className="text-[9px] font-heading">{i + 1}</span>}
              </div>
              <span className={`text-[9px] font-heading uppercase tracking-wider truncate ${
                done ? 'text-success' : current ? 'text-primary' : 'text-muted-foreground'
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${i < currentIndex ? 'bg-success/60' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
