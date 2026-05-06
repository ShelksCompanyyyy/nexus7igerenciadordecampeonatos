import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Sparkles, Zap, Trophy, Crown, Gift, Loader2, Wallet, Dices, Flame, ShieldCheck, History, X, Volume2, VolumeX } from 'lucide-react';
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
  const [winModal, setWinModal] = useState<LuckyTile | null>(null);
  const [goldenFlash, setGoldenFlash] = useState(false);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState<SpinRow[]>([]);
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [pix, setPix] = useState<{ id: string; qr: string; qrB64?: string | null; amount: number; spins: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  const getCtx = () => {
    if (muted) return null;
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    }
    return audioCtxRef.current;
  };
  const playTone = (freq: number, dur = 0.07, type: OscillatorType = 'square', vol = 0.06) => {
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  };
  const playWinJingle = (rarity: string) => {
    const seqs: Record<string, number[]> = {
      common:    [440, 523],
      uncommon:  [523, 659, 784],
      rare:      [523, 659, 784, 988],
      epic:      [659, 784, 988, 1175, 1318],
      legendary: [523, 659, 784, 1046, 1318, 1568],
      mythic:    [392, 523, 659, 784, 1046, 1318, 1568, 2093],
    };
    const notes = seqs[rarity] || seqs.common;
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'triangle', 0.09), i * 110));
  };

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
    setWinModal(null);
    setGoldenFlash(false);

    try {
      const { data, error } = await supabase.rpc('lucky_nexel_spin' as any);
      if (error) throw error;
      const result = data as any;
      // RPC retorna { success: true, code, type, rarity, label, value }
      if (!result || result.success === false) throw new Error(result?.error || 'Falha no giro');

      const winnerCode: string = result.code || 'gold_main';
      const winnerTile = tileFromCode(winnerCode);
      const newStrip = buildStrip(winnerCode);

      // Reset à esquerda sem transição
      setTransition('none');
      setOffset(0);
      setStrip(newStrip);

      const SPIN_MS = 5600;
      // Próximo frame: anima até centralizar o item vencedor com easing realista (ease-out cúbico)
      requestAnimationFrame(() => {
        const center = containerWidth / 2;
        const target = newStrip.winIndex * TILE_W + TILE_W / 2 - center;
        // cubic-bezier ease-out cúbico (rápido início, parada suave)
        setTransition(`transform ${SPIN_MS}ms cubic-bezier(0.08, 0.82, 0.17, 1)`);
        setOffset(-target);
      });

      // Som de giro contínuo (ticks decrescentes) — simula desaceleração
      let tickCount = 0;
      const totalTicks = 38;
      const startTick = () => {
        if (tickCount >= totalTicks) {
          if (tickIntervalRef.current) { clearTimeout(tickIntervalRef.current); tickIntervalRef.current = null; }
          return;
        }
        playTone(800 + Math.random() * 200, 0.03, 'square', 0.04);
        tickCount++;
        // intervalo cresce conforme desacelera
        const progress = tickCount / totalTicks;
        const delay = 60 + Math.pow(progress, 3) * 380;
        tickIntervalRef.current = window.setTimeout(startTick, delay);
      };
      startTick();

      window.setTimeout(() => {
        if (tickIntervalRef.current) { clearTimeout(tickIntervalRef.current); tickIntervalRef.current = null; }
        setLastWin(winnerTile);
        setShowWinFlash(true);
        setGoldenFlash(true);
        setTimeout(() => setGoldenFlash(false), 700);
        // Bounce final (impacto)
        setTransition('transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)');
        setOffset(prev => prev + 8);
        setTimeout(() => { setTransition('transform 180ms ease-out'); setOffset(prev => prev - 8); }, 180);

        // Vibração mobile
        if ('vibrate' in navigator) {
          const pat: Record<string, number[]> = {
            common: [40], uncommon: [60], rare: [40, 60, 40],
            epic: [60, 80, 60, 80], legendary: [80, 60, 80, 100, 80], mythic: [100, 80, 120, 80, 140],
          };
          try { (navigator as any).vibrate(pat[winnerTile.rarity] || [40]); } catch {}
        }
        playWinJingle(winnerTile.rarity);

        // Modal premiação para épico+
        const intense = ['epic', 'legendary', 'mythic'].includes(winnerTile.rarity);
        if (intense) {
          setTimeout(() => setWinModal(winnerTile), 400);
        } else {
          toast.success(`🎉 ${winnerTile.label}!`);
        }

        refreshProfile();
        setSpinning(false);
      }, SPIN_MS + 50);
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
    <div className="max-w-md mx-auto space-y-3 animate-slide-up pb-8 px-1">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-950/80 via-purple-950/70 to-rose-950/80 p-3">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(168,85,247,0.5), transparent 40%), radial-gradient(circle at 80% 80%, rgba(244,63,94,0.4), transparent 40%)' }} />
        <div className="relative flex items-center justify-between gap-2">
          <div>
            <h1 className="font-heading text-lg text-fuchsia-200 drop-shadow-[0_0_12px_rgba(217,70,239,0.7)] flex items-center gap-1.5">
              <Sparkles className="text-fuchsia-300" size={16} /> LUCKY NEXEL
            </h1>
            <p className="text-[9px] text-fuchsia-200/70 font-display">PIX, VIP, visuais & boosts</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase text-fuchsia-200/60 font-display">Giros</p>
            <p className="font-heading text-xl text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">{freeSpins}</p>
          </div>
        </div>
      </div>

      {/* ROULETTE */}
      <div className="relative bg-gradient-to-b from-zinc-950 to-zinc-900 border border-fuchsia-500/40 rounded-2xl p-2.5 shadow-[0_0_28px_rgba(168,85,247,0.25)]">
        {/* Golden flash overlay quando para */}
        {goldenFlash && (
          <div className="absolute inset-0 z-30 pointer-events-none rounded-2xl"
               style={{ background: 'radial-gradient(circle at center, rgba(251,191,36,0.85), rgba(251,191,36,0) 65%)', animation: 'fadeOut 0.7s ease-out forwards' }} />
        )}
        {/* Mute button */}
        <button onClick={() => setMuted(m => !m)} className="absolute top-1.5 right-1.5 z-30 text-fuchsia-200/70 hover:text-fuchsia-200">
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
        {/* Pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1 z-20 pointer-events-none">
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,1)] animate-pulse" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-1 z-20 pointer-events-none">
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,1)] animate-pulse" />
        </div>
        {/* Center selection line — pulsa quando ganha */}
        <div className={`absolute left-1/2 top-2 bottom-2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-amber-300 via-amber-200 to-amber-300 z-10 pointer-events-none opacity-80 shadow-[0_0_12px_rgba(251,191,36,1)] ${showWinFlash ? 'animate-pulse' : ''}`} />
        {/* Edge fades */}
        <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-zinc-950 to-transparent rounded-l-2xl" />
        <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-zinc-950 to-transparent rounded-r-2xl" />

        <div ref={containerRef} className="relative h-[92px] overflow-hidden">
          <div
            className="flex items-center h-full will-change-transform"
            style={{ transform: `translateX(${offset}px)`, transition }}
          >
            {strip.items.map((tile, i) => {
              const r = RARITY_STYLES[tile.rarity];
              const isWinner = !spinning && showWinFlash && i === strip.winIndex;
              return (
                <div key={i} className="shrink-0 px-0.5" style={{ width: TILE_W }}>
                  <div className={`flex flex-col items-center justify-center h-[80px] rounded-lg border-2 ${r.bg} ${r.border} ${r.glow} ${isWinner ? 'animate-pulse ring-4 ring-amber-300/80' : ''} transition-all`}>
                    <span className="text-xl">{tile.emoji}</span>
                    <span className={`mt-0.5 text-[9px] font-heading text-center px-1 leading-tight ${r.text}`}>{tile.short}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spin button */}
        <div className="mt-2.5 flex items-stretch gap-2">
          <button
            onClick={spinNow}
            disabled={spinning || freeSpins < 1}
            className="flex-1 py-2.5 rounded-lg font-heading text-sm text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(217,70,239,0.55)] flex items-center justify-center gap-1.5"
          >
            {spinning
              ? <><Loader2 className="animate-spin" size={14} /> Girando...</>
              : <><Sparkles size={14} /> GIRAR ({freeSpins})</>}
          </button>
          <Link to="/wallet" className="px-2.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-400/40 font-heading text-[11px] text-amber-300 flex items-center justify-center gap-1 hover:bg-amber-500/20 transition shrink-0">
            <Wallet size={12} /> R$ {Number(wallet).toFixed(2).replace('.', ',')}
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

        <style>{`
          @keyframes fadeOut { 0% { opacity: 1 } 100% { opacity: 0 } }
          @keyframes burst {
            0% { transform: translate(-50%,-50%) scale(0); opacity: 1 }
            100% { transform: translate(-50%,-50%) scale(1) translate(var(--dx), var(--dy)); opacity: 0 }
          }
        `}</style>
      </div>

      {/* PACOTES */}
      <div className="bg-card border border-border rounded-xl p-3">
        <h3 className="font-heading text-xs text-primary text-glow flex items-center gap-2 mb-2">
          <Gift size={14} /> COMPRAR GIROS (PIX)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LUCKY_PACKAGES.map(p => (
            <button key={p.id} onClick={() => buyPackage(p.id)}
              className="relative bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/40 rounded-lg p-2.5 text-left hover:border-fuchsia-300 hover:shadow-[0_0_16px_rgba(217,70,239,0.45)] transition-all">
              {p.tag && (
                <span className="absolute -top-2 -right-2 text-[8px] font-heading bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full">
                  {p.tag}
                </span>
              )}
              <p className="font-heading text-amber-300 text-sm">R$ {p.amount.toFixed(2).replace('.', ',')}</p>
              <p className="text-[10px] text-fuchsia-200/80 font-display">{p.label}</p>
              <p className="text-[9px] text-muted-foreground font-display">{p.spins + p.bonus} giros</p>
            </button>
          ))}
        </div>
      </div>

      {/* PRÊMIOS POSSÍVEIS */}
      <div className="bg-card border border-border rounded-xl p-3">
        <h3 className="font-heading text-xs text-primary text-glow flex items-center gap-2 mb-2">
          <Flame size={14} /> PRÊMIOS POSSÍVEIS
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {LUCKY_TILES.map(t => {
            const r = RARITY_STYLES[t.rarity];
            return (
              <div key={t.code} className={`rounded-md border ${r.border} ${r.bg} p-1.5 text-center`}>
                <div className="text-lg">{t.emoji}</div>
                <p className={`text-[9px] font-display ${r.text} leading-tight`}>{t.short}</p>
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

      {winModal && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          {/* Particle burst */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => {
              const angle = (i / 28) * Math.PI * 2;
              const dist = 200 + Math.random() * 180;
              const dx = Math.cos(angle) * dist + 'px';
              const dy = Math.sin(angle) * dist + 'px';
              const colors = ['#fbbf24','#f472b6','#a78bfa','#34d399','#60a5fa'];
              return (
                <span key={i} className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                  style={{ background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}`, animation: `burst 1.4s ease-out forwards`, ['--dx' as any]: dx, ['--dy' as any]: dy }} />
              );
            })}
          </div>
          <div className={`relative w-full max-w-sm bg-card border-2 ${RARITY_STYLES[winModal.rarity].border} ${RARITY_STYLES[winModal.rarity].glow} rounded-2xl p-6 text-center space-y-3 animate-scale-in`}>
            <button onClick={() => setWinModal(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            <p className="text-[11px] uppercase font-display text-muted-foreground tracking-widest">Você ganhou</p>
            <div className="text-7xl drop-shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-[bounce_1s_ease-in-out_infinite]">{winModal.emoji}</div>
            <p className={`font-heading text-xl ${RARITY_STYLES[winModal.rarity].text}`}>{winModal.label}</p>
            <p className="text-[10px] uppercase text-muted-foreground font-display tracking-widest">{winModal.rarity}</p>
            <button onClick={() => setWinModal(null)} className="w-full py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-heading text-sm shadow-[0_0_18px_rgba(217,70,239,0.5)]">
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}