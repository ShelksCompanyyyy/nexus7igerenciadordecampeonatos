// Edge function: admin exclui conta de usuário (apenas Criador/superadmin)
// Usa SERVICE_ROLE para apagar do auth.users
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Cliente para validar caller
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const callerId = userData.user.id;

    // Confirma role superadmin
    const { data: roleRow } = await userClient.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'superadmin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Apenas o Criador pode excluir contas' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string = body.user_id;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return new Response(JSON.stringify({ error: 'user_id obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir a si mesmo' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Limpar tabelas relacionadas
    await admin.from('clan_members').delete().eq('user_id', targetUserId);
    await admin.from('friends').delete().or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);
    await admin.from('notifications').delete().eq('user_id', targetUserId);
    await admin.from('spins').delete().eq('user_id', targetUserId);
    await admin.from('spin_purchases').delete().eq('user_id', targetUserId);
    await admin.from('withdrawals').delete().eq('user_id', targetUserId);
    await admin.from('promo_code_redemptions').delete().eq('user_id', targetUserId);
    await admin.from('chat_messages').delete().eq('user_id', targetUserId);
    await admin.from('user_roles').delete().eq('user_id', targetUserId);
    await admin.from('economy').delete().eq('user_id', targetUserId);
    await admin.from('profiles').delete().eq('user_id', targetUserId);

    // Apagar do auth
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
