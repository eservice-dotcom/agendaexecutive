import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  entidade: string; // fornecedor ou cliente
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

  const filteredPagar = useMemo(() => filterItems(processedPagar), [processedPagar, dataInicio, dataFim, busca]);
  const filteredReceber = useMemo(() => filterItems(processedReceber), [processedReceber, dataInicio, dataFim, busca]);

  const totalPagar = filteredPagar.reduce((s, c) => s + c.valor, 0);
  const totalPagoPagar = filteredPagar.reduce((s, c) => s + c.valor_pago, 0);
  const totalReceber = filteredReceber.reduce((s, c) => s + c.valor, 0);
  const totalPagoReceber = filteredReceber.reduce((s, c) => s + c.valor_pago, 0);

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

    const renderTable = (items: ContaItem[], title: string) => {
      if (items.length === 0) return `<p>Nenhum registro.</p>`;
      const total = items.reduce((s, c) => s + c.valor, 0);
      const totalPago = items.reduce((s, c) => s + c.valor_pago, 0);
      return `
        <h3 style="margin:8px 0 4px;font-size:13px;">${title} — Total: ${formatCurrency(total)} | Pago: ${formatCurrency(totalPago)} | Saldo: ${formatCurrency(total - totalPago)}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#f0f0f0;">
            <th style="border:1px solid #ccc;padding:3px;text-align:left;">Vencimento</th>
            <th style="border:1px solid #ccc;padding:3px;text-align:left;">${title.includes("Pagar") ? "Fornecedor" : "Cliente"}</th>
            <th style="border:1px solid #ccc;padding:3px;text-align:left;">Descritivo</th>
            <th style="border:1px solid #ccc;padding:3px;text-align:right;">Valor</th>
            <th style="border:1px solid #ccc;padding:3px;text-align:right;">Pago</th>
            <th style="border:1px solid #ccc;padding:3px;text-align:center;">Status</th>
          </tr></thead>
          <tbody>${items.map((c) => `
            <tr>
              <td style="border:1px solid #ccc;padding:3px;">${formatDate(c.data_vencimento)}</td>
              <td style="border:1px solid #ccc;padding:3px;">${c.entidade}</td>
              <td style="border:1px solid #ccc;padding:3px;">${c.descritivo}</td>
              <td style="border:1px solid #ccc;padding:3px;text-align:right;">${formatCurrency(c.valor)}</td>
              <td style="border:1px solid #ccc;padding:3px;text-align:right;">${formatCurrency(c.valor_pago)}</td>
              <td style="border:1px solid #ccc;padding:3px;text-align:center;">${c.status}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      `;
    };

    printWindow.document.write(`
      <html><head><title>Relatório Contas</title></head><body style="font-family:Arial;padding:16px;">
        <h2 style="text-align:center;font-size:15px;">Relatório Consolidado — Contas a Pagar e Receber</h2>
        ${dataInicio || dataFim ? `<p style="text-align:center;font-size:11px;">Período: ${dataInicio ? formatDate(dataInicio) : "..."} a ${dataFim ? formatDate(dataFim) : "..."}</p>` : ""}
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">${renderTable(filteredPagar, "Contas a Pagar")}</div>
          <div style="flex:1;">${renderTable(filteredReceber, "Contas a Receber")}</div>
        </div>
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
          <span className="text-xs font-medium text-muted-foreground">Busca</span>
          <Input placeholder="Fornecedor, cliente, descritivo..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64 h-8 text-xs" />
        </div>
        <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1">
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CONTAS A PAGAR */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">Contas a Pagar</h3>
            <div className="text-xs space-x-3">
              <span>Total: <strong>{formatCurrency(totalPagar)}</strong></span>
              <span>Pago: <strong>{formatCurrency(totalPagoPagar)}</strong></span>
              <span>Saldo: <strong className="text-red-600">{formatCurrency(totalPagar - totalPagoPagar)}</strong></span>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Fornecedor</TableHead>
                  <TableHead className="text-xs">Descritivo</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Pago</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPagar.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                ) : filteredPagar.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs py-1.5">{formatDate(c.data_vencimento)}</TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[120px] truncate">{c.entidade}</TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[150px] truncate">{c.descritivo}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{formatCurrency(c.valor)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{formatCurrency(c.valor_pago)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-center">{statusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* CONTAS A RECEBER */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 dark:bg-green-950/30 px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-green-700 dark:text-green-400">Contas a Receber</h3>
            <div className="text-xs space-x-3">
              <span>Total: <strong>{formatCurrency(totalReceber)}</strong></span>
              <span>Recebido: <strong>{formatCurrency(totalPagoReceber)}</strong></span>
              <span>Saldo: <strong className="text-green-600">{formatCurrency(totalReceber - totalPagoReceber)}</strong></span>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Descritivo</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Recebido</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceber.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                ) : filteredReceber.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs py-1.5">{formatDate(c.data_vencimento)}</TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[120px] truncate">{c.entidade}</TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[150px] truncate">{c.descritivo}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{formatCurrency(c.valor)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-right">{formatCurrency(c.valor_pago)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-center">{statusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
