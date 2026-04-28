import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Coins, User as UserIcon } from 'lucide-react';

interface BetRow {
  id: string;
  user_id: string;
  clan_id: string;
  amount: number;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  isBetMatch: boolean;
  betAmount: number;
  clanALabel: string;
  clanBLabel: string;
  clanAId: string;
  clanBId: string | null;
  onConfirm: () => Promise<void> | void;
}

export default function CancelCWDialog({
  open, onOpenChange, matchId, isBetMatch, betAmount,
  clanALabel, clanBLabel, clanAId, clanBId, onConfirm,
}: Props) {
  const [bets, setBets] = useState<BetRow[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !isBetMatch) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('matchcw_bets')
        .select('id, user_id, clan_id, amount, status')
        .eq('matchcw_id', matchId);
      if (cancelled) return;
      const list = (data || []) as BetRow[];
      setBets(list);
      const ids = Array.from(new Set(list.map(b => b.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, username, game_nick')
          .in('user_id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p.game_nick || p.username || 'Jogador';
        });
        if (!cancelled) setUsernames(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, isBetMatch, matchId]);

  const totalRefund = bets
    .filter(b => b.status === 'locked' || b.status === 'pending')
    .reduce((s, b) => s + Number(b.amount || 0), 0);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try { await onConfirm(); onOpenChange(false); }
    finally { setSubmitting(false); }
  };

  const clanName = (id: string) =>
    id === clanAId ? clanALabel : id === clanBId ? clanBLabel : 'Clã';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-destructive/40">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive font-heading">
            <AlertTriangle size={20} /> Cancelar este CW?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/80 font-display text-xs">
            Esta ação <strong className="text-destructive">não pode ser desfeita</strong>.
            O CW será removido e {isBetMatch ? 'os valores apostados serão reembolsados conforme abaixo.' : 'nenhum valor será movimentado (CW normal).'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="bg-secondary/40 rounded-lg p-3 text-xs font-display space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confronto:</span>
              <span className="text-foreground">{clanALabel} vs {clanBLabel || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className={isBetMatch ? 'text-gold' : 'text-foreground'}>{isBetMatch ? '💰 Apostado' : 'Normal'}</span>
            </div>
            {isBetMatch && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aposta por lado:</span>
                <span className="text-gold">R$ {Number(betAmount).toFixed(2)}</span>
              </div>
            )}
          </div>

          {isBetMatch && (
            <div className="border border-gold/30 rounded-lg p-3 bg-gold/5">
              <p className="text-xs font-heading text-gold mb-2 flex items-center gap-2">
                <Coins size={14} /> REEMBOLSO TOTAL: R$ {totalRefund.toFixed(2)}
              </p>
              {loading ? (
                <p className="text-[11px] text-muted-foreground font-display">Carregando apostadores...</p>
              ) : bets.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-display">Nenhuma aposta a reembolsar.</p>
              ) : (
                <ul className="space-y-1.5">
                  {bets.map(b => (
                    <li key={b.id} className="flex items-center justify-between text-[11px] font-display">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <UserIcon size={11} className="text-muted-foreground" />
                        {usernames[b.user_id] || '...'} <span className="text-muted-foreground">({clanName(b.clan_id)})</span>
                      </span>
                      <span className={b.status === 'locked' || b.status === 'pending' ? 'text-success' : 'text-muted-foreground line-through'}>
                        {b.status === 'locked' || b.status === 'pending' ? `+ R$ ${Number(b.amount).toFixed(2)}` : `R$ ${Number(b.amount).toFixed(2)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="font-heading text-xs">Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-heading text-xs"
          >
            {submitting ? 'CANCELANDO...' : 'CONFIRMAR CANCELAMENTO'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
