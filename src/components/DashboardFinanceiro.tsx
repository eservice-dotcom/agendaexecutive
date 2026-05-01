import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printDashboardFinanceiro } from "@/lib/printUtils";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const PIE_COLORS = [
  "hsl(37, 90%, 50%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 40%)", "hsl(0, 72%, 55%)",
  "hsl(270, 60%, 55%)", "hsl(45, 80%, 50%)", "hsl(180, 50%, 45%)", "hsl(320, 60%, 50%)",
  "hsl(100, 50%, 45%)", "hsl(220, 60%, 55%)",
];

interface ContaDB {
  valor: number;
  data: string;
  data_vencimento?: string | null;
  status: string;
  fornecedor?: string;
  cliente?: string;
  centro_custo?: string;
  centro_receita?: string;
}

// Data de COMPETÊNCIA: usa o vencimento (mês em que a despesa/receita deve ser
// reconhecida) e cai para a data de lançamento apenas se não houver vencimento.
const compDate = (c: { data?: string; data_vencimento?: string | null }) =>
  c.data_vencimento || c.data || "";

const DashboardFinanceiro = () => {
  const [contasPagar, setContasPagar] = useState<ContaDB[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaDB[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>("todos"); // "todos" | "01".."12"
  const [detailOpen, setDetailOpen] = useState<null | "receitas" | "despesas">(null);

  useEffect(() => {
    const fetchAll = async (table: "contas_pagar" | "contas_receber") => {
      let all: any[] = [];
      let from = 0;
      const ps = 1000;
      while (true) {
        const { data } = await supabase.from(table).select("*").range(from, from + ps - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < ps) break;
        from += ps;
      }
      return all;
    };
    Promise.all([fetchAll("contas_pagar"), fetchAll("contas_receber")]).then(([cp, cr]) => {
      setContasPagar(cp);
      setContasReceber(cr);
    });
  }, []);

  const years = useMemo(() => {
    const allDates = [...contasPagar, ...contasReceber].map((c) => compDate(c).substring(0, 4)).filter(Boolean);
    const unique = [...new Set(allDates)].sort().reverse();
    if (unique.length === 0) unique.push(new Date().getFullYear().toString());
    return unique;
  }, [contasPagar, contasReceber]);

  // Filtro por ANO (usado nos gráficos mensais que mostram o ano todo)
  const cpYear = useMemo(() => contasPagar.filter((c) => compDate(c).startsWith(year)), [contasPagar, year]);
  const crYear = useMemo(() => contasReceber.filter((c) => compDate(c).startsWith(year)), [contasReceber, year]);

  // Filtro adicional por MÊS (usado nos KPIs/DRE/Faturamento por cliente)
  const periodPrefix = month === "todos" ? year : `${year}-${month}`;
  const cpPeriod = useMemo(() => contasPagar.filter((c) => compDate(c).startsWith(periodPrefix)), [contasPagar, periodPrefix]);
  const crPeriod = useMemo(() => contasReceber.filter((c) => compDate(c).startsWith(periodPrefix)), [contasReceber, periodPrefix]);

  // ========== Receitas vs Despesas (Bar Chart by month) ==========
  const receitasDespesasData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const receitas = crYear.filter((c) => compDate(c).startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      const despesas = cpYear.filter((c) => compDate(c).startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Receitas: receitas, Despesas: despesas };
    });
  }, [cpYear, crYear, year]);

  // ========== DRE Simplificado (respeita ano + mês) ==========
  const dre = useMemo(() => {
    const totalReceitas = crPeriod.reduce((s, c) => s + Number(c.valor), 0);
    const totalDespesas = cpPeriod.reduce((s, c) => s + Number(c.valor), 0);
    const resultado = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

    const centrosMap = new Map<string, number>();
    cpPeriod.forEach((c) => {
      const key = (c as any).centro_custo || "Sem centro";
      centrosMap.set(key, (centrosMap.get(key) || 0) + Number(c.valor));
    });
    const centros = Array.from(centrosMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    const centrosRecMap = new Map<string, number>();
    crPeriod.forEach((c) => {
      const key = (c as any).centro_receita || "Sem centro";
      centrosRecMap.set(key, (centrosRecMap.get(key) || 0) + Number(c.valor));
    });
    const centrosRec = Array.from(centrosRecMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    return { totalReceitas, totalDespesas, resultado, margem, centros, centrosRec };
  }, [cpPeriod, crPeriod]);

  // ========== Resultado Projetado vs Efetivado (respeita ano + mês nos KPIs) ==========
  const projetadoEfetivado = useMemo(() => {
    const recPago = crPeriod.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const recPendente = crPeriod.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPago = cpPeriod.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPendente = cpPeriod.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);

    const resultadoEfetivado = recPago - despPago;
    const resultadoProjetado = (recPago + recPendente) - (despPago + despPendente);

    // Breakdown mensal sempre mostra o ano completo (visão de evolução)
    const monthly = MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const mCr = crYear.filter((c) => compDate(c).startsWith(prefix));
      const mCp = cpYear.filter((c) => compDate(c).startsWith(prefix));
      const efetivado = mCr.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0)
        - mCp.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
      const projetado = mCr.reduce((s, c) => s + Number(c.valor), 0)
        - mCp.reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Efetivado: efetivado, Projetado: projetado };
    });

    return { recPago, recPendente, despPago, despPendente, resultadoEfetivado, resultadoProjetado, monthly };
  }, [cpPeriod, crPeriod, cpYear, crYear, year]);

  // ========== Faturamento por Cliente (respeita ano + mês) ==========
  const faturamentoClientes = useMemo(() => {
    const map = new Map<string, number>();
    crPeriod.forEach((c) => {
      const key = (c as any).cliente || "Sem cliente";
      map.set(key, (map.get(key) || 0) + Number(c.valor));
    });
    return Array.from(map.entries())
      .map(([cliente, valor]) => ({ cliente, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [crPeriod]);

  const totalFatClientes = faturamentoClientes.reduce((s, c) => s + c.valor, 0);

  // Print dialog state
  const [printOpen, setPrintOpen] = useState(false);
  const [printDataInicio, setPrintDataInicio] = useState("");
  const [printDataFim, setPrintDataFim] = useState("");
  const [printCliente, setPrintCliente] = useState("");
  const [printFornecedor, setPrintFornecedor] = useState("");
  const [printSections, setPrintSections] = useState({
    receitasDespesas: true,
    dre: true,
    faturamentoClientes: true,
    projetadoEfetivado: true,
  });

  const allClientes = useMemo(() => {
    return [...new Set(contasReceber.map(c => (c as any).cliente).filter(Boolean))].sort();
  }, [contasReceber]);

  const allFornecedores = useMemo(() => {
    return [...new Set(contasPagar.map(c => (c as any).fornecedor).filter(Boolean))].sort();
  }, [contasPagar]);

  const openPrintDialog = () => {
    setPrintDataInicio("");
    setPrintDataFim("");
    setPrintCliente("");
    setPrintFornecedor("");
    setPrintSections({ receitasDespesas: true, dre: true, faturamentoClientes: true, projetadoEfetivado: true });
    setPrintOpen(true);
  };

  const handlePrint = () => {
    // Apply print filters
    let filteredCP = cpYear;
    let filteredCR = crYear;

    if (printDataInicio) {
      filteredCP = filteredCP.filter(c => compDate(c) >= printDataInicio);
      filteredCR = filteredCR.filter(c => compDate(c) >= printDataInicio);
    }
    if (printDataFim) {
      filteredCP = filteredCP.filter(c => compDate(c) <= printDataFim);
      filteredCR = filteredCR.filter(c => compDate(c) <= printDataFim);
    }
    if (printCliente) {
      filteredCR = filteredCR.filter(c => (c as any).cliente === printCliente);
    }
    if (printFornecedor) {
      filteredCP = filteredCP.filter(c => (c as any).fornecedor === printFornecedor);
    }

    // Recalculate all data with filtered values
    const filteredReceitasDespesas = MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const receitas = filteredCR.filter(c => compDate(c).startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      const despesas = filteredCP.filter(c => compDate(c).startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Receitas: receitas, Despesas: despesas };
    });

    const totalReceitas = filteredCR.reduce((s, c) => s + Number(c.valor), 0);
    const totalDespesas = filteredCP.reduce((s, c) => s + Number(c.valor), 0);
    const resultado = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

    const centrosMap = new Map<string, number>();
    filteredCP.forEach(c => {
      const key = (c as any).centro_custo || "Sem centro";
      centrosMap.set(key, (centrosMap.get(key) || 0) + Number(c.valor));
    });
    const centros = Array.from(centrosMap.entries()).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);

    const centrosRecMap = new Map<string, number>();
    filteredCR.forEach(c => {
      const key = (c as any).centro_receita || "Sem centro";
      centrosRecMap.set(key, (centrosRecMap.get(key) || 0) + Number(c.valor));
    });
    const centrosRec = Array.from(centrosRecMap.entries()).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);

    const recPago = filteredCR.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const recPendente = filteredCR.filter(c => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPago = filteredCP.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPendente = filteredCP.filter(c => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
    const resultadoEfetivado = recPago - despPago;
    const resultadoProjetado = (recPago + recPendente) - (despPago + despPendente);

    const monthly = MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const mCr = filteredCR.filter(c => compDate(c).startsWith(prefix));
      const mCp = filteredCP.filter(c => compDate(c).startsWith(prefix));
      const efetivado = mCr.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0) - mCp.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
      const projetado = mCr.reduce((s, c) => s + Number(c.valor), 0) - mCp.reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Efetivado: efetivado, Projetado: projetado };
    });

    const fatClientes = new Map<string, number>();
    filteredCR.forEach(c => {
      const key = (c as any).cliente || "Sem cliente";
      fatClientes.set(key, (fatClientes.get(key) || 0) + Number(c.valor));
    });
    const filteredFatClientes = Array.from(fatClientes.entries()).map(([cliente, valor]) => ({ cliente, valor })).sort((a, b) => b.valor - a.valor);

    // Build filter description
    const filterParts: string[] = [];
    if (printDataInicio || printDataFim) {
      const fmtD = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
      if (printDataInicio && printDataFim) filterParts.push(`Período: ${fmtD(printDataInicio)} a ${fmtD(printDataFim)}`);
      else if (printDataInicio) filterParts.push(`A partir de: ${fmtD(printDataInicio)}`);
      else filterParts.push(`Até: ${fmtD(printDataFim)}`);
    }
    if (printCliente) filterParts.push(`Cliente: ${printCliente}`);
    if (printFornecedor) filterParts.push(`Fornecedor: ${printFornecedor}`);

    const logoEl = document.querySelector('img[alt="Logo"]') as HTMLImageElement;
    const logoUrl = logoEl?.src || "";
    printDashboardFinanceiro({
      year,
      dre: { totalReceitas, totalDespesas, resultado, margem, centros, centrosRec },
      receitasDespesas: filteredReceitasDespesas,
      projetado: { recPago, recPendente, despPago, despPendente, resultadoEfetivado, resultadoProjetado, monthly },
      faturamentoClientes: filteredFatClientes,
      sections: printSections,
      filterDescription: filterParts.length > 0 ? filterParts.join(" | ") : undefined,
    }, logoUrl);

    setPrintOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Year selector + KPIs */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ano todo</SelectItem>
            {MONTHS.map((label, i) => (
              <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={openPrintDialog}>
          <Printer className="h-4 w-4 mr-1" />
          Imprimir Relatório
        </Button>

        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard icon={TrendingUp} label="Receitas" value={formatCurrency(dre.totalReceitas)} variant="success" onClick={() => setDetailOpen("receitas")} />
          <KPICard icon={TrendingDown} label="Despesas" value={formatCurrency(dre.totalDespesas)} variant="destructive" onClick={() => setDetailOpen("despesas")} />
          <KPICard icon={DollarSign} label="Resultado" value={formatCurrency(dre.resultado)} variant={dre.resultado >= 0 ? "success" : "destructive"} />
          <KPICard icon={BarChart3} label="Margem" value={`${dre.margem.toFixed(1)}%`} variant={dre.margem >= 0 ? "success" : "destructive"} />
        </div>
      </div>

      {/* Diálogo de detalhamento Receitas/Despesas */}
      <KPIDetailDialog
        open={detailOpen !== null}
        onClose={() => setDetailOpen(null)}
        tipo={detailOpen}
        year={year}
        month={month}
        items={detailOpen === "receitas" ? crPeriod : cpPeriod}
        onUpdated={(updated) => {
          if (detailOpen === "receitas") {
            setContasReceber((prev) => prev.map((c: any) => (c.id === updated.id ? { ...c, ...updated } : c)));
          } else {
            setContasPagar((prev) => prev.map((c: any) => (c.id === updated.id ? { ...c, ...updated } : c)));
          }
        }}
      />

      {/* Receitas vs Despesas Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receitas vs Despesas — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitasDespesasData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receitas" fill="hsl(150, 60%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* DRE Simplificado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">DRE Simplificado — {year}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">RECEITA BRUTA</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(dre.totalReceitas)}</TableCell>
                  </TableRow>
                  {dre.centrosRec.map((c) => (
                    <TableRow key={c.nome}>
                      <TableCell className="pl-6 text-sm text-muted-foreground">{c.nome}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valor)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">(-) DESPESAS</TableCell>
                    <TableCell className="text-right font-mono font-bold text-destructive">{formatCurrency(dre.totalDespesas)}</TableCell>
                  </TableRow>
                  {dre.centros.map((c) => (
                    <TableRow key={c.nome}>
                      <TableCell className="pl-6 text-sm text-muted-foreground">{c.nome}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valor)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/10 border-t-2 border-primary">
                    <TableCell className="font-bold text-base">(=) RESULTADO</TableCell>
                    <TableCell className={`text-right font-mono text-base font-bold ${dre.resultado >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(dre.resultado)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Margem Líquida</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${dre.margem >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {dre.margem.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento por Cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Faturamento por Cliente — {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {faturamentoClientes.length > 0 && (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={faturamentoClientes.slice(0, 10)}
                        dataKey="valor"
                        nameKey="cliente"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {faturamentoClientes.slice(0, 10).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="max-h-[200px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="text-right font-semibold">Valor</TableHead>
                      <TableHead className="text-right font-semibold">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturamentoClientes.map((c, i) => (
                      <TableRow key={c.cliente}>
                        <TableCell className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {c.cliente}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(c.valor)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totalFatClientes > 0 ? `${((c.valor / totalFatClientes) * 100).toFixed(1)}%` : "0%"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
      </div>

      {/* Resultado Projetado vs Efetivado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultado Financeiro: Projetado vs Efetivado — {year}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Receitas Efetivadas</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(projetadoEfetivado.recPago)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Receitas Pendentes</p>
              <p className="mt-1 text-lg font-bold text-amber-600">{formatCurrency(projetadoEfetivado.recPendente)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Despesas Efetivadas</p>
              <p className="mt-1 text-lg font-bold text-destructive">{formatCurrency(projetadoEfetivado.despPago)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Despesas Pendentes</p>
              <p className="mt-1 text-lg font-bold text-amber-600">{formatCurrency(projetadoEfetivado.despPendente)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-lg border-2 p-4 ${projetadoEfetivado.resultadoEfetivado >= 0 ? "border-emerald-500 bg-emerald-50/50" : "border-destructive bg-destructive/5"}`}>
              <p className="text-sm font-medium text-muted-foreground">Resultado Efetivado</p>
              <p className={`text-2xl font-bold ${projetadoEfetivado.resultadoEfetivado >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatCurrency(projetadoEfetivado.resultadoEfetivado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Somente contas pagas</p>
            </div>
            <div className={`rounded-lg border-2 p-4 ${projetadoEfetivado.resultadoProjetado >= 0 ? "border-blue-500 bg-blue-50/50" : "border-destructive bg-destructive/5"}`}>
              <p className="text-sm font-medium text-muted-foreground">Resultado Projetado</p>
              <p className={`text-2xl font-bold ${projetadoEfetivado.resultadoProjetado >= 0 ? "text-blue-600" : "text-destructive"}`}>
                {formatCurrency(projetadoEfetivado.resultadoProjetado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Inclui contas pendentes</p>
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projetadoEfetivado.monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Efetivado" fill="hsl(150, 60%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projetado" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Filters Dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimir Relatório Financeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={printDataInicio} onChange={(e) => setPrintDataInicio(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={printDataFim} onChange={(e) => setPrintDataFim(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select value={printCliente || "all"} onValueChange={(v) => setPrintCliente(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {allClientes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Select value={printFornecedor || "all"} onValueChange={(v) => setPrintFornecedor(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {allFornecedores.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Seções do Relatório</Label>
              <div className="space-y-2">
                {([
                  { key: "receitasDespesas", label: "Receitas vs Despesas Mensal" },
                  { key: "dre", label: "DRE Simplificado" },
                  { key: "faturamentoClientes", label: "Faturamento por Cliente" },
                  { key: "projetadoEfetivado", label: "Projetado vs Efetivado" },
                ] as const).map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`print-${s.key}`}
                      checked={printSections[s.key]}
                      onCheckedChange={(checked) => setPrintSections((prev) => ({ ...prev, [s.key]: !!checked }))}
                    />
                    <label htmlFor={`print-${s.key}`} className="text-sm cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Cancelar</Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, variant, onClick }: {
  icon: React.ElementType; label: string; value: string;
  variant: "success" | "destructive";
  onClick?: () => void;
}) => (
  <div
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
    className={`rounded-lg border border-border bg-card p-3 shadow-sm transition ${onClick ? "cursor-pointer hover:border-primary hover:shadow-md" : ""}`}
  >
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${variant === "success" ? "text-emerald-500" : "text-destructive"}`} />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
    <p className={`mt-1 text-lg font-bold ${variant === "success" ? "text-emerald-600" : "text-destructive"}`}>{value}</p>
  </div>
);

const KPIDetailDialog = ({ open, onClose, tipo, year, month, items, onUpdated }: {
  open: boolean;
  onClose: () => void;
  tipo: "receitas" | "despesas" | null;
  year: string;
  month: string;
  items: any[];
  onUpdated: (updated: any) => void;
}) => {
  const isReceita = tipo === "receitas";
  const groupKey = isReceita ? "centro_receita" : "centro_custo";
  const entityKey = isReceita ? "cliente" : "fornecedor";
  const table = isReceita ? "contas_receber" : "contas_pagar";
  const periodLabel = month === "todos"
    ? year
    : `${MONTHS[parseInt(month, 10) - 1]}/${year}`;

  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [centros, setCentros] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const tbl = isReceita ? "centros_receita" : "centros_custo";
    supabase.from(tbl).select("nome").order("nome").then(({ data }) => {
      setCentros((data || []).map((c: any) => c.nome).filter(Boolean));
    });
  }, [open, isReceita]);

  const grupos = (() => {
    const map = new Map<string, { total: number; itens: any[] }>();
    items.forEach((c) => {
      const key = (c as any)[groupKey] || "Sem centro";
      const cur = map.get(key) || { total: 0, itens: [] };
      cur.total += Number(c.valor) || 0;
      cur.itens.push(c);
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, total: v.total, itens: v.itens }))
      .sort((a, b) => b.total - a.total);
  })();

  const total = items.reduce((s, c) => s + (Number(c.valor) || 0), 0);

  const handleSave = async () => {
    if (!editing?.id) return;
    setSaving(true);
    const payload: any = {
      descritivo: editing.descritivo || "",
      valor: Number(editing.valor) || 0,
      data_vencimento: editing.data_vencimento || null,
      data: editing.data || null,
      status: editing.status,
      [entityKey]: editing[entityKey] || "",
      [groupKey]: editing[groupKey] || "",
    };
    const { error } = await supabase.from(table).update(payload).eq("id", editing.id);
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar:", error);
      return;
    }
    onUpdated({ id: editing.id, ...payload });
    setEditing(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>
              Detalhamento de {isReceita ? "Receitas" : "Despesas"} — {periodLabel}
            </span>
            <span className={`text-base font-bold ${isReceita ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(total)}
            </span>
          </DialogTitle>
        </DialogHeader>
        {grupos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste período.
          </p>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <div key={g.nome} className="rounded-md border border-border">
                <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                  <span className="text-sm font-semibold">{g.nome}</span>
                  <span className={`text-sm font-bold ${isReceita ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(g.total)}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Vencimento</TableHead>
                      <TableHead className="text-xs">{isReceita ? "Cliente" : "Fornecedor"}</TableHead>
                      <TableHead className="text-xs">Descritivo</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.itens
                      .slice()
                      .sort((a, b) => compDate(a).localeCompare(compDate(b)))
                      .map((c, idx) => (
                        <TableRow key={c.id || idx}>
                          <TableCell className="text-xs py-1.5">{compDate(c) || "—"}</TableCell>
                          <TableCell className="text-xs py-1.5">{(c as any)[entityKey] || "—"}</TableCell>
                          <TableCell className="text-xs py-1.5">{(c as any).descritivo || "—"}</TableCell>
                          <TableCell className="text-xs py-1.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "pago" || c.status === "recebido" ? "bg-emerald-500/15 text-emerald-600" : "bg-yellow-500/15 text-yellow-600"}`}>
                              {c.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-right font-mono">{formatCurrency(Number(c.valor) || 0)}</TableCell>
                          <TableCell className="text-xs py-1.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => setEditing({ ...c })}
                              disabled={!c.id}
                            >
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        {/* Sub-dialog de edição */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar {isReceita ? "Receita" : "Despesa"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">{isReceita ? "Cliente" : "Fornecedor"}</Label>
                  <Input
                    value={editing[entityKey] || ""}
                    onChange={(e) => setEditing({ ...editing, [entityKey]: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Descritivo</Label>
                  <Input
                    value={editing.descritivo || ""}
                    onChange={(e) => setEditing({ ...editing, descritivo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={editing.data_vencimento || ""}
                    onChange={(e) => setEditing({ ...editing, data_vencimento: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Data Lançamento</Label>
                  <Input
                    type="date"
                    value={editing.data || ""}
                    onChange={(e) => setEditing({ ...editing, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.valor ?? 0}
                    onChange={(e) => setEditing({ ...editing, valor: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={editing.status || "pendente"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">pendente</SelectItem>
                      <SelectItem value={isReceita ? "recebido" : "pago"}>{isReceita ? "recebido" : "pago"}</SelectItem>
                      <SelectItem value="cancelado">cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">{isReceita ? "Centro de Receita" : "Centro de Custo"}</Label>
                  <Select
                    value={editing[groupKey] || ""}
                    onValueChange={(v) => setEditing({ ...editing, [groupKey]: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um centro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map((nome) => (
                        <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                      ))}
                      {editing[groupKey] && !centros.includes(editing[groupKey]) && (
                        <SelectItem value={editing[groupKey]}>{editing[groupKey]} (atual)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardFinanceiro;
