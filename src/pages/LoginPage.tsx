import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import nexusLogo from '@/assets/nexus7i-logo.png';
import { Shield, Crown, User, KeyRound, ArrowLeft, Mail, Users, Eye, EyeOff } from 'lucide-react';
import { useClans } from '@/hooks/useSupabaseData';
import { addClan, updateProfileByUserId, updateUserRole } from '@/lib/supabaseStore';

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
  const [submitting, setSubmitting] = useState(false);

  const { data: clans } = useClans();
  const isRegisterMode = mode === 'register-player' || mode === 'register-leader';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'register-player') {
        if (!selectedClanId) { toast.error('Selecione seu clã'); return; }
        await register({ username, email, password, gameNick, whatsapp, clanId: selectedClanId });
        toast.success('Conta de jogador criada com sucesso!');
        return;
      }

      if (mode === 'register-leader') {
        if (!newClanName.trim()) { toast.error('Digite o nome do clã'); return; }
        if (!newClanAdminCode.trim() || newClanAdminCode.length < 4) { toast.error('Crie um código de admin com no mínimo 4 caracteres'); return; }
        const u = await register({ username, email, password, gameNick, whatsapp, role: 'admin' });
        const clan = await addClan({ name: newClanName.trim(), description: '', ownerId: u.userId, adminCode: newClanAdminCode.trim() });
        if (clan) {
          await updateProfileByUserId(u.userId, { clanId: clan.id });
        }
        toast.success('Clã criado e conta de Líder registrada!');
        return;
      }

      if (mode === 'admin') {
        const user = await login(email, password);
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
        }
      } else if (mode === 'superadmin') {
        const user = await login(email, password);
        if (user) {
          if (user.role !== 'superadmin') {
            toast.error('Credenciais de ADM Criador inválidas');
            return;
          }
          toast.success(`Bem-vindo, ${user.username}!`);
        }
      } else {
        const user = await login(email, password);
        if (user) {
          toast.success(`Bem-vindo, ${user.username}!`);
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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

        {mode !== 'register-select' && mode !== 'forgot' && (
          <form onSubmit={handleSubmit} className={`space-y-4 rounded-lg p-6 bg-card/80 backdrop-blur-xl animate-slide-up max-h-[70vh] overflow-y-auto ${
            mode === 'superadmin' ? 'border border-gold/30' : mode === 'admin' || mode === 'register-leader' ? 'neon-border' : 'border border-border'
          }`} style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <current.icon size={20} className={current.color} />
              <h2 className={`font-heading text-sm ${current.color}`}>{current.title}</h2>
            </div>

            {mode === 'superadmin' && <p className="text-xs text-center text-gold/60 font-display">Acesso exclusivo do criador da plataforma</p>}
            {mode === 'admin' && <p className="text-xs text-center text-primary/60 font-display">Acesso para administradores de clã</p>}

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
              </>
            )}

            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className={`${inputClass} pr-10`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === 'admin' && (
              <input type="text" placeholder="Código de Admin do Clã" value={clanAdminCode} onChange={e => setClanAdminCode(e.target.value)} required className={`${inputClass} border-primary/50`} />
            )}

            <button type="submit" disabled={submitting}
              className={`w-full py-3 font-heading text-sm rounded transition-all disabled:opacity-50 ${
                mode === 'superadmin' ? 'bg-gradient-to-r from-gold/80 to-gold text-background' : 'gradient-primary text-primary-foreground hover:opacity-90'
              }`}>
              {submitting ? 'AGUARDE...' : isRegisterMode ? 'CRIAR CONTA' : 'ENTRAR'}
            </button>

            {isLoginMode && (
              <button type="button" onClick={() => setMode('register-select')}
                className="w-full text-center text-muted-foreground hover:text-foreground text-xs font-display transition-colors">
                Não tem conta? <span className="text-primary">Criar conta</span>
              </button>
            )}

            {isRegisterMode && (
              <button type="button" onClick={() => setMode('user')}
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs font-display transition-colors">
                <ArrowLeft size={14} /> Voltar ao login
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
