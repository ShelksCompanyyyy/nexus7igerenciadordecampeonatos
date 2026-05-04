import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import nexusLogo from '@/assets/nexel-logo.png';
import { useState, useEffect } from 'react';
import { Home, Trophy, Users, Swords, Dices, MessageSquare, Newspaper, ShoppingBag, LogOut, Menu, X, Target, DollarSign, UserCircle, Shield, BookOpen, Bell, UserPlus, ChevronRight, Settings, Info, Wallet, Package, Lock, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Itens completos do menu lateral (drawer mobile + sidebar desktop)
const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home, accent: 'primary' as const },
  { path: '/profile', label: 'Perfil', icon: UserCircle, accent: 'primary' as const },
  { path: '/ranking', label: 'Ranking', icon: Trophy, accent: 'primary' as const },
  { path: '/roulette', label: 'Roleta', icon: Dices, accent: 'primary' as const },
  { path: '/wallet', label: 'Carteira', icon: Wallet, accent: 'gold' as const },
  { path: '/inventory', label: 'Inventário', icon: Package, accent: 'info' as const },
  { path: '/security', label: 'Segurança', icon: Lock, accent: 'info' as const },
  { path: '/shop', label: 'Loja NexelGolds', icon: ShoppingBag, accent: 'primary' as const },
  { path: '/chat', label: 'Chat Geral', icon: MessageSquare, accent: 'primary' as const },
  { path: '/matchcw', label: 'Match CW', icon: Shield, accent: 'gold' as const },
  { path: '/matchcw-bet', label: 'CW Apostado', icon: DollarSign, accent: 'gold' as const },
  { path: '/friends', label: 'Amigos & Chat Privado', icon: UserPlus, accent: 'info' as const },
  { path: '/tournaments', label: 'Campeonatos Internos', icon: Trophy, accent: 'gold' as const },
  { path: '/central', label: 'Painel Central', icon: Crown, accent: 'gold' as const },
  { path: '/matches', label: 'Partidas', icon: Swords, accent: 'primary' as const },
  { path: '/teams', label: 'Times (Lines)', icon: Users, accent: 'primary' as const },
  { path: '/training', label: 'X-Treinos', icon: Target, accent: 'primary' as const },
  { path: '/news', label: 'Notícias', icon: Newspaper, accent: 'primary' as const },
  { path: '/support', label: 'Suporte', icon: MessageSquare, accent: 'info' as const },
  { path: '/about', label: 'Sobre o Nexel', icon: Info, accent: 'info' as const },
  { path: '/settings', label: 'Configurações', icon: Settings, accent: 'primary' as const },
  { path: '/tutorial', label: 'Tutorial', icon: BookOpen, accent: 'primary' as const },
];

// Bottom nav fixa (mobile) — apenas atalhos principais
const BOTTOM_NAV = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/roulette', label: 'Roleta', icon: Dices },
  { path: '/shop', label: 'Loja', icon: ShoppingBag },
  { path: '/profile', label: 'Perfil', icon: UserCircle },
];

const ADMIN_ITEMS = [
  { path: '/admin', label: 'Painel Central', icon: Shield },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, logout, isAdminUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Realtime: refetch on any change to this user's notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchUnread(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-full z-40">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={nexusLogo} alt="Nexel" className="w-10 h-10 drop-shadow-[0_0_10px_hsl(0,100%,50%,0.5)]" />
          <div>
            <h1 className="font-heading text-sm text-primary text-glow-sm tracking-wider">NEXEL</h1>
            <p className="text-[9px] text-muted-foreground font-display">FPS COMPETITIVE PLATFORM</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-display text-sm transition-all ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary neon-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          {isAdminUser && ADMIN_ITEMS.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-display text-sm transition-all ${
                location.pathname.startsWith(item.path)
                  ? 'bg-primary/10 text-primary neon-border'
                  : 'text-primary/70 hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading text-xs">
              {profile?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display text-foreground truncate">{profile?.username}</p>
              <p className="text-xs text-gold font-display">{profile?.gold || 0}G</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-muted-foreground hover:text-destructive text-sm font-display w-full px-3 py-2 rounded hover:bg-destructive/10 transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <span className="font-heading text-lg text-primary text-glow tracking-wider">NEXEL</span>
          </button>
          <div className="flex items-center gap-3">
          <span className="text-gold text-sm font-heading">{profile?.gold || 0} NexelGolds</span>
            <button onClick={() => navigate('/notifications')} className="relative text-foreground" aria-label="Notificações">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-heading animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/settings')} className="text-foreground" aria-label="Configurações">
              <Settings size={20} />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer — estilo "MENU" das fotos */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background overflow-y-auto">
          {/* Header do drawer */}
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h2 className="font-heading text-3xl text-primary text-glow tracking-wider">MENU</h2>
            <button onClick={() => setMobileOpen(false)} className="text-foreground p-1" aria-label="Fechar">
              <X size={28} />
            </button>
          </div>

          {/* Card do usuário */}
          <div className="p-4">
            <div className="bg-card neon-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-heading text-primary text-glow text-xl">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-foreground text-base truncate">{profile?.username}</p>
                <span className="inline-block mt-1 px-2 py-0.5 border border-primary/60 rounded text-[10px] font-heading text-primary tracking-wider">
                  {isAdminUser ? 'ADMIN' : 'JOGADOR'}
                </span>
              </div>
              <div className="text-right">
                <p className="font-heading text-gold text-sm">{profile?.gold || 0} NexelGolds</p>
                <p className="font-heading text-primary text-sm mt-0.5">{profile?.free_spins || 0} Giros</p>
              </div>
            </div>
          </div>

          {/* Lista de itens */}
          <nav className="px-4 pb-24">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.path;
              const accentText =
                item.accent === 'gold' ? 'text-gold' :
                item.accent === 'info' ? 'text-[hsl(200,100%,60%)]' :
                'text-primary';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 py-4 border-b border-border/30 ${active ? 'opacity-100' : 'opacity-95'}`}
                >
                  <item.icon size={22} className={accentText} />
                  <span className={`flex-1 font-display text-base ${accentText === 'text-primary' ? 'text-foreground' : accentText}`}>
                    {item.label}
                  </span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </Link>
              );
            })}
            {isAdminUser && ADMIN_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-4 py-4 border-b border-border/30">
                <item.icon size={22} className="text-primary" />
                <span className="flex-1 font-display text-base text-primary">{item.label}</span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </Link>
            ))}
            <button onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="flex items-center gap-4 py-4 w-full text-left">
              <LogOut size={22} className="text-destructive" />
              <span className="flex-1 font-display text-base text-destructive">Sair</span>
            </button>
          </nav>
        </div>
      )}

      {/* Bottom Nav fixa (mobile) — 5 atalhos */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-stretch justify-around">
          {BOTTOM_NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon size={20} className={active ? 'text-glow-sm' : ''} />
                <span className={`text-[10px] font-display ${active ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
