import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import nexusLogo from '@/assets/nexus7i-logo.png';
import { useState } from 'react';
import { Home, Trophy, Users, Swords, Dices, MessageSquare, Newspaper, ShoppingBag, Settings, LogOut, Menu, X, Target, DollarSign, UserCircle, Shield, BookOpen, Bell } from 'lucide-react';
import { getNotifications, markAllNotificationsRead } from '@/lib/store';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/teams', label: 'Times', icon: Users },
  { path: '/matches', label: 'Partidas', icon: Swords },
  { path: '/training', label: 'XTreino', icon: Target },
  { path: '/roulette', label: 'Roleta', icon: Dices },
  { path: '/shop', label: 'Loja', icon: ShoppingBag },
  { path: '/news', label: 'Notícias', icon: Newspaper },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/tutorial', label: 'Tutorial', icon: BookOpen },
  { path: '/profile', label: 'Perfil', icon: UserCircle },
];

const ADMIN_ITEMS = [
  { path: '/admin', label: 'Admin', icon: Shield },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdminUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = user ? getNotifications(user.id).filter(n => !n.read).length : 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border fixed h-full z-40">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={nexusLogo} alt="Nexus7i" className="w-10 h-10 drop-shadow-[0_0_10px_hsl(0,100%,50%,0.5)]" />
          <div>
            <h1 className="font-heading text-sm text-primary text-glow-sm tracking-wider">NEXUS7i</h1>
            <p className="text-xs text-muted-foreground font-display">E-SPORTS</p>
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
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display text-foreground truncate">{user?.username}</p>
              <p className="text-xs text-gold font-display">{user?.gold}G</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-muted-foreground hover:text-destructive text-sm font-display w-full px-3 py-2 rounded hover:bg-destructive/10 transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img src={nexusLogo} alt="Nexus7i" className="w-8 h-8" />
            <span className="font-heading text-xs text-primary">NEXUS7i</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gold text-xs font-display">{user?.gold}G</span>
            <button onClick={() => { if (user) { markAllNotificationsRead(user.id); } navigate('/'); }} className="relative text-foreground">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-heading animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-lg pt-16">
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-display transition-all ${
                  location.pathname === item.path ? 'bg-primary/10 text-primary neon-border' : 'text-muted-foreground'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            {isAdminUser && ADMIN_ITEMS.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-md font-display text-primary/70"
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            <button onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-md font-display text-destructive w-full mt-4">
              <LogOut size={20} /> Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
