import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Tenta executar saque PIX via Mercado Pago Money Out API.
 * IMPORTANTE: a conta MP precisa ter "Pagamentos PIX" / Money Out homologado.
 * Se não tiver, marcamos como "processing" e o admin paga manualmente; o saldo
 * permanece debitado (escrow) até o admin confirmar via painel.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { pix_key, pix_key_type, beneficiary_name, amount } = await req.json();
    if (!pix_key || !beneficiary_name || !amount) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Number(amount) < 50) {
      return new Response(JSON.stringify({ error: "Saque mínimo R$ 50" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria registro de saque (com escrow / debita saldo)
    const supaUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: created, error: rpcErr } = await supaUserClient.rpc("request_pix_withdrawal", {
      _pix_key: pix_key,
      _pix_key_type: pix_key_type ?? "random",
      _beneficiary_name: beneficiary_name,
      _amount: Number(amount),
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payoutId = (created as any).payout_id;

    const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    await supaAdmin.from("mp_payouts").update({ status: "processing" }).eq("id", payoutId);

    // Tenta API Money Out PIX
    try {
      const mpRes = await fetch("https://api.mercadopago.com/v1/money_requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": payoutId,
        },
        body: JSON.stringify({
          amount: Number(amount),
          description: `Saque Lucky Nexel — ${userId.slice(0, 8)}`,
          payment_method_id: "pix",
          payer: { type: "customer", id: userId },
          receiver: {
            type: "pix",
            pix: { key: pix_key, key_type: pix_key_type ?? "random", name: beneficiary_name },
          },
        }),
      });
      const mp = await mpRes.json();
      if (mpRes.ok && (mp.status === "approved" || mp.status === "in_process")) {
        if (mp.status === "approved") {
          await supaAdmin.rpc("confirm_paid_payout", { _payout_id: payoutId, _mp_transfer_id: String(mp.id) });
        } else {
          await supaAdmin.from("mp_payouts").update({ mp_transfer_id: String(mp.id) }).eq("id", payoutId);
        }
        return new Response(JSON.stringify({ success: true, payout_id: payoutId, status: mp.status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Falhou no MP — estorna
      const reason = mp?.message || mp?.error || "Mercado Pago rejeitou a transferência";
      await supaAdmin.rpc("refund_failed_payout", { _payout_id: payoutId, _reason: reason });
      return new Response(JSON.stringify({ error: reason, refunded: true }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (mpErr) {
      // Conta MP sem permissão Money Out → fica em processing para admin pagar manual
      console.warn("MP payout API indisponível, ficou pendente para admin:", mpErr);
      return new Response(JSON.stringify({
        success: true,
        payout_id: payoutId,
        status: "processing",
        note: "Saque será processado pelo admin em breve",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("mp-payout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});