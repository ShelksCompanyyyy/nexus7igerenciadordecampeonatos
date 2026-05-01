import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-signature, x-request-id, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    // Suporta dois formatos: { type: 'payment', data: { id } } ou query ?topic=payment&id=...
    const paymentId =
      body?.data?.id ||
      body?.resource?.split?.("/").pop() ||
      url.searchParams.get("id") ||
      url.searchParams.get("data.id");
    const topic = body?.type || body?.topic || url.searchParams.get("topic");

    if (!paymentId || (topic && !String(topic).includes("payment"))) {
      return new Response("ignored", { status: 200, headers: corsHeaders });
    }

    // Busca status real no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) throw new Error(`MP fetch fail: ${JSON.stringify(mp)}`);

    const externalRef = mp.external_reference;
    if (!externalRef) {
      console.warn("Payment without external_reference", paymentId);
      return new Response("no-ref", { status: 200, headers: corsHeaders });
    }

    if (mp.status === "approved") {
      const { error } = await supa.rpc("credit_spins_after_payment", { _payment_id: externalRef });
      if (error) console.error("credit error", error);
    } else if (mp.status === "rejected" || mp.status === "cancelled") {
      await supa.from("mp_payments").update({ status: "rejected" }).eq("id", externalRef);
    }

    return new Response(JSON.stringify({ ok: true, status: mp.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});