import { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const FaturamentoVeiculo = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("agenda_items").select("*").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  const dados = useMemo(() => {
    const map = new Map<string, { veiculo: string; placa: string; viagens: number; receita: number; custo: number }>();
    items.forEach((item) => {
      const key = item.placa;
      const existing = map.get(key) || { veiculo: item.veiculo, placa: item.placa, viagens: 0, receita: 0, custo: 0 };
      existing.viagens += 1;
      existing.receita += Number(item.valor);
      existing.custo += Number(item.custo);
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  }, [items]);

  const totalReceita = dados.reduce((s, d) => s + d.receita, 0);
  const totalCusto = dados.reduce((s, d) => s + d.custo, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Veículos" value={dados.length.toString()} />
        <StatCard label="Total Viagens" value={dados.reduce((s, d) => s + d.viagens, 0).toString()} />
        <StatCard label="Receita Total" value={formatCurrency(totalReceita)} accent />
        <StatCard label="Margem Total" value={formatCurrency(totalReceita - totalCusto)} />
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Veículo</TableHead>
              <TableHead className="font-semibold">Placa</TableHead>
              <TableHead className="font-semibold text-center">Viagens</TableHead>
              <TableHead className="font-semibold text-right">Receita</TableHead>
              <TableHead className="font-semibold text-right">Custo</TableHead>
              <TableHead className="font-semibold text-right">Margem</TableHead>
              <TableHead className="font-semibold text-right">% Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => (
              <TableRow key={d.placa} className="transition-colors hover:bg-primary/5">
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    {d.veiculo}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{d.placa}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {d.viagens}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(d.receita)}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(d.custo)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold text-accent">{formatCurrency(d.receita - d.custo)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {d.receita > 0 ? `${(((d.receita - d.custo) / d.receita) * 100).toFixed(1)}%` : "0%"}
                </TableCell>
              </TableRow>
            ))}
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
