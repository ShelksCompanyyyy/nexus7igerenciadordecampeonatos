import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus7i-logo.png';
import { Shield, Crown, User } from 'lucide-react';

type LoginMode = 'user' | 'admin' | 'superadmin' | 'register';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<LoginMode>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameNick, setGameNick] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      try {
        register({ username, email, password, gameNick, whatsapp });
        toast.success('Conta criada com sucesso!');
      } catch (err: any) {
        toast.error(err.message);
      }
    } else {
      const user = login(email, password);
      if (user) {
        if (mode === 'superadmin' && user.role !== 'superadmin') {
          toast.error('Credenciais de Super Admin inválidas');
          return;
        }
        if (mode === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
          toast.error('Esta conta não tem permissão de Admin');
          return;
        }
        toast.success(`Bem-vindo, ${user.username}!`);
      } else {
        toast.error('Email ou senha incorretos');
      }
    }
  };

  const modeConfig = {
    user: { title: 'LOGIN JOGADOR', icon: User, color: 'text-foreground' },
    admin: { title: 'LOGIN ADMIN', icon: Shield, color: 'text-primary' },
    superadmin: { title: 'SUPER ADMIN', icon: Crown, color: 'text-gold' },
    register: { title: 'CRIAR CONTA', icon: User, color: 'text-foreground' },
  };

  const current = modeConfig[mode];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-md p-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 animate-slide-up">
          <img src={nexusLogo} alt="Nexus7i" className="w-28 h-28 animate-float drop-shadow-[0_0_30px_hsl(0,100%,50%,0.5)]" />
          <h1 className="text-2xl font-heading text-primary text-glow mt-3 tracking-widest">NEXUS7i</h1>
          <p className="text-muted-foreground font-display text-lg tracking-wider">E-SPORTS</p>
        </div>

        {/* Login Mode Tabs */}
        <div className="flex gap-2 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {([
            { id: 'user' as const, label: 'Jogador', icon: User },
            { id: 'admin' as const, label: 'Admin', icon: Shield },
            { id: 'superadmin' as const, label: 'Super ADM', icon: Crown },
          ]).map(tab => (
            <button key={tab.id} onClick={() => { setMode(tab.id); setEmail(''); setPassword(''); }}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg font-display text-xs transition-all ${
                mode === tab.id
                  ? tab.id === 'superadmin'
                    ? 'bg-gold/10 border border-gold/50 text-gold'
                    : tab.id === 'admin'
                    ? 'bg-primary/10 neon-border text-primary'
                    : 'bg-secondary border border-border text-foreground'
                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`space-y-4 rounded-lg p-6 bg-card/80 backdrop-blur-xl animate-slide-up ${
          mode === 'superadmin' ? 'border border-gold/30' : mode === 'admin' ? 'neon-border' : 'border border-border'
        }`} style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <current.icon size={20} className={current.color} />
            <h2 className={`font-heading text-sm ${current.color}`}>{current.title}</h2>
          </div>

          {mode === 'superadmin' && (
            <p className="text-xs text-center text-gold/60 font-display">Acesso restrito ao dono da plataforma</p>
          )}
          {mode === 'admin' && (
            <p className="text-xs text-center text-primary/60 font-display">Acesso para administradores de clã</p>
          )}

          {mode === 'register' && (
            <>
              <input type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display" />
              <input type="text" placeholder="Nick do Jogo" value={gameNick}
                onChange={e => setGameNick(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display" />
              <input type="text" placeholder="WhatsApp" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display" />
            </>
          )}

          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display" />
          <input type="password" placeholder="Senha" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display" />

          <button type="submit" className={`w-full py-3 font-heading text-sm rounded transition-all ${
            mode === 'superadmin'
              ? 'bg-gradient-to-r from-gold/80 to-gold text-background hover:from-gold hover:to-gold/90 shadow-[0_0_20px_hsl(45,100%,50%,0.3)]'
              : mode === 'admin'
              ? 'gradient-primary text-primary-foreground box-glow hover:box-glow-lg'
              : 'gradient-primary text-primary-foreground hover:opacity-90'
          }`}>
            {mode === 'register' ? 'REGISTRAR' : 'ENTRAR'}
          </button>

          <p className="text-center text-muted-foreground text-xs font-display">
            {mode === 'register' ? (
              <>Já tem conta?{' '}
                <button type="button" onClick={() => setMode('user')} className="text-primary hover:text-neon-glow transition-colors">
                  Fazer Login
                </button>
              </>
            ) : (
              <>Não tem conta?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-primary hover:text-neon-glow transition-colors">
                  Registrar
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
