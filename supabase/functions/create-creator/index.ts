import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Create the creator user
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: 'shelksdev@gmail.com',
    password: '@ShelksDev007',
    email_confirm: true,
    user_metadata: {
      username: 'ShelksDev',
      game_nick: 'ShelksDev',
      whatsapp: '',
      role: 'superadmin',
    }
  })

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ user_id: userData.user?.id, message: 'Creator account created' }), { 
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  })
})
