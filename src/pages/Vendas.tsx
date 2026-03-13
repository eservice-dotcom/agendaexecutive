import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ShoppingCart, Search, Check, FileText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo-executive-service.png";

interface Venda {
  id: string;
  cliente: string;
  data_venda: string;
  data_vencimento: string | null;
  valor_total: number;
  status: string;
  observacoes: string;
  created_at: string;
}

interface AgendaItem {
  id: string;
  cliente: string;
  data: string;
  hora: string;
  tipo: string;
  origem: string;
  destino: string;
  valor: number;
  motorista: string;
  veiculo: string;
  pax: number;
  cot: string;
  status_faturamento: string | null;
}

interface ContaPagar {
  fornecedor: string;
  descritivo: string;
  valor: number;
  data: string;
  data_vencimento: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const Vendas = () => {
  const { session, signOut } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  const [searchAgenda, setSearchAgenda] = useState("");
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);

  const loadVendas = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setVendas(data as Venda[]);
  }, []);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from("agenda_items")
      .select("cliente")
      .order("cliente");
    if (data) {
      const unique = [...new Set(data.map((d) => d.cliente))].filter(Boolean).sort();
      setClientes(unique);
    }
  }, []);

  const loadFornecedores = useCallback(async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("razao_social")
      .order("razao_social");
    if (data) {
      setFornecedores(data.map((f) => f.razao_social).filter(Boolean));
    }
  }, []);

  useEffect(() => {
    loadVendas();
    loadClientes();
    loadFornecedores();
  }, [loadVendas, loadClientes, loadFornecedores]);

  useEffect(() => {
    if (!cliente) {
      setAgendaItems([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("agenda_items")
        .select("id, cliente, data, hora, tipo, origem, destino, valor, motorista, veiculo, pax, cot, status_faturamento")
        .eq("cliente", cliente)
        .order("data", { ascending: true });
      if (data) setAgendaItems(data as AgendaItem[]);
    };
    load();
  }, [cliente]);

  const filteredAgendaItems = useMemo(() => {
    if (!searchAgenda) return agendaItems;
    const s = searchAgenda.toLowerCase();
    return agendaItems.filter(
      (i) =>
        i.cot.toLowerCase().includes(s) ||
        i.origem.toLowerCase().includes(s) ||
        i.destino.toLowerCase().includes(s) ||
        i.motorista.toLowerCase().includes(s) ||
        i.data.includes(s)
    );
  }, [agendaItems, searchAgenda]);

  const totalSelected = useMemo(() => {
    return agendaItems
      .filter((i) => selectedItems.has(i.id))
      .reduce((sum, i) => sum + i.valor, 0);
  }, [agendaItems, selectedItems]);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === filteredAgendaItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAgendaItems.map((i) => i.id)));
    }
  };

  const handleSave = async () => {
    if (!cliente || selectedItems.size === 0) {
      toast({ title: "Selecione um cliente e pelo menos um serviço", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          user_id: session!.user.id,
          cliente,
          data_venda: dataVenda,
          data_vencimento: dataVencimento || null,
          valor_total: totalSelected,
          status: "pendente",
          observacoes,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      const items = Array.from(selectedItems).map((agenda_item_id) => ({
        venda_id: venda.id,
        agenda_item_id,
        valor: agendaItems.find((i) => i.id === agenda_item_id)?.valor || 0,
      }));

      const { error: itemsError } = await supabase.from("venda_items").insert(items);
      if (itemsError) throw itemsError;

      await supabase
        .from("agenda_items")
        .update({ status_faturamento: "faturado" })
        .in("id", Array.from(selectedItems));

      // Save contas a pagar
      if (contasPagar.length > 0) {
        const contas = contasPagar.map((cp) => ({
          venda_id: venda.id,
          user_id: session!.user.id,
          fornecedor: cp.fornecedor,
          descritivo: cp.descritivo,
          valor: cp.valor,
          data: cp.data,
          data_vencimento: cp.data_vencimento || null,
          status: "pendente",
        }));
        const { error: contasError } = await supabase.from("contas_pagar").insert(contas);
        if (contasError) throw contasError;
      }

      toast({ title: "Venda criada com sucesso!" });
      setDialogOpen(false);
      resetForm();
      loadVendas();
    } catch (err: any) {
      toast({ title: "Erro ao salvar venda", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCliente("");
    setSelectedItems(new Set());
    setObservacoes("");
    setDataVenda(new Date().toISOString().split("T")[0]);
    setDataVencimento("");
    setSearchAgenda("");
    setContasPagar([]);
  };

  const addContaPagar = () => {
    setContasPagar((prev) => [
      ...prev,
      { fornecedor: "", descritivo: "", valor: 0, data: new Date().toISOString().split("T")[0], data_vencimento: "" },
    ]);
  };

  const updateContaPagar = (index: number, field: keyof ContaPagar, value: string | number) => {
    setContasPagar((prev) => prev.map((cp, i) => (i === index ? { ...cp, [field]: value } : cp)));
  };

  const removeContaPagar = (index: number) => {
    setContasPagar((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    await supabase.from("vendas").delete().eq("id", id);
    loadVendas();
    toast({ title: "Venda excluída" });
  };

  const handleCancelar = async (venda: Venda) => {
    if (!confirm("Cancelar esta venda? Os serviços vinculados voltarão ao status anterior.")) return;
    try {
      // Get linked agenda_item_ids
      const { data: items } = await supabase
        .from("venda_items")
        .select("agenda_item_id")
        .eq("venda_id", venda.id);

      // Revert status_faturamento
      if (items && items.length > 0) {
        await supabase
          .from("agenda_items")
          .update({ status_faturamento: "" })
          .in("id", items.map((i) => i.agenda_item_id));
      }

      // Update venda status
      await supabase.from("vendas").update({ status: "cancelado" }).eq("id", venda.id);

      toast({ title: "Venda cancelada" });
      loadVendas();
    } catch (err: any) {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    }
  };

  const handleGerarFatura = async (venda: Venda) => {
    // Load venda_items with agenda details
    const { data: vendaItems } = await supabase
      .from("venda_items")
      .select("*, agenda_items:agenda_item_id(cot, data, hora, tipo, origem, destino, pax, motorista, veiculo)")
      .eq("venda_id", venda.id);

    const items = vendaItems || [];

    const logoUrl = new URL(logo, window.location.origin).href;

    const rows = items.map((item: any, idx: number) => {
      const ai = item.agenda_items;
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${ai?.cot || ""}</td>
        <td>${ai?.data ? formatDate(ai.data) : ""}</td>
        <td>${ai?.tipo || ""}</td>
        <td>${ai?.origem || ""} → ${ai?.destino || ""}</td>
        <td class="c">${ai?.pax || ""}</td>
        <td class="r">${formatCurrency(item.valor)}</td>
      </tr>`;
    }).join("");

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Fatura - ${venda.cliente}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:12px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #b8860b;padding-bottom:16px}
.header img{height:60px}
.header-info{text-align:right}
.header-info h1{font-size:22px;color:#b8860b;margin-bottom:4px}
.header-info p{font-size:11px;color:#666}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.info-box{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:12px}
.info-box h3{font-size:11px;text-transform:uppercase;color:#888;margin-bottom:6px;letter-spacing:0.5px}
.info-box p{font-size:12px;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
th{background:#2d3748;color:#fff;font-weight:600;font-size:10px;text-transform:uppercase}
.r{text-align:right}.c{text-align:center}
.total-row{background:#f7f7f7;font-weight:bold;font-size:13px}
.footer{margin-top:24px;padding-top:12px;border-top:2px solid #b8860b;text-align:center;font-size:10px;color:#888}
@media print{body{padding:15px}@page{size:A4 portrait;margin:15mm}}
</style></head><body>
<div class="header">
  <img src="${logoUrl}" alt="Executive Service" />
  <div class="header-info">
    <h1>FATURA</h1>
    <p>Emitida em: ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <h3>Cliente</h3>
    <p><strong>${venda.cliente}</strong></p>
  </div>
  <div class="info-box">
    <h3>Detalhes</h3>
    <p><strong>Data da Venda:</strong> ${formatDate(venda.data_venda)}</p>
    ${venda.data_vencimento ? `<p><strong>Vencimento:</strong> ${formatDate(venda.data_vencimento)}</p>` : ""}
    <p><strong>Status:</strong> ${venda.status.toUpperCase()}</p>
  </div>
</div>

<table>
  <thead><tr>
    <th class="c">#</th><th>O.S.</th><th>Data</th><th>Tipo</th>
    <th>Origem → Destino</th><th class="c">PAX</th><th class="r">Valor</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="6" class="r">TOTAL</td>
      <td class="r">${formatCurrency(venda.valor_total)}</td>
    </tr>
  </tbody>
</table>

${venda.observacoes ? `<div style="margin-top:16px;padding:10px;background:#fffbeb;border:1px solid #f0d68a;border-radius:4px"><strong>Observações:</strong> ${venda.observacoes}</div>` : ""}

<div class="footer">
  <p>Executive Service — Fatura gerada automaticamente</p>
</div>
</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pago": return "default";
      case "pendente": return "secondary";
      case "cancelado": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <img src={logo} alt="Executive Service" className="h-10" />
          <div className="flex items-center gap-4">
            <Link to="/">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <ArrowLeft className="h-4 w-4" /> Agenda
              </span>
            </Link>
            <button onClick={signOut} className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" /> Vendas
          </h1>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Venda
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma venda registrada
                  </TableCell>
                </TableRow>
              ) : (
                vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{formatDate(v.data_venda)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {v.data_vencimento ? formatDate(v.data_vencimento) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{v.cliente}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(v.valor_total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(v.status) as any}>{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {v.observacoes}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleGerarFatura(v)} title="Gerar Fatura">
                          <FileText className="h-4 w-4 text-primary" />
                        </Button>
                        {v.status !== "cancelado" && (
                          <Button variant="ghost" size="icon" onClick={() => handleCancelar(v)} title="Cancelar Venda">
                            <XCircle className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={cliente} onValueChange={setCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Total Selecionado</Label>
                  <div className="h-10 flex items-center rounded-md border border-input bg-muted px-3 font-bold text-foreground">
                    {formatCurrency(totalSelected)}
                  </div>
                </div>
              </div>

              {cliente && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Serviços da Agenda</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar..."
                            value={searchAgenda}
                            onChange={(e) => setSearchAgenda(e.target.value)}
                            className="pl-8 h-9 w-48"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          <Check className="h-4 w-4 mr-1" />
                          {selectedItems.size === filteredAgendaItems.length ? "Desmarcar" : "Selecionar"} Todos
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border border-border max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]" />
                            <TableHead>COT</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Origem → Destino</TableHead>
                            <TableHead>PAX</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAgendaItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                                Nenhum serviço encontrado para este cliente
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAgendaItems.map((item) => (
                              <TableRow
                                key={item.id}
                                className={`cursor-pointer ${selectedItems.has(item.id) ? "bg-accent/50" : ""}`}
                                onClick={() => toggleItem(item.id)}
                              >
                                <TableCell>
                                  <Checkbox checked={selectedItems.has(item.id)} />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{item.cot}</TableCell>
                                <TableCell className="font-mono text-xs">{formatDate(item.data)}</TableCell>
                                <TableCell className="text-xs">{item.tipo}</TableCell>
                                <TableCell className="text-xs">{item.origem} → {item.destino}</TableCell>
                                <TableCell className="text-center">{item.pax}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatCurrency(item.valor)}</TableCell>
                                <TableCell>
                                  {item.status_faturamento && (
                                    <Badge variant="outline" className="text-xs">{item.status_faturamento}</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedItems.size} serviço(s) selecionado(s)
                    </p>
                  </div>
                </>
              )}

              {/* Contas a Pagar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Contas a Pagar</Label>
                  <Button variant="outline" size="sm" onClick={addContaPagar} type="button">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {contasPagar.length > 0 && (
                  <div className="space-y-3">
                    {contasPagar.map((cp, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end rounded-md border border-border p-3 bg-muted/30">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Fornecedor</Label>
                          <Select value={cp.fornecedor} onValueChange={(v) => updateContaPagar(idx, "fornecedor", v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {fornecedores.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descritivo</Label>
                          <Input className="h-9" value={cp.descritivo} onChange={(e) => updateContaPagar(idx, "descritivo", e.target.value)} placeholder="Descrição" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor</Label>
                          <Input className="h-9" type="number" step="0.01" value={cp.valor || ""} onChange={(e) => updateContaPagar(idx, "valor", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vencimento</Label>
                          <Input className="h-9" type="date" value={cp.data_vencimento} onChange={(e) => updateContaPagar(idx, "data_vencimento", e.target.value)} />
                        </div>
                        <div className="flex items-end">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeContaPagar(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Total contas: {formatCurrency(contasPagar.reduce((s, cp) => s + cp.valor, 0))}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={loading || selectedItems.size === 0}>
                {loading ? "Salvando..." : "Criar Venda"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Vendas;
