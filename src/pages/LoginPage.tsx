import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus7i-logo.png';
import { Shield, Crown, User, KeyRound, ArrowLeft, Mail, Users, Eye, EyeOff } from 'lucide-react';

type LoginMode = 'user' | 'admin' | 'superadmin' | 'register-player' | 'register-leader' | 'forgot' | 'register-select';

interface ClanOption {
  id: string;
  name: string;
  admin_code: string | null;
}

export default function LoginPage() {
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState<LoginMode>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [creatorCode, setCreatorCode] = useState('');
  const [gameNick, setGameNick] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedClanId, setSelectedClanId] = useState('');
  const [newClanName, setNewClanName] = useState('');
  const [clanAdminCode, setClanAdminCode] = useState('');
  const [newClanAdminCode, setNewClanAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forgot password states
  const [forgotStep, setForgotStep] = useState<'email' | 'sent'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Clans from DB
  const [clans, setClans] = useState<ClanOption[]>([]);

  useEffect(() => {
    supabase.from('clans').select('id, name, admin_code').then(({ data }) => {
      if (data) setClans(data);
    });
  }, []);

  const isRegisterMode = mode === 'register-player' || mode === 'register-leader';
  const isLoginMode = mode === 'user' || mode === 'admin' || mode === 'superadmin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        await handleForgotPassword();
        return;
      }

      if (mode === 'register-player') {
        if (!selectedClanId) { toast.error('Selecione seu clã'); return; }
        const result = await register({
          username, email, password, gameNick, whatsapp,
          clanId: selectedClanId,
          role: 'user',
        });
        if (result.error) { toast.error(result.error); return; }
        toast.success('Conta de jogador criada com sucesso!');
        return;
      }

      if (mode === 'register-leader') {
        if (!newClanName.trim()) { toast.error('Digite o nome do clã'); return; }
        if (!newClanAdminCode.trim() || newClanAdminCode.length < 4) {
          toast.error('Crie um código de admin com no mínimo 4 caracteres');
          return;
        }

        // Register the user first with admin role
        const result = await register({
          username, email, password, gameNick, whatsapp,
          role: 'admin',
        });
        if (result.error) { toast.error(result.error); return; }

        // Wait a bit for trigger to create profile, then create clan
        await new Promise(r => setTimeout(r, 500));

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !authUser.id) { toast.error('Erro ao criar conta — usuário não autenticado'); return; }

        // Create the clan
        const { data: clan, error: clanError } = await supabase
          .from('clans')
          .insert({
            name: newClanName.trim(),
            owner_id: authUser.id,
            admin_code: newClanAdminCode.trim(),
          })
          .select()
          .single();

        if (clanError) { toast.error('Erro ao criar clã: ' + clanError.message); return; }

        // Update the profile with the clan_id
        await supabase
          .from('profiles')
          .update({ clan_id: clan.id })
          .eq('user_id', authUser.id);

        toast.success('Clã criado e conta de Líder registrada!');
        return;
      }

      // Login flows
      if (mode === 'admin') {
        const result = await login(email, password);
        if (result.error) { toast.error(result.error); return; }

        // Verify admin role and clan code
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id)
          .single();

        if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin')) {
          toast.error('Esta conta não tem permissão de Admin');
          await supabase.auth.signOut();
          return;
        }

        if (roleData.role === 'admin') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('clan_id')
            .eq('user_id', authUser.id)
            .single();

          if (profileData?.clan_id) {
            const clan = clans.find(c => c.id === profileData.clan_id);
            if (!clan || clan.admin_code !== clanAdminCode) {
              toast.error('Código de admin do clã inválido');
              await supabase.auth.signOut();
              return;
            }
          }
        }

        toast.success('Bem-vindo, Admin!');
        return;
      }

      if (mode === 'superadmin') {
        const CREATOR_CODE = 'Nexus7i007';
        if (creatorCode !== CREATOR_CODE) {
          toast.error('Código de acesso do Criador inválido');
          return;
        }

        const result = await login(email, password);
        if (result.error) { toast.error(result.error); return; }

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id)
          .single();

        if (!roleData || roleData.role !== 'superadmin') {
          toast.error('Acesso negado. Esta conta não é do Criador.');
          await supabase.auth.signOut();
          return;
        }

        toast.success('Bem-vindo, Criador!');
        return;
      }

      // Regular user login
      const result = await login(email, password);
      if (result.error) {
        toast.error('Email ou senha incorretos');
        return;
      }
      toast.success('Bem-vindo!');

    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (forgotStep === 'email') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { toast.error(error.message); return; }
      setForgotStep('sent');
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-heading text-lg">Carregando...</div>
      </div>
    );
  }

  const modeConfig: Record<LoginMode, { title: string; icon: any; color: string }> = {
    user: { title: 'LOGIN PARA JOGADOR', icon: User, color: 'text-foreground' },
    admin: { title: 'LOGIN PARA LÍDERES DE CLÃS E LINES', icon: Shield, color: 'text-primary' },
    superadmin: { title: 'LOGIN PARA CRIADOR', icon: Crown, color: 'text-gold' },
    'register-player': { title: 'REGISTRO JOGADOR', icon: User, color: 'text-foreground' },
    'register-leader': { title: 'REGISTRO LÍDER DE CLÃ', icon: Shield, color: 'text-primary' },
    'register-select': { title: 'CRIAR CONTA', icon: Users, color: 'text-foreground' },
    forgot: { title: 'RECUPERAR SENHA', icon: KeyRound, color: 'text-primary' },
  };

  const current = modeConfig[mode];
  const inputClass = "w-full p-3 bg-secondary rounded border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground font-display";

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

        {/* Login tabs */}
        {isLoginMode && (
          <div className="flex gap-2 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {([
              { id: 'user' as const, label: 'Jogador', icon: User },
              { id: 'admin' as const, label: 'Líderes', icon: Shield },
              { id: 'superadmin' as const, label: 'Criador', icon: Crown },
            ]).map(tab => (
              <button key={tab.id} onClick={() => { setMode(tab.id); setEmail(''); setPassword(''); setClanAdminCode(''); setCreatorCode(''); }}
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

        {/* REGISTER SELECT */}
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

            {/* FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <>
                {forgotStep === 'email' && (
                  <>
                    <p className="text-xs text-center text-muted-foreground font-display">Digite o email da sua conta para receber o link de recuperação</p>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
                      <input type="email" placeholder="Seu email" value={email} onChange={e => setEmail(e.target.value)} required className={`${inputClass} pl-10`} />
                    </div>
                    <button type="submit" disabled={submitting} className="w-full py-3 font-heading text-sm rounded gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                      {submitting ? 'ENVIANDO...' : 'ENVIAR LINK'}
                    </button>
                  </>
                )}
                {forgotStep === 'sent' && (
                  <p className="text-xs text-center text-primary font-display">
                    ✅ Link de recuperação enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
                  </p>
                )}
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

                {mode === 'register-player' && (
                  <div className="border border-border rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-heading text-foreground">
                      <Users size={14} /> SELECIONE SEU CLÃ
                    </div>
                    <select value={selectedClanId} onChange={e => setSelectedClanId(e.target.value)} className={`${inputClass} text-sm`}>
                      <option value="">Selecione o clã</option>
                      {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground font-display">Selecione o clã do qual você faz parte</p>
                  </div>
                )}

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
                  <input type={showPassword ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={submitting} className="w-full py-3 font-heading text-sm rounded gradient-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  {submitting ? 'REGISTRANDO...' : 'REGISTRAR'}
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

                <button type="submit" disabled={submitting} className={`w-full py-3 font-heading text-sm rounded transition-all disabled:opacity-50 ${
                  mode === 'superadmin'
                    ? 'bg-gradient-to-r from-gold/80 to-gold text-background hover:from-gold hover:to-gold/90 shadow-[0_0_20px_hsl(45,100%,50%,0.3)]'
                    : mode === 'admin'
                    ? 'gradient-primary text-primary-foreground box-glow hover:box-glow-lg'
                    : 'gradient-primary text-primary-foreground hover:opacity-90'
                }`}>
                  {submitting ? 'ENTRANDO...' : 'ENTRAR'}
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
