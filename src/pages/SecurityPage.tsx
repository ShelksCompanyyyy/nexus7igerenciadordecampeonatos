import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Shield, KeyRound, LogOut, History, AlertTriangle, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface SecurityEvent { id: string; event_type: string; description: string | null; created_at: string; metadata: any }

export default function SecurityPage() {
  const { user, profile, logout } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('security_events').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setEvents((data as any) || []));
  }, [user]);

  const logEvent = async (event_type: string, description: string) => {
    if (!user) return;
    await supabase.from('security_events').insert({
      user_id: user.id, event_type, description,
      user_agent: navigator.userAgent.slice(0, 200),
    });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return toast.error('Mínimo 6 caracteres');
    if (newPassword !== confirmPassword) return toast.error('Senhas não coincidem');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) return toast.error(error.message);
    await logEvent('password_change', 'Senha alterada com sucesso');
    toast.success('Senha alterada!');
    setNewPassword(''); setConfirmPassword('');
  };

  const handleResetByEmail = async () => {
    if (!profile?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    if (error) return toast.error(error.message);
    await logEvent('password_reset_request', 'Solicitou reset de senha por email');
    toast.success('Email enviado!');
  };

  const handleLogoutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    await logEvent('logout_all', 'Encerrou todas as sessões');
    toast.success('Todas as sessões encerradas');
    logout();
  };

  const eventLabel = (t: string) => ({
    password_change: { label: 'Senha alterada', color: 'text-yellow-400' },
    password_reset_request: { label: 'Reset solicitado', color: 'text-blue-400' },
    logout_all: { label: 'Logout global', color: 'text-orange-400' },
    login: { label: 'Login', color: 'text-green-400' },
    withdraw: { label: 'Saque', color: 'text-gold' },
    purchase: { label: 'Compra', color: 'text-purple-400' },
    role_change: { label: 'Mudança de cargo', color: 'text-pink-400' },
  }[t] || { label: t, color: 'text-muted-foreground' });

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-2">
        <Shield size={24} /> SEGURANÇA
      </h1>

      {/* Trocar senha */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-heading text-primary text-sm flex items-center gap-2">
          <KeyRound size={16} /> Trocar Senha
        </h3>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="Nova senha" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirmar nova senha" className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-display" />
        <div className="flex gap-2">
          <button onClick={handleChangePassword} disabled={loading}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded font-heading text-sm disabled:opacity-50">
            {loading ? '...' : 'Alterar'}
          </button>
          <button onClick={handleResetByEmail}
            className="flex-1 border border-border py-2 rounded font-display text-sm flex items-center justify-center gap-1">
            <Mail size={14} /> Reset por email
          </button>
        </div>
      </div>

      {/* Sessões */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-heading text-primary text-sm flex items-center gap-2">
          <LogOut size={16} /> Sessões Ativas
        </h3>
        <p className="text-xs font-display text-muted-foreground">
          Sessão atual: {navigator.userAgent.slice(0, 80)}...
        </p>
        <button onClick={handleLogoutAll}
          className="w-full bg-destructive/20 border border-destructive/40 text-destructive py-2 rounded font-heading text-sm">
          Encerrar todas as sessões
        </button>
      </div>

      {/* Histórico */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="font-heading text-primary text-sm flex items-center gap-2">
          <History size={16} /> Log de Ações Sensíveis
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground font-display">Nenhum evento registrado.</p>
        ) : (
          events.map(e => {
            const meta = eventLabel(e.event_type);
            return (
              <div key={e.id} className="border-b border-border/30 pb-2 text-xs font-display">
                <div className="flex items-center justify-between">
                  <span className={`font-heading ${meta.color}`}>{meta.label}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                </div>
                {e.description && <p className="text-muted-foreground mt-0.5">{e.description}</p>}
              </div>
            );
          })
        )}
      </div>

      {/* Avisos */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex gap-2">
        <AlertTriangle className="text-yellow-400 shrink-0" size={16} />
        <p className="text-[11px] font-display text-yellow-200">
          Nunca compartilhe sua senha. A equipe Nexel jamais pedirá seus dados de acesso.
        </p>
      </div>
    </div>
  );
}