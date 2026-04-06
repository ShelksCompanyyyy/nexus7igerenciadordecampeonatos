import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus7i-logo.png';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameNick, setGameNick] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      try {
        register({ username, email, password, gameNick, whatsapp });
        toast.success('Conta criada com sucesso!');
      } catch (err: any) {
        toast.error(err.message);
      }
    } else {
      const user = login(email, password);
      if (user) {
        toast.success(`Bem-vindo, ${user.username}!`);
      } else {
        toast.error('Email ou senha incorretos');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-slide-up">
          <img src={nexusLogo} alt="Nexus7i" className="w-32 h-32 animate-float drop-shadow-[0_0_30px_hsl(0,100%,50%,0.5)]" />
          <h1 className="text-2xl font-heading text-primary text-glow mt-4 tracking-widest">NEXUS7i</h1>
          <p className="text-muted-foreground font-display text-lg tracking-wider">E-SPORTS</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 neon-border rounded-lg p-6 bg-card/80 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-heading text-lg text-center text-foreground">{isRegister ? 'CRIAR CONTA' : 'LOGIN'}</h2>

          {isRegister && (
            <>
              <input
                type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display"
              />
              <input
                type="text" placeholder="Nick do Jogo" value={gameNick}
                onChange={e => setGameNick(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display"
              />
              <input
                type="text" placeholder="WhatsApp" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)} required
                className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display"
              />
            </>
          )}

          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display"
          />
          <input
            type="password" placeholder="Senha" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display"
          />

          <button type="submit" className="w-full py-3 gradient-primary text-primary-foreground font-heading rounded hover:opacity-90 transition-all box-glow hover:box-glow-lg">
            {isRegister ? 'REGISTRAR' : 'ENTRAR'}
          </button>

          <p className="text-center text-muted-foreground text-sm font-display">
            {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-primary hover:text-neon-glow transition-colors">
              {isRegister ? 'Fazer Login' : 'Registrar'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
