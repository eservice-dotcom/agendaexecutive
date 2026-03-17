import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateClosingReport } from "@/lib/closingReport";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Search, Pencil, Trash2, Save, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

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
  observacoes: string | null;
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

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Fechamento | null>(null);
  const [editCliente, setEditCliente] = useState("");
  const [editDataEmissao, setEditDataEmissao] = useState("");
  const [editValorTotal, setEditValorTotal] = useState("");
  const [editExtrasTotal, setEditExtrasTotal] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Fechamento | null>(null);

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

  const resolveExtras = (f: Fechamento) => {
    const extras = Array.isArray(f.extras) ? f.extras.filter((e: any) => e && e.descricao) : [];
    if (extras.length === 0 && f.extras_total > 0) {
      return [{ descricao: "Extras", valor: f.extras_total }];
    }
    return extras;
  };

  const handleReimprimir = (f: Fechamento) => {
    const items = Array.isArray(f.items) ? f.items : [];
    const extras = resolveExtras(f);

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

  const handleExportExcel = (f: Fechamento) => {
    const items = Array.isArray(f.items) ? f.items : [];
    const extras = Array.isArray(f.extras) ? f.extras : [];

    generateClosingReportExcel(
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

  const openEdit = (f: Fechamento) => {
    setEditItem(f);
    setEditCliente(f.cliente);
    setEditDataEmissao(f.data_emissao);
    setEditValorTotal(String(f.valor_total));
    setEditExtrasTotal(String(f.extras_total));
    setEditObservacoes(f.observacoes || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const { error } = await supabase
      .from("fechamentos")
      .update({
        cliente: editCliente,
        data_emissao: editDataEmissao,
        valor_total: parseFloat(editValorTotal) || 0,
        extras_total: parseFloat(editExtrasTotal) || 0,
        observacoes: editObservacoes,
      })
      .eq("id", editItem.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Fechamento atualizado com sucesso");
      setEditOpen(false);
      await loadFechamentos();
    }
    setSaving(false);
  };

  const openDelete = (f: Fechamento) => {
    setDeleteItem(f);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    // Delete linked items first, then the fechamento
    await supabase.from("fechamento_items").delete().eq("fechamento_id", deleteItem.id);
    const { error } = await supabase.from("fechamentos").delete().eq("id", deleteItem.id);

    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success(`Fechamento Nº ${deleteItem.numero_fechamento} excluído`);
      setDeleteOpen(false);
      await loadFechamentos();
    }
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
              <TableHead>O.S.</TableHead>
              <TableHead className="w-[110px]">Data</TableHead>
              <TableHead className="w-[60px] text-center">Serv.</TableHead>
              <TableHead className="w-[120px] text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-right">Extras</TableHead>
              <TableHead className="w-[120px] text-right">Total</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum fechamento encontrado</TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => {
                const osList = Array.isArray(f.items) ? [...new Set(f.items.map((i: any) => i.cot).filter(Boolean))].join(", ") : "";
                return (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {f.numero_fechamento}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{f.cliente}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px] truncate" title={osList}>{osList || "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(f.data_emissao)}</TableCell>
                  <TableCell className="text-center text-sm">{f.quantidade_servicos}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(f.valor_total)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(f.extras_total)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(f.valor_total + f.extras_total)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReimprimir(f)}
                        title="Reimprimir fechamento"
                      >
                        <Printer className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleExportExcel(f)}
                        title="Exportar Excel"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(f)}
                        title="Editar fechamento"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDelete(f)}
                        title="Excluir fechamento"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar Fechamento Nº {editItem?.numero_fechamento}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input value={editCliente} onChange={(e) => setEditCliente(e.target.value)} />
            </div>
            <div>
              <Label>Data de Emissão</Label>
              <Input type="date" value={editDataEmissao} onChange={(e) => setEditDataEmissao(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValorTotal}
                  onChange={(e) => setEditValorTotal(e.target.value)}
                />
              </div>
              <div>
                <Label>Extras Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editExtrasTotal}
                  onChange={(e) => setEditExtrasTotal(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja excluir o fechamento Nº <strong>{deleteItem?.numero_fechamento}</strong> do cliente <strong>{deleteItem?.cliente}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FechamentosConsulta;
