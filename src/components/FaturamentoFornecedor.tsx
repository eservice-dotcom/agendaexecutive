import { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Printer, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { printFatFornecedor, printFatFornecedorDetalhado } from "@/lib/printUtils";
import { calcReceitaServico } from "@/lib/receitaServico";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatCompactList = (values: string[], max = 2) => {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return "—";
  if (unique.length <= max) return unique.join(", ");
  return `${unique.slice(0, max).join(", ")} +${unique.length - max}`;
};

const FaturamentoFornecedor = () => {
  const [items, setItems] = useState<any[]>([]);
  const [printWithFinancials, setPrintWithFinancials] = useState(true);
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>("__all__");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  useEffect(() => {
    const fetchAll = async () => {
      let all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from("agenda_items")
          .select("fornecedor, valor, custo, pax, cliente, cot, data, hora, tipo, origem, destino, placa, motorista, status_faturamento, estacionamento, outros, outros_despesas, km_extra, valor_km_extra, hora_extra, valor_hora_extra")
          .is("deleted_at", null)
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setItems(all);
    };
    fetchAll();
  }, []);

  const fornecedoresList = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.fornecedor) s.add(i.fornecedor); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const itemsFiltrados = useMemo(() => {
    return items.filter(i => {
      if (fornecedorFiltro !== "__all__" && (i.fornecedor || "") !== fornecedorFiltro) return false;
      if (dataInicio && (i.data || "") < dataInicio) return false;
      if (dataFim && (i.data || "") > dataFim) return false;
      return true;
    });
  }, [items, fornecedorFiltro, dataInicio, dataFim]);

  const dados = useMemo(() => {
    const map = new Map<string, {
      key: string;
      fornecedor: string;
      viagens: number;
      receita: number;
      custo: number;
      pax: number;
      clientes: string[];
      cots: string[];
    }>();

    itemsFiltrados.forEach((item) => {
      const key = item.fornecedor || "Sem fornecedor";
      const existing = map.get(key) || {
        key,
        fornecedor: key,
        viagens: 0,
        receita: 0,
        custo: 0,
        pax: 0,
        clientes: [],
        cots: [],
      };
      existing.viagens += 1;
      existing.receita += calcReceitaServico(item);
      existing.custo += Number(item.custo) || 0;
      existing.pax += Number(item.pax) || 0;
      if (item.cliente) existing.clientes.push(item.cliente);
      if (item.cot) existing.cots.push(item.cot);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.custo - a.custo);
  }, [itemsFiltrados]);

  const totalReceita = dados.reduce((s, d) => s + d.receita, 0);
  const totalCusto = dados.reduce((s, d) => s + d.custo, 0);

  const limparFiltros = () => {
    setFornecedorFiltro("__all__");
    setDataInicio("");
    setDataFim("");
  };
  const temFiltro = fornecedorFiltro !== "__all__" || dataInicio || dataFim;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Fornecedores" value={dados.length.toString()} />
        <StatCard label="Total Viagens" value={dados.reduce((s, d) => s + d.viagens, 0).toString()} />
        <StatCard label="Custo Total" value={formatCurrency(totalCusto)} />
        <StatCard label="Margem Total" value={formatCurrency(totalReceita - totalCusto)} accent />
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs text-muted-foreground">Fornecedor</Label>
            <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os fornecedores</SelectItem>
                {fornecedoresList.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data início</Label>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9 w-[160px]" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data fim</Label>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9 w-[160px]" />
          </div>
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-9 gap-1">
              <X className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={printWithFinancials} onChange={e => setPrintWithFinancials(e.target.checked)} className="rounded" />
          Incluir financeiro
        </label>
        <Button variant="outline" size="sm" onClick={() => printFatFornecedor(itemsFiltrados, printWithFinancials)} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={() => printFatFornecedorDetalhado(itemsFiltrados)} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Detalhado
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Fornecedor</TableHead>
              <TableHead className="font-semibold">Cliente(s)</TableHead>
              <TableHead className="font-semibold">O.S.</TableHead>
              <TableHead className="font-semibold text-center">Viagens</TableHead>
              <TableHead className="font-semibold text-center">SHT</TableHead>
              <TableHead className="font-semibold text-right">Receita</TableHead>
              <TableHead className="font-semibold text-right">Custo</TableHead>
              <TableHead className="font-semibold text-right">Margem</TableHead>
              <TableHead className="font-semibold text-right">% Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => (
              <TableRow key={d.key} className="transition-colors hover:bg-primary/5">
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {d.fornecedor}
                  </span>
                </TableCell>
                <TableCell className="max-w-[220px] text-xs text-muted-foreground">{formatCompactList(d.clientes)}</TableCell>
                <TableCell className="max-w-[220px] font-mono text-xs text-muted-foreground">{formatCompactList(d.cots, 3)}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {d.viagens}
                  </span>
                </TableCell>
                <TableCell className="text-center text-sm">{d.pax}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(d.receita)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(d.custo)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold text-accent">{formatCurrency(d.receita - d.custo)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {d.receita > 0 ? `${(((d.receita - d.custo) / d.receita) * 100).toFixed(1)}%` : "0%"}
                </TableCell>
              </TableRow>
            ))}
            {dados.length > 0 && (
              <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">TOTAL</TableCell>
                <TableCell className="text-center">{dados.reduce((s, d) => s + d.viagens, 0)}</TableCell>
                <TableCell className="text-center">{dados.reduce((s, d) => s + d.pax, 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(totalReceita)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatCurrency(totalCusto)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-accent">{formatCurrency(totalReceita - totalCusto)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {totalReceita > 0 ? `${(((totalReceita - totalCusto) / totalReceita) * 100).toFixed(1)}%` : "0%"}
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

export default FaturamentoFornecedor;
