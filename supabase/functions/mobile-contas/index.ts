import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function validateToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("mobile_access_tokens")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  // Update last_used_at
  await supabaseAdmin
    .from("mobile_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-mobile-token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await validateToken(token);
    if (!tokenData) {
      return new Response(JSON.stringify({ error: "Token inválido ou desativado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = tokenData.created_by;

    // GET - list contas_pagar (recent, pending)
    if (req.method === "GET") {
      const action = url.searchParams.get("action");

      if (action === "fornecedores") {
        const { data } = await supabaseAdmin
          .from("fornecedores")
          .select("razao_social")
          .order("razao_social");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "centros_custo") {
        const { data } = await supabaseAdmin
          .from("centros_custo")
          .select("id, nome")
          .order("nome");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "subgrupos_custo") {
        const centroId = url.searchParams.get("centro_id");
        let query = supabaseAdmin.from("subgrupos_custo").select("id, nome, centro_custo_id").order("nome");
        if (centroId) query = query.eq("centro_custo_id", centroId);
        const { data } = await query;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "veiculos") {
        const { data } = await supabaseAdmin
          .from("veiculos")
          .select("placa, modelo")
          .order("placa");
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: list pending contas
      const { data, error } = await supabaseAdmin
        .from("contas_pagar")
        .select("*")
        .in("status", ["pendente", "parcial"])
        .order("data_vencimento", { ascending: true, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - create new conta or update (baixa)
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "create") {
        const { fornecedor, descritivo, valor, data_vencimento, centro_custo, subgrupo_custo, placa } = body;

        if (!fornecedor || !valor) {
          return new Response(JSON.stringify({ error: "Fornecedor e valor são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabaseAdmin
          .from("contas_pagar")
          .insert({
            user_id: userId,
            fornecedor: String(fornecedor).trim(),
            descritivo: String(descritivo || "").trim(),
            valor: Number(valor),
            data: new Date().toISOString().split("T")[0],
            data_vencimento: data_vencimento || null,
            centro_custo: centro_custo || "",
            subgrupo_custo: subgrupo_custo || "",
            placa: placa || "",
            status: "pendente",
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "baixa") {
        const { id, valor_pago, data_pagamento } = body;
        if (!id) {
          return new Response(JSON.stringify({ error: "ID obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get current conta
        const { data: conta } = await supabaseAdmin
          .from("contas_pagar")
          .select("*")
          .eq("id", id)
          .single();

        if (!conta) {
          return new Response(JSON.stringify({ error: "Conta não encontrada" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const pago = Number(valor_pago || conta.valor);
        const totalPago = Number(conta.valor_pago) + pago;
        const newStatus = totalPago >= Number(conta.valor) ? "pago" : "parcial";

        const { data, error } = await supabaseAdmin
          .from("contas_pagar")
          .update({
            valor_pago: totalPago,
            data_pagamento: data_pagamento || new Date().toISOString().split("T")[0],
            status: newStatus,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Ação inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
