import { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Printer, ChevronDown, ChevronRight, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { printFatVeiculo } from "@/lib/printUtils";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompactList = (values: string[], max = 2) => {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return "—";
  if (unique.length <= max) return unique.join(", ");
  return `${unique.slice(0, max).join(", ")} +${unique.length - max}`;
};

const FaturamentoVeiculo = () => {
  const [items, setItems] = useState<any[]>([]);
  const [despesasVeiculo, setDespesasVeiculo] = useState<any[]>([]);
  const [printWithFinancials, setPrintWithFinancials] = useState(true);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedPlaca, setSelectedPlaca] = useState<string>("todos");

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const fetchAll = async () => {
      let all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from("agenda_items")
          .select("placa, veiculo, valor, custo, cliente, cot, data, origem, destino, motorista, fornecedor, estacionamento, outros_despesas")
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setItems(all);

      let allDespesas: any[] = [];
      let fromD = 0;
      while (true) {
        const { data } = await supabase
          .from("contas_pagar")
          .select("placa, valor, status, descritivo, data")
          .neq("placa", "")
          .range(fromD, fromD + pageSize - 1);
        if (!data || data.length === 0) break;
        allDespesas = allDespesas.concat(data);
        if (data.length < pageSize) break;
        fromD += pageSize;
      }
      setDespesasVeiculo(allDespesas.filter(d => d.status !== "cancelado"));
    };
    fetchAll();
  }, []);
  const allPlacas = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.placa) set.add(i.placa); });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.data) return true;
      const d = item.data;
      if (dataInicio && d < format(dataInicio, "yyyy-MM-dd")) return false;
      if (dataFim && d > format(dataFim, "yyyy-MM-dd")) return false;
      if (selectedPlaca !== "todos" && item.placa !== selectedPlaca) return false;
      return true;
    });
  }, [items, dataInicio, dataFim, selectedPlaca]);

  const filteredDespesas = useMemo(() => {
    return despesasVeiculo.filter(d => {
      if (!d.data) return true;
      if (dataInicio && d.data < format(dataInicio, "yyyy-MM-dd")) return false;
      if (dataFim && d.data > format(dataFim, "yyyy-MM-dd")) return false;
      return true;
    });
  }, [despesasVeiculo, dataInicio, dataFim]);

  const despesasPorPlaca = useMemo(() => {
    const map = new Map<string, number>();
    filteredDespesas.forEach((d) => {
      if (d.placa) {
        map.set(d.placa, (map.get(d.placa) || 0) + (Number(d.valor) || 0));
      }
    });
    return map;
  }, [filteredDespesas]);

  const despesasDetalhesPorPlaca = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredDespesas.forEach((d) => {
      if (d.placa) {
        const arr = map.get(d.placa) || [];
        arr.push(d);
        map.set(d.placa, arr);
      }
    });
    return map;
  }, [filteredDespesas]);

  const dados = useMemo(() => {
    const map = new Map<string, {
      key: string;
      veiculo: string;
      placa: string;
      viagens: number;
      receita: number;
      custo: number;
      clientes: string[];
      cots: string[];
      servicos: any[];
    }>();

    filteredItems.forEach((item) => {
      const key = item.placa || `sem-placa-${item.veiculo || "veiculo"}`;
      const existing = map.get(key) || {
        key,
        veiculo: item.veiculo || "—",
        placa: item.placa || "—",
        viagens: 0,
        receita: 0,
        custo: 0,
        clientes: [],
        cots: [],
        servicos: [],
      };

      existing.viagens += 1;
      const outrosDespesas = Array.isArray(item.outros_despesas) ? item.outros_despesas : [];
      const valorTotal = (Number(item.valor) || 0) + (Number(item.estacionamento) || 0) + outrosDespesas.reduce((s: number, d: any) => s + (Number(d.valor) || 0), 0);
      existing.receita += valorTotal;
      existing.custo += Number(item.custo) || 0;
      if (item.cliente) existing.clientes.push(item.cliente);
      if (item.cot) existing.cots.push(item.cot);
      existing.servicos.push(item);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  }, [filteredItems]);

  const totalReceita = dados.reduce((s, d) => s + d.receita, 0);
  const totalCusto = dados.reduce((s, d) => s + d.custo, 0);
  const totalDespesas = Array.from(despesasPorPlaca.values()).reduce((s, v) => s + v, 0);
  const totalLiquido = totalReceita - totalCusto - totalDespesas;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Veículos" value={dados.length.toString()} />
          <StatCard label="Total Viagens" value={dados.reduce((s, d) => s + d.viagens, 0).toString()} />
          <StatCard label="Receita Total" value={formatCurrency(totalReceita)} accent />
          <StatCard label="Desp. Operacionais" value={formatCurrency(totalDespesas)} />
          <StatCard label="Resultado Líquido" value={formatCurrency(totalLiquido)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Filtro:</span>
          <Select
            value={(() => {
              const now = new Date();
              const years: string[] = [];
              for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) years.push(String(y));
              // Check if current filter matches a specific month
              if (dataInicio && dataFim) {
                const si = format(dataInicio, "yyyy-MM-dd");
                const sf = format(dataFim, "yyyy-MM-dd");
                for (const yr of years) {
                  for (let m = 0; m < 12; m++) {
                    const ms = startOfMonth(new Date(Number(yr), m));
                    const me = endOfMonth(new Date(Number(yr), m));
                    if (si === format(ms, "yyyy-MM-dd") && sf === format(me, "yyyy-MM-dd")) {
                      return `${yr}-${String(m).padStart(2, "0")}`;
                    }
                  }
                }
              }
              return "custom";
            })()}
            onValueChange={(v) => {
              if (v === "custom") return;
              const [yr, mo] = v.split("-").map(Number);
              setDataInicio(startOfMonth(new Date(yr, mo)));
              setDataFim(endOfMonth(new Date(yr, mo)));
            }}
          >
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom" disabled className="text-muted-foreground text-xs">Selecione o mês</SelectItem>
              {(() => {
                const now = new Date();
                const options: { label: string; value: string }[] = [];
                for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
                  for (let m = 11; m >= 0; m--) {
                    if (y === now.getFullYear() && m > now.getMonth()) continue;
                    options.push({
                      label: `${MESES[m]} ${y}`,
                      value: `${y}-${String(m).padStart(2, "0")}`,
                    });
                  }
                }
                return options.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>

          <Select
            value={(() => {
              if (dataInicio && dataFim) {
                const now = new Date();
                for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
                  const ys = startOfYear(new Date(y, 0));
                  const ye = endOfYear(new Date(y, 0));
                  if (format(dataInicio, "yyyy-MM-dd") === format(ys, "yyyy-MM-dd") && format(dataFim, "yyyy-MM-dd") === format(ye, "yyyy-MM-dd")) {
                    return String(y);
                  }
                }
              }
              return "custom";
            })()}
            onValueChange={(v) => {
              if (v === "custom") return;
              const y = Number(v);
              setDataInicio(startOfYear(new Date(y, 0)));
              setDataFim(endOfYear(new Date(y, 0)));
            }}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom" disabled className="text-muted-foreground text-xs">Ano</SelectItem>
              {(() => {
                const now = new Date();
                const opts = [];
                for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
                  opts.push(<SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>);
                }
                return opts;
              })()}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground mx-1">ou período:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal text-xs", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal text-xs", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
              Limpar
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-1">Veículo:</span>
          <Select value={selectedPlaca} onValueChange={setSelectedPlaca}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos</SelectItem>
              {allPlacas.map(p => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={printWithFinancials} onChange={e => setPrintWithFinancials(e.target.checked)} className="rounded" />
          Incluir financeiro
        </label>
        <Button variant="outline" size="sm" onClick={() => printFatVeiculo(filteredItems, printWithFinancials, filteredDespesas)} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold">Veículo</TableHead>
              <TableHead className="font-semibold">Placa</TableHead>
              <TableHead className="font-semibold">Cliente(s)</TableHead>
              <TableHead className="font-semibold">O.S.</TableHead>
              <TableHead className="font-semibold text-center">Viagens</TableHead>
              <TableHead className="font-semibold text-right">Receita</TableHead>
              <TableHead className="font-semibold text-right">Custo Forn.</TableHead>
              <TableHead className="font-semibold text-right">Desp. Oper.</TableHead>
              <TableHead className="font-semibold text-right">Líquido</TableHead>
              <TableHead className="font-semibold text-right">% Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => {
              const despOper = despesasPorPlaca.get(d.placa) || 0;
              const liquido = d.receita - d.custo - despOper;
              const isExpanded = expandedKeys.has(d.key);
              const despDetalhes = despesasDetalhesPorPlaca.get(d.placa) || [];

              return (
                <>
                  <TableRow key={d.key} className="transition-colors hover:bg-primary/5 cursor-pointer" onClick={() => toggleExpand(d.key)}>
                    <TableCell className="w-8 px-2">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {d.veiculo}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{d.placa}</TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">{formatCompactList(d.clientes)}</TableCell>
                    <TableCell className="max-w-[220px] font-mono text-xs text-muted-foreground">{formatCompactList(d.cots, 3)}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {d.viagens}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(d.receita)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(d.custo)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(despOper)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${liquido >= 0 ? "text-accent" : "text-destructive"}`}>{formatCurrency(liquido)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {d.receita > 0 ? `${((liquido / d.receita) * 100).toFixed(1)}%` : "0%"}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${d.key}-detail`} className="hover:bg-transparent">
                      <TableCell colSpan={11} className="p-0">
                        <div className="bg-muted/30 px-6 py-3 space-y-3">
                          {/* Serviços / Receitas */}
                          <div>
                            <h4 className="text-xs font-semibold text-foreground mb-2">Serviços / Receitas</h4>
                            <div className="overflow-auto rounded border border-border bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="text-xs py-1.5">O.S.</TableHead>
                                    <TableHead className="text-xs py-1.5">Data</TableHead>
                                    <TableHead className="text-xs py-1.5">Cliente</TableHead>
                                    <TableHead className="text-xs py-1.5">Trajeto</TableHead>
                                    <TableHead className="text-xs py-1.5">Motorista</TableHead>
                                    <TableHead className="text-xs py-1.5">Fornecedor</TableHead>
                                    <TableHead className="text-xs py-1.5 text-right">Valor</TableHead>
                                    <TableHead className="text-xs py-1.5 text-right">Custo</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {d.servicos.map((s: any, idx: number) => {
                                    const od = Array.isArray(s.outros_despesas) ? s.outros_despesas : [];
                                    const sValorTotal = (Number(s.valor) || 0) + (Number(s.estacionamento) || 0) + od.reduce((sum: number, x: any) => sum + (Number(x.valor) || 0), 0);
                                    return (
                                    <TableRow key={idx} className="hover:bg-primary/5">
                                      <TableCell className="font-mono text-xs py-1.5">{s.cot || "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5">{s.data || "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5">{s.cliente || "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5">{s.origem && s.destino ? `${s.origem} → ${s.destino}` : "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5">{s.motorista || "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5">{s.fornecedor || "—"}</TableCell>
                                      <TableCell className="text-xs py-1.5 text-right font-mono font-semibold">{formatCurrency(sValorTotal)}</TableCell>
                                      <TableCell className="text-xs py-1.5 text-right font-mono text-muted-foreground">{formatCurrency(Number(s.custo) || 0)}</TableCell>
                                    </TableRow>
                                    );
                                  })}
                                  <TableRow className="bg-muted/40 hover:bg-muted/40 font-semibold">
                                    <TableCell colSpan={6} className="text-xs py-1.5">Subtotal Serviços</TableCell>
                                    <TableCell className="text-xs py-1.5 text-right font-mono">{formatCurrency(d.receita)}</TableCell>
                                    <TableCell className="text-xs py-1.5 text-right font-mono">{formatCurrency(d.custo)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          {/* Despesas Operacionais */}
                          {despDetalhes.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-foreground mb-2">Despesas Operacionais</h4>
                              <div className="overflow-auto rounded border border-border bg-card">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                      <TableHead className="text-xs py-1.5">Data</TableHead>
                                      <TableHead className="text-xs py-1.5">Descritivo</TableHead>
                                      <TableHead className="text-xs py-1.5">Status</TableHead>
                                      <TableHead className="text-xs py-1.5 text-right">Valor</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {despDetalhes.map((desp: any, idx: number) => (
                                      <TableRow key={idx} className="hover:bg-primary/5">
                                        <TableCell className="text-xs py-1.5">{desp.data || "—"}</TableCell>
                                        <TableCell className="text-xs py-1.5">{desp.descritivo || "—"}</TableCell>
                                        <TableCell className="text-xs py-1.5">
                                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${desp.status === "pago" ? "bg-accent/15 text-accent" : "bg-yellow-500/15 text-yellow-600"}`}>
                                            {desp.status}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-xs py-1.5 text-right font-mono">{formatCurrency(Number(desp.valor) || 0)}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/40 hover:bg-muted/40 font-semibold">
                                      <TableCell colSpan={3} className="text-xs py-1.5">Subtotal Despesas</TableCell>
                                      <TableCell className="text-xs py-1.5 text-right font-mono">{formatCurrency(despOper)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {dados.length > 0 && (
              <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                <TableCell />
                <TableCell colSpan={3} className="font-semibold">TOTAL</TableCell>
                <TableCell />
                <TableCell className="text-center">{dados.reduce((s, d) => s + d.viagens, 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(totalReceita)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(totalCusto)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(totalDespesas)}</TableCell>
                <TableCell className={`text-right font-mono text-sm font-semibold ${totalLiquido >= 0 ? "text-accent" : "text-destructive"}`}>{formatCurrency(totalLiquido)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {totalReceita > 0 ? `${((totalLiquido / totalReceita) * 100).toFixed(1)}%` : "0%"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={`mt-1 text-lg font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
  </div>
);

export default FaturamentoVeiculo;
