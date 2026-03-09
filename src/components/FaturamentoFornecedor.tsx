import { useMemo, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { printFatFornecedor } from "@/lib/printUtils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const FaturamentoFornecedor = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("agenda_items").select("*").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

  const dados = useMemo(() => {
    const map = new Map<string, { fornecedor: string; viagens: number; receita: number; custo: number; pax: number }>();
    items.forEach((item) => {
      const existing = map.get(item.fornecedor) || { fornecedor: item.fornecedor, viagens: 0, receita: 0, custo: 0, pax: 0 };
      existing.viagens += 1;
      existing.receita += Number(item.valor);
      existing.custo += Number(item.custo);
      existing.pax += Number(item.pax);
      map.set(item.fornecedor, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.custo - a.custo);
  }, [items]);

  const totalReceita = dados.reduce((s, d) => s + d.receita, 0);
  const totalCusto = dados.reduce((s, d) => s + d.custo, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Fornecedores" value={dados.length.toString()} />
        <StatCard label="Total Viagens" value={dados.reduce((s, d) => s + d.viagens, 0).toString()} />
        <StatCard label="Custo Total" value={formatCurrency(totalCusto)} />
        <StatCard label="Margem Total" value={formatCurrency(totalReceita - totalCusto)} accent />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => printFatFornecedor(items)} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Fornecedor</TableHead>
              <TableHead className="font-semibold text-center">Viagens</TableHead>
              <TableHead className="font-semibold text-center">PAX</TableHead>
              <TableHead className="font-semibold text-right">Receita</TableHead>
              <TableHead className="font-semibold text-right">Custo</TableHead>
              <TableHead className="font-semibold text-right">Margem</TableHead>
              <TableHead className="font-semibold text-right">% Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((d) => (
              <TableRow key={d.fornecedor} className="transition-colors hover:bg-primary/5">
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {d.fornecedor}
                  </span>
                </TableCell>
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
