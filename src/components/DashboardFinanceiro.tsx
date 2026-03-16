import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

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
  status: string;
  fornecedor?: string;
  cliente?: string;
  centro_custo?: string;
  centro_receita?: string;
}

const DashboardFinanceiro = () => {
  const [contasPagar, setContasPagar] = useState<ContaDB[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaDB[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());

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
    const allDates = [...contasPagar, ...contasReceber].map((c) => c.data?.substring(0, 4)).filter(Boolean);
    const unique = [...new Set(allDates)].sort().reverse();
    if (unique.length === 0) unique.push(new Date().getFullYear().toString());
    return unique;
  }, [contasPagar, contasReceber]);

  const cpYear = useMemo(() => contasPagar.filter((c) => c.data?.startsWith(year)), [contasPagar, year]);
  const crYear = useMemo(() => contasReceber.filter((c) => c.data?.startsWith(year)), [contasReceber, year]);

  // ========== Receitas vs Despesas (Bar Chart by month) ==========
  const receitasDespesasData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const receitas = crYear.filter((c) => c.data?.startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      const despesas = cpYear.filter((c) => c.data?.startsWith(prefix)).reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Receitas: receitas, Despesas: despesas };
    });
  }, [cpYear, crYear, year]);

  // ========== DRE Simplificado ==========
  const dre = useMemo(() => {
    const totalReceitas = crYear.reduce((s, c) => s + Number(c.valor), 0);
    const totalDespesas = cpYear.reduce((s, c) => s + Number(c.valor), 0);
    const resultado = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

    // Group despesas by centro_custo
    const centrosMap = new Map<string, number>();
    cpYear.forEach((c) => {
      const key = (c as any).centro_custo || "Sem centro";
      centrosMap.set(key, (centrosMap.get(key) || 0) + Number(c.valor));
    });
    const centros = Array.from(centrosMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    // Group receitas by centro_receita
    const centrosRecMap = new Map<string, number>();
    crYear.forEach((c) => {
      const key = (c as any).centro_receita || "Sem centro";
      centrosRecMap.set(key, (centrosRecMap.get(key) || 0) + Number(c.valor));
    });
    const centrosRec = Array.from(centrosRecMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    return { totalReceitas, totalDespesas, resultado, margem, centros, centrosRec };
  }, [cpYear, crYear]);

  // ========== Resultado Projetado vs Efetivado ==========
  const projetadoEfetivado = useMemo(() => {
    const recPago = crYear.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const recPendente = crYear.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPago = cpYear.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const despPendente = cpYear.filter((c) => c.status !== "pago").reduce((s, c) => s + Number(c.valor), 0);

    const resultadoEfetivado = recPago - despPago;
    const resultadoProjetado = (recPago + recPendente) - (despPago + despPendente);

    // Monthly breakdown
    const monthly = MONTHS.map((label, i) => {
      const m = String(i + 1).padStart(2, "0");
      const prefix = `${year}-${m}`;
      const mCr = crYear.filter((c) => c.data?.startsWith(prefix));
      const mCp = cpYear.filter((c) => c.data?.startsWith(prefix));
      const efetivado = mCr.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0)
        - mCp.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
      const projetado = mCr.reduce((s, c) => s + Number(c.valor), 0)
        - mCp.reduce((s, c) => s + Number(c.valor), 0);
      return { mes: label, Efetivado: efetivado, Projetado: projetado };
    });

    return { recPago, recPendente, despPago, despPendente, resultadoEfetivado, resultadoProjetado, monthly };
  }, [cpYear, crYear, year]);

  // ========== Faturamento por Cliente ==========
  const faturamentoClientes = useMemo(() => {
    const map = new Map<string, number>();
    crYear.forEach((c) => {
      const key = (c as any).cliente || "Sem cliente";
      map.set(key, (map.get(key) || 0) + Number(c.valor));
    });
    return Array.from(map.entries())
      .map(([cliente, valor]) => ({ cliente, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [crYear]);

  const totalFatClientes = faturamentoClientes.reduce((s, c) => s + c.valor, 0);

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

        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard icon={TrendingUp} label="Receitas" value={formatCurrency(dre.totalReceitas)} variant="success" />
          <KPICard icon={TrendingDown} label="Despesas" value={formatCurrency(dre.totalDespesas)} variant="destructive" />
          <KPICard icon={DollarSign} label="Resultado" value={formatCurrency(dre.resultado)} variant={dre.resultado >= 0 ? "success" : "destructive"} />
          <KPICard icon={BarChart3} label="Margem" value={`${dre.margem.toFixed(1)}%`} variant={dre.margem >= 0 ? "success" : "destructive"} />
        </div>
      </div>

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
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, variant }: {
  icon: React.ElementType; label: string; value: string;
  variant: "success" | "destructive";
}) => (
  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${variant === "success" ? "text-emerald-500" : "text-destructive"}`} />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
    <p className={`mt-1 text-lg font-bold ${variant === "success" ? "text-emerald-600" : "text-destructive"}`}>{value}</p>
  </div>
);

export default DashboardFinanceiro;
