const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    const m = String(url || "").match(/reservation\/([0-9a-f-]{36})/i);
    if (!m) {
      return new Response(JSON.stringify({ error: "Link Bondi inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const r = await fetch(`https://pluto-production-43ef.up.railway.app/orders/${m[1]}`, {
      headers: { Origin: "https://dashboard.bondi.com.br", Accept: "application/json" },
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
