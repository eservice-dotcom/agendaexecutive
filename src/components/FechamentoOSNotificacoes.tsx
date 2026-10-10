import { useEffect, useMemo, useState } from "react";
import { FileCheck2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Notifica apenas O.S. cujo último serviço ocorreu a partir desta data (evita inundar com histórico).
const INICIO_NOTIFICACOES = "2026-10-01";

const toISO = (d: any): string => {
  if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const fmtBR = (iso: string) => iso.split("-").reverse().join("/");

export function FechamentoOSNotificacoes({ items }: { items: any[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("fechamento_notificacoes_dispensadas").select("cot").then(({ data }) => {
      setDismissed(new Set((data || []).map((r: any) => r.cot)));
      setLoaded(true);
    });
  }, []);

  // Serviços já sinalizados com fechamento enviado (setinha "Enviado" ou "Faturado") não geram notificação.
  const fechamentoEnviado = (i: any) => String(i.statusFaturamento ?? i.status_faturamento ?? "").trim() !== "";

  const pendentes = useMemo(() => {
    const now = new Date();
    const hoje = new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10); // São Paulo
    const map = new Map<string, { cot: string; cliente: string; ultima: string; qtd: number; semFechamento: number }>();
    for (const i of items) {
      if (i.deleted_at || i.deletedAt) continue;
      const cot = String(i.cot ?? "").trim();
      const data = toISO(i.data);
      if (!cot || !data) continue;
      const enviado = fechamentoEnviado(i);
      const cur = map.get(cot);
      if (!cur) map.set(cot, { cot, cliente: i.cliente || "", ultima: data, qtd: 1, semFechamento: enviado ? 0 : 1 });
      else {
        cur.qtd++;
        if (!enviado) cur.semFechamento++;
        if (data > cur.ultima) cur.ultima = data;
      }
    }
    return [...map.values()]
      .filter((o) => {
        if (o.semFechamento === 0) return false; // todos os serviços já com fechamento enviado
        if (o.ultima < INICIO_NOTIFICACOES || dismissed.has(o.cot)) return false;
        const d = new Date(o.ultima + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        return hoje >= d.toISOString().slice(0, 10);
      })
      .sort((a, b) => a.ultima.localeCompare(b.ultima));
  }, [items, dismissed]);


  const dispensar = async (cot: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setDismissed((p) => new Set(p).add(cot));
    const { error } = await supabase
      .from("fechamento_notificacoes_dispensadas")
      .insert({ cot, dismissed_by: u.user.id });
    if (error && !error.message.includes("duplicate")) {
      toast.error("Não foi possível remover a notificação");
      setDismissed((p) => { const n = new Set(p); n.delete(cot); return n; });
    }
  };

  if (!loaded || pendentes.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <FileCheck2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Enviar fechamento ao cliente — {pendentes.length} O.S. finalizada(s)
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pendentes.map((o) => (
          <span
            key={o.cot}
            className="inline-flex items-center gap-1.5 text-xs pl-2 pr-1 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700"
          >
            <span>
              O.S. <b>{o.cot}</b> · {o.cliente} · último serviço {fmtBR(o.ultima)} ({o.qtd})
            </span>
            <button
              onClick={() => dispensar(o.cot)}
              title="Fechamento enviado — remover notificação"
              className="rounded p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
