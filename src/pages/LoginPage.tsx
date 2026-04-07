import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus7i-logo.png';
import { Shield, Crown, User, KeyRound, ArrowLeft, Mail, Users, Eye, EyeOff } from 'lucide-react';
import { getUsers, updateUser, updateClan, getClans, addClan } from '@/lib/store';

type LoginMode = 'user' | 'admin' | 'superadmin' | 'register-player' | 'register-leader' | 'forgot' | 'register-select';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<LoginMode>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [gameNick, setGameNick] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedClanId, setSelectedClanId] = useState('');
  const [newClanName, setNewClanName] = useState('');
  const [clanAdminCode, setClanAdminCode] = useState('');
  const [newClanAdminCode, setNewClanAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password states
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'newpass'>('email');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryUserId, setRecoveryUserId] = useState('');

  const clans = getClans();

  const isRegisterMode = mode === 'register-player' || mode === 'register-leader';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      handleForgotPassword();
      return;
    }

    if (mode === 'register-player') {
      try {
        if (!selectedClanId) { toast.error('Selecione seu clã'); return; }
        const u = register({ username, email, password, gameNick, whatsapp });
        updateUser(u.id, { clanId: selectedClanId });
        login(email, password);
        toast.success('Conta de jogador criada com sucesso!');
      } catch (err: any) { toast.error(err.message); }
      return;
    }

    if (mode === 'register-leader') {
      try {
        if (!newClanName.trim()) { toast.error('Digite o nome do clã'); return; }
        if (!newClanAdminCode.trim() || newClanAdminCode.length < 4) { toast.error('Crie um código de admin com no mínimo 4 caracteres'); return; }
        const u = register({ username, email, password, gameNick, whatsapp });
        const clan = addClan({ name: newClanName.trim(), description: '', ownerId: u.id, division: 'Livre', wins: 0, losses: 0, createdAt: new Date().toISOString(), adminCode: newClanAdminCode.trim() });
        updateUser(u.id, { clanId: clan.id, role: 'admin' });
        login(email, password);
        toast.success('Clã criado e conta de Líder registrada!');
      } catch (err: any) { toast.error(err.message); }
      return;
    }


    if (mode === 'admin') {
      const user = login(email, password);
      if (user) {
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          toast.error('Esta conta não tem permissão de Admin');
          return;
        }
        if (user.role === 'admin') {
          const clan = clans.find(c => c.id === user.clanId);
          if (!clan || clan.adminCode !== clanAdminCode) {
            toast.error('Código de admin do clã inválido');
            return;
          }
        }
        toast.success(`Bem-vindo, ${user.username}!`);
      } else {
        toast.error('Email ou senha incorretos');
      }
    } else {
      const user = login(email, password);
      if (user) {
        if (mode === 'superadmin' && user.role !== 'superadmin') {
          toast.error('Credenciais de ADM Criador inválidas');
          return;
        }
        toast.success(`Bem-vindo, ${user.username}!`);
      } else {
        toast.error('Email ou senha incorretos');
      }
    }
  };

  const handleForgotPassword = () => {
    if (forgotStep === 'email') {
      const users = getUsers();
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found) { toast.error('Email não encontrado'); return; }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setRecoveryUserId(found.id);
      setForgotStep('code');
      toast.success(`Código de recuperação enviado para ${email}`, { description: `(Simulado) Seu código é: ${code}`, duration: 15000 });
    } else if (forgotStep === 'code') {
      if (recoveryCode !== generatedCode) { toast.error('Código incorreto'); return; }
      setForgotStep('newpass');
      toast.success('Código verificado! Digite sua nova senha.');
    } else if (forgotStep === 'newpass') {
      if (newPassword.length < 4) { toast.error('Senha deve ter no mínimo 4 caracteres'); return; }
      if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
      updateUser(recoveryUserId, { password: newPassword });
      toast.success('Senha alterada com sucesso! Faça login.');
      setMode('user'); setForgotStep('email'); setEmail(''); setPassword('');
      setRecoveryCode(''); setNewPassword(''); setConfirmPassword('');
    }
  };

  const modeConfig: Record<LoginMode, { title: string; icon: any; color: string }> = {
    user: { title: 'LOGIN JOGADOR', icon: User, color: 'text-foreground' },
    admin: { title: 'LOGIN ADMIN CLÃ', icon: Shield, color: 'text-primary' },
    superadmin: { title: 'ADM CRIADOR', icon: Crown, color: 'text-gold' },
    'register-player': { title: 'REGISTRO JOGADOR', icon: User, color: 'text-foreground' },
    'register-leader': { title: 'REGISTRO LÍDER DE CLÃ', icon: Shield, color: 'text-primary' },
    'register-select': { title: 'CRIAR CONTA', icon: Users, color: 'text-foreground' },
    forgot: { title: 'RECUPERAR SENHA', icon: KeyRound, color: 'text-primary' },
  };

  const current = modeConfig[mode];
  const inputClass = "w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display";

  const isLoginMode = mode === 'user' || mode === 'admin' || mode === 'superadmin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-6 animate-slide-up">
          <img src={nexusLogo} alt="Nexus7i" className="w-28 h-28 animate-float drop-shadow-[0_0_30px_hsl(0,100%,50%,0.5)]" />
          <h1 className="text-2xl font-heading text-primary text-glow mt-3 tracking-widest">NEXUS7i</h1>
          <p className="text-muted-foreground font-display text-lg tracking-wider">E-SPORTS</p>
        </div>

        {/* Login tabs - only show when in login modes */}
        {isLoginMode && (
          <div className="flex gap-2 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {([
              { id: 'user' as const, label: 'Jogador', icon: User },
              { id: 'admin' as const, label: 'Admin', icon: Shield },
              { id: 'superadmin' as const, label: 'ADM Criador', icon: Crown },
            ]).map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setEmail(''); setPassword(''); setClanAdminCode(''); }}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg font-display text-xs transition-all ${
                  mode === tab.id
                    ? tab.id === 'superadmin' ? 'bg-gold/10 border border-gold/50 text-gold'
                      : tab.id === 'admin' ? 'bg-primary/10 neon-border text-primary'
                      : 'bg-secondary border border-border text-foreground'
                    : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* REGISTER SELECT - Choose registration type */}
        {mode === 'register-select' && (
          <div className="space-y-3 rounded-lg p-6 bg-card/80 backdrop-blur-xl border border-border animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users size={20} className="text-foreground" />
              <h2 className="font-heading text-sm text-foreground">ESCOLHA SEU TIPO DE CONTA</h2>
            </div>

            <button type="button" onClick={() => setMode('register-player')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 bg-secondary/50 hover:bg-secondary transition-all group">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <User size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm text-foreground">JOGADOR</p>
                <p className="text-[10px] text-muted-foreground font-display">Entrar em um clã existente como jogador</p>
              </div>
            </button>

            <button type="button" onClick={() => setMode('register-leader')}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all group">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield size={22} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="font-heading text-sm text-primary">LÍDER DE CLÃ / LINE</p>
                <p className="text-[10px] text-muted-foreground font-display">Criar e administrar seu próprio clã</p>
              </div>
            </button>

            <button type="button" onClick={() => setMode('user')}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs font-display transition-colors mt-2">
              <ArrowLeft size={14} /> Voltar ao login
            </button>
          </div>
        )}

        {/* FORMS */}
        {mode !== 'register-select' && (
          <form onSubmit={handleSubmit} className={`space-y-4 rounded-lg p-6 bg-card/80 backdrop-blur-xl animate-slide-up max-h-[70vh] overflow-y-auto ${
            mode === 'superadmin' ? 'border border-gold/30' : mode === 'admin' || mode === 'register-leader' ? 'neon-border' : 'border border-border'
          }`} style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <current.icon size={20} className={current.color} />
              <h2 className={`font-heading text-sm ${current.color}`}>{current.title}</h2>
            </div>

            {mode === 'superadmin' && <p className="text-xs text-center text-gold/60 font-display">Acesso exclusivo do criador da plataforma</p>}
            {mode === 'admin' && <p className="text-xs text-center text-primary/60 font-display">Acesso para administradores de clã</p>}

            {/* FORGOT PASSWORD FLOW */}
            {mode === 'forgot' && (
              <>
                {forgotStep === 'email' && (
                  <>
                    <p className="text-xs text-center text-muted-foreground font-display">Digite o email da sua conta para receber o código de recuperação</p>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
                      <input type="email" placeholder="Seu email" value={email} onChange={e => setEmail(e.target.value)} required className={`${inputClass} pl-10`} />
                    </div>
                  </>
                )}
                {forgotStep === 'code' && (
                  <>
                    <p className="text-xs text-center text-muted-foreground font-display">Digite o código de 6 dígitos enviado para <span className="text-primary">{email}</span></p>
                    <input type="text" placeholder="Código de 6 dígitos" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} required maxLength={6}
                      className={`${inputClass} text-center tracking-[0.5em] text-lg`} />
                  </>
                )}
                {forgotStep === 'newpass' && (
                  <>
                    <p className="text-xs text-center text-muted-foreground font-display">Crie sua nova senha</p>
                    <div className="relative">
                      <input type={showNewPassword ? 'text' : 'password'} placeholder="Nova senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirmar nova senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </>
                )}
                <button type="submit" className="w-full py-3 font-heading text-sm rounded gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                  {forgotStep === 'email' ? 'ENVIAR CÓDIGO' : forgotStep === 'code' ? 'VERIFICAR' : 'ALTERAR SENHA'}
                </button>
                <button type="button" onClick={() => { setMode('user'); setForgotStep('email'); }}
                  className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs font-display transition-colors">
                  <ArrowLeft size={14} /> Voltar ao login
                </button>
              </>
            )}

            {/* REGISTER FORMS */}
            {isRegisterMode && (
              <>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className={inputClass} />
                <input type="text" placeholder="Nick do Jogo" value={gameNick} onChange={e => setGameNick(e.target.value)} required className={inputClass} />
                <input type="text" placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className={inputClass} />

                {/* Player: select clan */}
                {mode === 'register-player' && (
                  <div className="border border-border rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-heading text-foreground">
                      <Users size={14} /> SELECIONE SEU CLÃ
                    </div>
                    <select value={selectedClanId} onChange={e => setSelectedClanId(e.target.value)}
                      className={`${inputClass} text-sm`}>
                      <option value="">Selecione o clã</option>
                      {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground font-display">Selecione o clã do qual você faz parte</p>
                  </div>
                )}

                {/* Leader: create clan */}
                {mode === 'register-leader' && (
                  <div className="border border-primary/30 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-heading text-primary">
                      <Shield size={14} /> CRIAR MEU CLÃ
                    </div>
                    <input type="text" placeholder="Nome do Clã" value={newClanName} onChange={e => setNewClanName(e.target.value)} required className={inputClass} />
                    <input type="text" placeholder="Código de Admin (mín. 4 caracteres)" value={newClanAdminCode} onChange={e => setNewClanAdminCode(e.target.value)} required className={inputClass} />
                    <p className="text-[10px] text-muted-foreground font-display">Crie um código secreto para acessar o painel Admin do seu clã</p>
                  </div>
                )}


                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" className="w-full py-3 font-heading text-sm rounded gradient-primary text-primary-foreground hover:opacity-90 transition-all">
                  REGISTRAR
                </button>

                <button type="button" onClick={() => setMode('register-select')}
                  className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs font-display transition-colors">
                  <ArrowLeft size={14} /> Escolher outro tipo
                </button>

                <p className="text-center text-muted-foreground text-xs font-display">
                  Já tem conta?{' '}<button type="button" onClick={() => setMode('user')} className="text-primary hover:text-neon-glow transition-colors">Fazer Login</button>
                </p>
              </>
            )}

            {/* LOGIN FORMS */}
            {isLoginMode && (
              <>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {mode === 'admin' && (
                  <input type="text" placeholder="Código do Admin do Clã" value={clanAdminCode} onChange={e => setClanAdminCode(e.target.value)} required
                    className={`${inputClass} border-primary/30`} />
                )}

                <button type="submit" className={`w-full py-3 font-heading text-sm rounded transition-all ${
                  mode === 'superadmin'
                    ? 'bg-gradient-to-r from-gold/80 to-gold text-background hover:from-gold hover:to-gold/90 shadow-[0_0_20px_hsl(45,100%,50%,0.3)]'
                    : mode === 'admin'
                    ? 'gradient-primary text-primary-foreground box-glow hover:box-glow-lg'
                    : 'gradient-primary text-primary-foreground hover:opacity-90'
                }`}>
                  ENTRAR
                </button>

                {(mode === 'user' || mode === 'admin') && (
                  <button type="button" onClick={() => { setMode('forgot'); setForgotStep('email'); setEmail(''); }}
                    className="w-full text-center text-xs text-primary/70 hover:text-primary font-display transition-colors flex items-center justify-center gap-1">
                    <KeyRound size={12} /> Esqueci minha senha
                  </button>
                )}

                {mode !== 'superadmin' && (
                  <p className="text-center text-muted-foreground text-xs font-display">
                    Não tem conta?{' '}<button type="button" onClick={() => setMode('register-select')} className="text-primary hover:text-neon-glow transition-colors">Registrar</button>
                  </p>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
