import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PACKAGES: Record<string, { spins: number; bonus: number; amount: number; label: string }> = {
  pkg_3: { spins: 3, bonus: 0, amount: 3.9, label: "3 giros" },
  pkg_5: { spins: 5, bonus: 0, amount: 5.9, label: "5 giros" },
  pkg_8: { spins: 8, bonus: 2, amount: 10.9, label: "8 + 2 bônus" },
  pkg_9: { spins: 9, bonus: 3, amount: 15.9, label: "9 + 3 bônus" },
  pkg_10: { spins: 10, bonus: 4, amount: 23.9, label: "10 + 4 bônus" },
  pkg_15: { spins: 15, bonus: 5, amount: 32.9, label: "15 + 5 bônus" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!MP_TOKEN) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supaUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: ce } = await supaUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (ce || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) || `user-${userId}@nexel.app`;

    const body = await req.json();
    const pkg = PACKAGES[body.package_id];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Pacote inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // 1) cria registro pendente para obter UUID externo
    const { data: paymentRow, error: insErr } = await supaAdmin
      .from("mp_payments")
      .insert({
        user_id: userId,
        amount_brl: pkg.amount,
        spins: pkg.spins,
        bonus_spins: pkg.bonus,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // 2) chama MP
    const idempotencyKey = crypto.randomUUID();
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: pkg.amount,
        description: `Lucky Nexel — ${pkg.label}`,
        payment_method_id: "pix",
        external_reference: paymentRow.id,
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
        payer: { email: userEmail },
      }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      await supaAdmin.from("mp_payments").update({ status: "rejected" }).eq("id", paymentRow.id);
      throw new Error(`Mercado Pago: ${JSON.stringify(mpData)}`);
    }

    const qr = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrB64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const ticket = mpData.point_of_interaction?.transaction_data?.ticket_url;

    await supaAdmin.from("mp_payments").update({
      mp_payment_id: String(mpData.id),
      qr_code: qr,
      qr_code_base64: qrB64,
      ticket_url: ticket,
    }).eq("id", paymentRow.id);

    await supaAdmin.from("lucky_audit").insert({
      user_id: userId,
      action: "payment_create",
      details: { payment_id: paymentRow.id, mp_id: mpData.id, amount: pkg.amount },
    });

    return new Response(JSON.stringify({
      payment_id: paymentRow.id,
      mp_payment_id: mpData.id,
      qr_code: qr,
      qr_code_base64: qrB64,
      ticket_url: ticket,
      amount: pkg.amount,
      spins: pkg.spins + pkg.bonus,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mp-create-pix error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});