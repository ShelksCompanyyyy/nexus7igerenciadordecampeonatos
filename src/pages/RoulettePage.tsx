import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Sparkles, Zap, Trophy, Crown, Gift, Loader2, Wallet, Dices, Flame, ShieldCheck, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LUCKY_PACKAGES, LUCKY_TILES, RARITY_STYLES, TILE_W, buildStrip, tileFromCode, type LuckyTile } from './lucky/LuckyNexelData';
import PixModal from './lucky/PixModal';

interface SpinRow {
  id: string;
  user_id: string;
  reward_code: string;
  reward_label: string;
  reward_value: number;
  rarity: string;
  created_at: string;
}

interface RankRow { user_id: string; total: number; spins: number; username?: string }

export default function LuckyNexelPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<{ items: LuckyTile[]; winIndex: number }>(() => buildStrip('gold_5'));
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState('none');
  const [lastWin, setLastWin] = useState<LuckyTile | null>(null);
  const [showWinFlash, setShowWinFlash] = useState(false);
  const [history, setHistory] = useState<SpinRow[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [pix, setPix] = useState<{ id: string; qr: string; qrB64?: string | null; amount: number; spins: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const freeSpins = profile?.free_spins || 0;
  const wallet = (profile as any)?.wallet_balance ?? 0;

  // Carrega histórico recente + ranking semanal (todos os giros).
  useEffect(() => {
    const load = async () => {
      const { data: spins } = await supabase
        .from('lucky_spins')
        .select('id,user_id,reward_code,reward_label,reward_value,rarity,created_at')
        .order('created_at', { ascending: false })
        .limit(40);
      setHistory((spins as any) || []);

      // Ranking semanal — agrupar por user_id no client (volume baixo).
      const weekStart = new Date();
      weekStart.setUTCDate(weekStart.getUTCDate() - 7);
      const { data: weekSpins } = await supabase
        .from('lucky_spins')
        .select('user_id,reward_value')
        .gte('created_at', weekStart.toISOString());
      const map = new Map<string, RankRow>();
      (weekSpins || []).forEach((s: any) => {
        const r = map.get(s.user_id) || { user_id: s.user_id, total: 0, spins: 0 };
        r.total += Number(s.reward_value || 0);
        r.spins += 1;
        map.set(s.user_id, r);
      });
      const rows = [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
      if (rows.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id,username,game_nick')
          .in('user_id', rows.map(r => r.user_id));
        rows.forEach(r => {
          const p: any = (profs || []).find((x: any) => x.user_id === r.user_id);
          r.username = p?.game_nick || p?.username || 'Jogador';
        });
      }
      setRanking(rows);
    };
    load();

    const channel = supabase
      .channel('lucky_spins_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lucky_spins' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth || 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const spinNow = async () => {
    if (spinning) return;
    if (!user) return toast.error('Faça login');
    if (freeSpins < 1) return toast.error('Sem giros! Compre um pacote.');

    setSpinning(true);
    setShowWinFlash(false);
    setLastWin(null);

    try {
      const { data, error } = await supabase.rpc('lucky_nexel_spin' as any);
      if (error) throw error;
      const result = data as any;
      if (!result?.ok) throw new Error(result?.error || 'Falha no giro');

      const winnerCode: string = result.code;
      const winnerTile = tileFromCode(winnerCode);
      const newStrip = buildStrip(winnerCode);

      // Reset rápido para a esquerda sem transição.
      setTransition('none');
      setOffset(0);
      setStrip(newStrip);

      // Próximo frame: anima até centralizar o item vencedor.
      requestAnimationFrame(() => {
        const center = containerWidth / 2;
        const jitter = (Math.random() - 0.5) * (TILE_W * 0.5);
        const target = newStrip.winIndex * TILE_W + TILE_W / 2 - center + jitter;
        setTransition('transform 5.2s cubic-bezier(0.12, 0.7, 0.18, 1)');
        setOffset(-target);
      });

      window.setTimeout(() => {
        setLastWin(winnerTile);
        setShowWinFlash(true);
        toast.success(`🎉 ${winnerTile.label}!`);
        refreshProfile();
        setSpinning(false);
      }, 5400);
    } catch (e: any) {
      toast.error(e.message || 'Erro no giro');
      setSpinning(false);
    }
  };

  const buyPackage = async (pkgId: string) => {
    if (!user) return toast.error('Faça login');
    try {
      const { data, error } = await supabase.functions.invoke('mp-create-pix', { body: { package_id: pkgId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPix({
        id: (data as any).payment_id,
        qr: (data as any).qr_code,
        qrB64: (data as any).qr_code_base64,
        amount: (data as any).amount,
        spins: (data as any).spins,
      });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar PIX');
    }
  };

  const rankIcon = (i: number) =>
    i === 0 ? <Trophy className="text-amber-300" size={14} /> :
    i === 1 ? <Trophy className="text-zinc-300" size={14} /> :
    i === 2 ? <Trophy className="text-amber-700" size={14} /> :
    <span className="text-muted-foreground text-xs w-3.5 text-center">{i + 1}</span>;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up pb-10">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-fuchsia-950/80 via-purple-950/70 to-rose-950/80 p-5">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(168,85,247,0.5), transparent 40%), radial-gradient(circle at 80% 80%, rgba(244,63,94,0.4), transparent 40%)' }} />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl text-fuchsia-200 drop-shadow-[0_0_12px_rgba(217,70,239,0.7)] flex items-center gap-2">
              <Sparkles className="text-fuchsia-300" /> LUCKY NEXEL
            </h1>
            <p className="text-[11px] text-fuchsia-200/70 font-display">Roleta premium com prêmios em PIX, VIP e cosméticos</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-fuchsia-200/60 font-display">Seus giros</p>
            <p className="font-heading text-3xl text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">{freeSpins}</p>
          </div>
        </div>
      </div>

      {/* ROULETTE */}
      <div className="relative bg-zinc-950 border border-fuchsia-500/40 rounded-2xl p-4 shadow-[0_0_28px_rgba(168,85,247,0.25)]">
        {/* Pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1 z-20 pointer-events-none">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-1 z-20 pointer-events-none">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
        </div>
        {/* Edge fades */}
        <div className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-zinc-950 to-transparent rounded-l-2xl" />
        <div className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-zinc-950 to-transparent rounded-r-2xl" />

        <div ref={containerRef} className="relative h-[140px] overflow-hidden">
          <div
            className="flex items-center h-full will-change-transform"
            style={{ transform: `translateX(${offset}px)`, transition }}
          >
            {strip.items.map((tile, i) => {
              const r = RARITY_STYLES[tile.rarity];
              return (
                <div key={i} className="shrink-0 px-1" style={{ width: TILE_W }}>
                  <div className={`flex flex-col items-center justify-center h-[120px] rounded-xl border-2 ${r.bg} ${r.border} ${r.glow}`}>
                    <span className="text-3xl">{tile.emoji}</span>
                    <span className={`mt-1 text-[11px] font-heading text-center px-1 leading-tight ${r.text}`}>{tile.short}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spin button */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
          <button
            onClick={spinNow}
            disabled={spinning || freeSpins < 1}
            className="flex-1 py-3 rounded-xl font-heading text-base text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(217,70,239,0.55)] flex items-center justify-center gap-2"
          >
            {spinning
              ? <><Loader2 className="animate-spin" size={18} /> Girando...</>
              : <><Sparkles size={18} /> GIRAR ({freeSpins})</>}
          </button>
          <Link to="/wallet" className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-400/40 font-heading text-sm text-amber-300 flex items-center justify-center gap-2 hover:bg-amber-500/20 transition">
            <Wallet size={16} /> Carteira R$ {Number(wallet).toFixed(2).replace('.', ',')}
          </Link>
        </div>

        {lastWin && showWinFlash && (
          <div className="mt-3 text-center animate-scale-in">
            <div className={`inline-block px-4 py-2 rounded-lg border-2 ${RARITY_STYLES[lastWin.rarity].border} ${RARITY_STYLES[lastWin.rarity].bg} ${RARITY_STYLES[lastWin.rarity].glow}`}>
              <p className={`font-heading text-sm ${RARITY_STYLES[lastWin.rarity].text}`}>
                {lastWin.emoji} {lastWin.label}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PACOTES */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-heading text-sm text-primary text-glow flex items-center gap-2 mb-3">
          <Gift size={16} /> COMPRAR GIROS (PIX)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {LUCKY_PACKAGES.map(p => (
            <button key={p.id} onClick={() => buyPackage(p.id)}
              className="relative bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/40 rounded-xl p-3 text-left hover:border-fuchsia-300 hover:shadow-[0_0_16px_rgba(217,70,239,0.45)] transition-all">
              {p.tag && (
                <span className="absolute -top-2 -right-2 text-[9px] font-heading bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full">
                  {p.tag}
                </span>
              )}
              <p className="font-heading text-amber-300 text-base">R$ {p.amount.toFixed(2).replace('.', ',')}</p>
              <p className="text-[11px] text-fuchsia-200/80 font-display">{p.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-display">{p.spins + p.bonus} giros totais</p>
            </button>
          ))}
        </div>
      </div>

      {/* PRÊMIOS POSSÍVEIS */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-heading text-sm text-primary text-glow flex items-center gap-2 mb-3">
          <Flame size={16} /> PRÊMIOS POSSÍVEIS
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {LUCKY_TILES.map(t => {
            const r = RARITY_STYLES[t.rarity];
            return (
              <div key={t.code} className={`rounded-lg border-2 ${r.border} ${r.bg} p-2 text-center`}>
                <div className="text-2xl">{t.emoji}</div>
                <p className={`text-[10px] font-display ${r.text}`}>{t.short}</p>
                <p className="text-[8px] uppercase text-muted-foreground font-display">{t.rarity}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RANKING + HISTÓRICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-heading text-sm text-primary text-glow flex items-center gap-2 mb-3">
            <Crown size={16} /> RANKING SEMANAL
          </h3>
          {ranking.length === 0
            ? <p className="text-xs text-muted-foreground font-display">Sem dados ainda — seja o primeiro!</p>
            : (
              <div className="space-y-1.5">
                {ranking.map((r, i) => (
                  <div key={r.user_id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {rankIcon(i)}
                      <span className="truncate text-foreground">{r.username}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{r.spins} giros</span>
                      <span className="text-amber-300 font-heading">+{r.total.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-heading text-sm text-primary text-glow flex items-center gap-2 mb-3">
            <History size={16} /> ÚLTIMOS GIROS
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {history.length === 0 && <p className="text-xs text-muted-foreground font-display">Nada por aqui ainda.</p>}
            {history.map(h => {
              const t = tileFromCode(h.reward_code);
              const r = RARITY_STYLES[t.rarity];
              return (
                <div key={h.id} className="flex items-center justify-between text-xs font-display border-b border-border/30 pb-1">
                  <span className={`px-1.5 py-0.5 rounded ${r.bg} ${r.text} text-[10px]`}>{t.emoji} {h.reward_label}</span>
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground font-display flex items-center gap-1.5 justify-center">
        <ShieldCheck size={12} /> Pagamentos protegidos via Mercado Pago. Resultado dos giros gerado no servidor.
      </div>

      {pix && (
        <PixModal
          paymentId={pix.id}
          qrCode={pix.qr}
          qrCodeBase64={pix.qrB64}
          amount={pix.amount}
          spins={pix.spins}
          onClose={() => setPix(null)}
          onPaid={() => refreshProfile()}
        />
      )}
    </div>
  );
}