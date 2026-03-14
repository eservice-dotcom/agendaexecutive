import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateClosingReport } from "@/lib/closingReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Printer } from "lucide-react";

interface Fechamento {
  id: string;
  numero_fechamento: number;
  cliente: string;
  data_emissao: string;
  valor_total: number;
  extras_total: number;
  quantidade_servicos: number;
  items: any[];
  extras: any[];
  created_at: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const FechamentosConsulta = () => {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");

  const loadFechamentos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fechamentos")
      .select("*")
      .order("numero_fechamento", { ascending: false });
    if (data) setFechamentos(data as Fechamento[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFechamentos();
  }, [loadFechamentos]);

  const clientes = useMemo(() => {
    return [...new Set(fechamentos.map((f) => f.cliente))].filter(Boolean).sort();
  }, [fechamentos]);

  const filtered = useMemo(() => {
    return fechamentos.filter((f) => {
      if (filterCliente && f.cliente !== filterCliente) return false;
      if (filterDataInicio && f.data_emissao < filterDataInicio) return false;
      if (filterDataFim && f.data_emissao > filterDataFim) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        const matchNum = String(f.numero_fechamento).includes(s);
        const matchCliente = f.cliente.toLowerCase().includes(s);
        if (!matchNum && !matchCliente) return false;
      }
      return true;
    });
  }, [fechamentos, filterCliente, filterDataInicio, filterDataFim, searchText]);

  const handleReimprimir = (f: Fechamento) => {
    const items = Array.isArray(f.items) ? f.items : [];
    const extras = Array.isArray(f.extras) ? f.extras : [];

    generateClosingReport(
      items,
      `Fechamento Nº ${f.numero_fechamento} - ${f.cliente}`,
      f.cliente,
      {
        cliente: f.cliente,
        extras,
      },
      f.numero_fechamento
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nº ou cliente..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterCliente} onValueChange={(v) => setFilterCliente(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDataInicio}
          onChange={(e) => setFilterDataInicio(e.target.value)}
          placeholder="Data início"
          className="h-9"
        />
        <Input
          type="date"
          value={filterDataFim}
          onChange={(e) => setFilterDataFim(e.target.value)}
          placeholder="Data fim"
          className="h-9"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} fechamento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[110px]">Data</TableHead>
              <TableHead className="w-[60px] text-center">Serv.</TableHead>
              <TableHead className="w-[120px] text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-right">Extras</TableHead>
              <TableHead className="w-[120px] text-right">Total</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum fechamento encontrado</TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {f.numero_fechamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{f.cliente}</TableCell>
                  <TableCell className="text-sm">{formatDate(f.data_emissao)}</TableCell>
                  <TableCell className="text-center text-sm">{f.quantidade_servicos}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(f.valor_total)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(f.extras_total)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(f.valor_total + f.extras_total)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleReimprimir(f)}
                      title="Reimprimir fechamento"
                    >
                      <Printer className="h-4 w-4 text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FechamentosConsulta;
