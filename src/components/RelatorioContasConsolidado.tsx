import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";

interface ContaItem {
  id: string;
  tipo: "pagar" | "receber";
  descritivo: string;
  valor: number;
  valor_pago: number;
  data: string;
  data_vencimento: string | null;
  status: string;
  entidade: string;
  placa?: string;
  centro?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export default function RelatorioContasConsolidado() {
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: cp }, { data: cr }] = await Promise.all([
      supabase.from("contas_pagar").select("*").order("data_vencimento", { ascending: true, nullsFirst: false }),
      supabase.from("contas_receber").select("*").order("data_vencimento", { ascending: true, nullsFirst: false }),
    ]);
    setContasPagar(cp || []);
    setContasReceber(cr || []);
  };

  const processedPagar = useMemo((): ContaItem[] => {
    return contasPagar.map((c) => ({
      id: c.id,
      tipo: "pagar" as const,
      descritivo: c.descritivo,
      valor: Number(c.valor),
      valor_pago: Number(c.valor_pago),
      data: c.data,
      data_vencimento: c.data_vencimento,
      status: c.status,
      entidade: c.fornecedor,
      placa: c.placa || "",
      centro: c.centro_custo || "",
    }));
  }, [contasPagar]);

  const processedReceber = useMemo((): ContaItem[] => {
    return contasReceber.map((c) => ({
      id: c.id,
      tipo: "receber" as const,
      descritivo: c.descritivo,
      valor: Number(c.valor),
      valor_pago: Number(c.valor_pago),
      data: c.data,
      data_vencimento: c.data_vencimento,
      status: c.status,
      entidade: c.cliente,
      centro: c.centro_receita || "",
    }));
  }, [contasReceber]);

  const filterItems = (items: ContaItem[]) => {
    return items.filter((item) => {
      if (dataInicio && item.data_vencimento && item.data_vencimento < dataInicio) return false;
      if (dataFim && item.data_vencimento && item.data_vencimento > dataFim) return false;
      if (dataInicio && !item.data_vencimento) return false;
      if (filtroStatus !== "todos") {
        if (filtroStatus === "pendente" && item.status !== "pendente") return false;
        if (filtroStatus === "pago" && item.status !== "pago" && item.status !== "recebido") return false;
        if (filtroStatus === "parcial" && item.status !== "parcial") return false;
      }
      if (busca) {
        const s = busca.toLowerCase();
        if (
          !item.descritivo.toLowerCase().includes(s) &&
          !item.entidade.toLowerCase().includes(s) &&
          !(item.placa || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  };

  const filteredPagar = useMemo(() => filterItems(processedPagar), [processedPagar, dataInicio, dataFim, busca, filtroStatus]);
  const filteredReceber = useMemo(() => filterItems(processedReceber), [processedReceber, dataInicio, dataFim, busca, filtroStatus]);

  const totalPagar = filteredPagar.reduce((s, c) => s + c.valor, 0);
  const totalPagoPagar = filteredPagar.reduce((s, c) => s + c.valor_pago, 0);
  const totalReceber = filteredReceber.reduce((s, c) => s + c.valor, 0);
  const totalPagoReceber = filteredReceber.reduce((s, c) => s + c.valor_pago, 0);

  // Agrupar por data de vencimento e alinhar lado a lado
  const alignedRows = useMemo(() => {
    const allDates = new Set<string>();
    filteredPagar.forEach((c) => allDates.add(c.data_vencimento || "sem-vencimento"));
    filteredReceber.forEach((c) => allDates.add(c.data_vencimento || "sem-vencimento"));

    const sortedDates = Array.from(allDates).sort((a, b) => {
      if (a === "sem-vencimento") return 1;
      if (b === "sem-vencimento") return -1;
      return a.localeCompare(b);
    });

    const pagarByDate = new Map<string, ContaItem[]>();
    filteredPagar.forEach((c) => {
      const key = c.data_vencimento || "sem-vencimento";
      if (!pagarByDate.has(key)) pagarByDate.set(key, []);
      pagarByDate.get(key)!.push(c);
    });

    const receberByDate = new Map<string, ContaItem[]>();
    filteredReceber.forEach((c) => {
      const key = c.data_vencimento || "sem-vencimento";
      if (!receberByDate.has(key)) receberByDate.set(key, []);
      receberByDate.get(key)!.push(c);
    });

    const rows: { date: string; pagar: ContaItem[]; receber: ContaItem[] }[] = [];
    sortedDates.forEach((date) => {
      rows.push({
        date,
        pagar: pagarByDate.get(date) || [],
        receber: receberByDate.get(date) || [],
      });
    });

    return rows;
  }, [filteredPagar, filteredReceber]);

  const statusBadge = (status: string) => {
    if (status === "pago" || status === "recebido")
      return <Badge className="bg-green-600 text-white text-[10px]">Pago</Badge>;
    if (status === "parcial")
      return <Badge className="bg-yellow-500 text-white text-[10px]">Parcial</Badge>;
    return <Badge variant="outline" className="text-[10px]">Pendente</Badge>;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const renderRows = () => {
      return alignedRows.map((row) => {
        const maxLen = Math.max(row.pagar.length, row.receber.length, 1);
        let html = "";
        for (let i = 0; i < maxLen; i++) {
          const p = row.pagar[i];
          const r = row.receber[i];
          const dateLabel = i === 0 ? (row.date === "sem-vencimento" ? "S/ Venc." : formatDate(row.date)) : "";
          html += `<tr${i === 0 ? ' style="border-top:2px solid #999;"' : ""}>
            <td style="border:1px solid #ccc;padding:3px;font-weight:${i === 0 ? "bold" : "normal"};background:${i === 0 ? "#f8f8f8" : "white"}">${dateLabel}</td>
            <td style="border:1px solid #ccc;padding:3px;">${p ? p.entidade : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;">${p ? p.descritivo : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;text-align:right;color:red;">${p ? formatCurrency(p.valor) : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;text-align:center;">${p ? p.status : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;background:#f0f0f0;"></td>
            <td style="border:1px solid #ccc;padding:3px;">${r ? r.entidade : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;">${r ? r.descritivo : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;text-align:right;color:green;">${r ? formatCurrency(r.valor) : ""}</td>
            <td style="border:1px solid #ccc;padding:3px;text-align:center;">${r ? r.status : ""}</td>
          </tr>`;
        }
        return html;
      }).join("");
    };

    printWindow.document.write(`
      <html><head><title>Relatório Contas</title></head><body style="font-family:Arial;padding:16px;">
        <h2 style="text-align:center;font-size:15px;">Relatório Consolidado — Contas a Pagar e Receber</h2>
        ${dataInicio || dataFim ? `<p style="text-align:center;font-size:11px;">Período: ${dataInicio ? formatDate(dataInicio) : "..."} a ${dataFim ? formatDate(dataFim) : "..."}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#e0e0e0;">
            <th style="border:1px solid #ccc;padding:4px;">Vencimento</th>
            <th colspan="4" style="border:1px solid #ccc;padding:4px;background:#ffe0e0;">CONTAS A PAGAR — ${formatCurrency(totalPagar)}</th>
            <th style="border:1px solid #ccc;padding:4px;width:4px;"></th>
            <th colspan="4" style="border:1px solid #ccc;padding:4px;background:#e0ffe0;">CONTAS A RECEBER — ${formatCurrency(totalReceber)}</th>
          </tr>
          <tr style="background:#f5f5f5;">
            <th style="border:1px solid #ccc;padding:3px;"></th>
            <th style="border:1px solid #ccc;padding:3px;">Fornecedor</th>
            <th style="border:1px solid #ccc;padding:3px;">Descritivo</th>
            <th style="border:1px solid #ccc;padding:3px;">Valor</th>
            <th style="border:1px solid #ccc;padding:3px;">Status</th>
            <th style="border:1px solid #ccc;padding:3px;"></th>
            <th style="border:1px solid #ccc;padding:3px;">Cliente</th>
            <th style="border:1px solid #ccc;padding:3px;">Descritivo</th>
            <th style="border:1px solid #ccc;padding:3px;">Valor</th>
            <th style="border:1px solid #ccc;padding:3px;">Status</th>
          </tr></thead>
          <tbody>${renderRows()}</tbody>
        </table>
        <div style="margin-top:16px;font-size:12px;font-weight:bold;text-align:center;">
          Saldo: ${formatCurrency(totalReceber - totalPagar)} (Receber - Pagar)
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">De</span>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-36 h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Até</span>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-36 h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Busca</span>
          <Input placeholder="Fornecedor, cliente, descritivo..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64 h-8 text-xs" />
        </div>
        <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1">
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </Button>
      </div>

      {/* TABELA CONSOLIDADA ALINHADA POR DATA */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th rowSpan={2} className="border bg-muted px-2 py-2 text-left font-semibold w-[90px]">Vencimento</th>
                <th colSpan={4} className="border bg-red-50 dark:bg-red-950/30 px-2 py-1.5 text-center font-semibold text-red-700 dark:text-red-400">
                  Contas a Pagar — {formatCurrency(totalPagar)}
                </th>
                <th rowSpan={2} className="border bg-muted w-[2px]"></th>
                <th colSpan={4} className="border bg-green-50 dark:bg-green-950/30 px-2 py-1.5 text-center font-semibold text-green-700 dark:text-green-400">
                  Contas a Receber — {formatCurrency(totalReceber)}
                </th>
              </tr>
              <tr>
                <th className="border bg-muted/50 px-2 py-1 text-left">Fornecedor</th>
                <th className="border bg-muted/50 px-2 py-1 text-left">Descritivo</th>
                <th className="border bg-muted/50 px-2 py-1 text-right">Valor</th>
                <th className="border bg-muted/50 px-2 py-1 text-center">Status</th>
                <th className="border bg-muted/50 px-2 py-1 text-left">Cliente</th>
                <th className="border bg-muted/50 px-2 py-1 text-left">Descritivo</th>
                <th className="border bg-muted/50 px-2 py-1 text-right">Valor</th>
                <th className="border bg-muted/50 px-2 py-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {alignedRows.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</td></tr>
              ) : alignedRows.map((row) => {
                const maxLen = Math.max(row.pagar.length, row.receber.length, 1);
                const totalDiaPagar = row.pagar.reduce((s, c) => s + c.valor, 0);
                const totalDiaReceber = row.receber.reduce((s, c) => s + c.valor, 0);
                const rows = [];
                for (let i = 0; i < maxLen; i++) {
                  const p = row.pagar[i];
                  const r = row.receber[i];
                  rows.push(
                    <tr key={`${row.date}-${i}`} className={i === 0 ? "border-t-2 border-border" : ""}>
                      {i === 0 && (
                        <td rowSpan={maxLen + 1} className="border px-2 py-1.5 font-semibold bg-muted/30 align-top whitespace-nowrap">
                          {row.date === "sem-vencimento" ? "S/ Venc." : formatDate(row.date)}
                        </td>
                      )}
                      <td className="border px-2 py-1 max-w-[120px] truncate">{p?.entidade || ""}</td>
                      <td className="border px-2 py-1 max-w-[140px] truncate">{p?.descritivo || ""}</td>
                      <td className="border px-2 py-1 text-right text-red-600 font-medium whitespace-nowrap">{p ? formatCurrency(p.valor) : ""}</td>
                      <td className="border px-2 py-1 text-center">{p ? statusBadge(p.status) : ""}</td>
                      <td className="border bg-muted/20 w-[2px]"></td>
                      <td className="border px-2 py-1 max-w-[120px] truncate">{r?.entidade || ""}</td>
                      <td className="border px-2 py-1 max-w-[140px] truncate">{r?.descritivo || ""}</td>
                      <td className="border px-2 py-1 text-right text-green-600 font-medium whitespace-nowrap">{r ? formatCurrency(r.valor) : ""}</td>
                      <td className="border px-2 py-1 text-center">{r ? statusBadge(r.status) : ""}</td>
                    </tr>
                  );
                }
                // Linha de total do dia
                rows.push(
                  <tr key={`${row.date}-total`} className="bg-muted/40">
                    <td colSpan={2} className="border px-2 py-1 text-right text-[10px] font-bold">Total do dia:</td>
                    <td className="border px-2 py-1 text-right text-red-700 font-bold whitespace-nowrap">{totalDiaPagar > 0 ? formatCurrency(totalDiaPagar) : "-"}</td>
                    <td className="border px-2 py-1"></td>
                    <td className="border bg-muted/20 w-[2px]"></td>
                    <td colSpan={2} className="border px-2 py-1 text-right text-[10px] font-bold">Total do dia:</td>
                    <td className="border px-2 py-1 text-right text-green-700 font-bold whitespace-nowrap">{totalDiaReceber > 0 ? formatCurrency(totalDiaReceber) : "-"}</td>
                    <td className="border px-2 py-1"></td>
                  </tr>
                );
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALDO CONSOLIDADO */}
      <div className="flex justify-center gap-8 py-3 border rounded-lg bg-muted/30">
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Total a Receber</span>
          <p className="font-bold text-green-600">{formatCurrency(totalReceber)}</p>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Total a Pagar</span>
          <p className="font-bold text-red-600">{formatCurrency(totalPagar)}</p>
        </div>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Saldo</span>
          <p className={`font-bold ${totalReceber - totalPagar >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(totalReceber - totalPagar)}
          </p>
        </div>
      </div>
    </div>
  );
}
