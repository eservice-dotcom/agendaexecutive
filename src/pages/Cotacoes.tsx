import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-executive-service.png";
import { Plus, Trash2, Save, Pencil, FileText, CalendarDays, ClipboardList, ShoppingCart, Printer } from "lucide-react";
import { printCotacao } from "@/lib/printUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CotacaoItem {
  id?: string;
  descritivo: string;
  valor: number;
  hora_extra: string;
  km_extra: number;
}

interface Cotacao {
  id: string;
  numero_cotacao: number;
  nome: string;
  empresa: string;
  destinatario: string;
  data: string;
  forma_pagamento: string;
  validade_proposta: string;
  observacoes: string;
  valor_total: number;
  status: string;
  items: CotacaoItem[];
}

const statusOptions = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  { value: "aprovada", label: "Aprovada", color: "bg-green-100 text-green-800" },
  { value: "recusada", label: "Recusada", color: "bg-red-100 text-red-800" },
];

const formasPagamento = ["", "Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência", "Faturado"];

const Cotacoes = () => {
  const { session, signOut } = useAuth();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCotacao, setEditingCotacao] = useState<Cotacao | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [validadeProposta, setValidadeProposta] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState("pendente");
  const [items, setItems] = useState<CotacaoItem[]>([{ descritivo: "", valor: 0, hora_extra: "", km_extra: 0 }]);

  useEffect(() => {
    if (session?.user?.id) {
      checkPermissions();
      loadCotacoes();
    }
  }, [session]);

  const checkPermissions = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.rpc("can_view_financials", { _user_id: session.user.id });
    setHasPermission(!!data);
  };

  const loadCotacoes = useCallback(async () => {
    setLoading(true);
    const { data: cotacoesData, error } = await supabase
      .from("cotacoes")
      .select("*")
      .order("numero_cotacao", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar cotações");
      setLoading(false);
      return;
    }

    const cotacoesWithItems: Cotacao[] = [];
    for (const c of cotacoesData || []) {
      const { data: itemsData } = await supabase
        .from("cotacao_items")
        .select("*")
        .eq("cotacao_id", c.id)
        .order("created_at", { ascending: true });

      cotacoesWithItems.push({
        id: c.id,
        numero_cotacao: c.numero_cotacao,
        nome: c.nome,
        empresa: c.empresa || "",
        destinatario: c.destinatario || "",
        data: c.data,
        forma_pagamento: c.forma_pagamento,
        validade_proposta: c.validade_proposta || "",
        observacoes: c.observacoes || "",
        valor_total: c.valor_total,
        status: c.status,
        items: (itemsData || []).map((i: any) => ({
          id: i.id,
          descritivo: i.descritivo,
          valor: i.valor,
          hora_extra: i.hora_extra || "",
          km_extra: i.km_extra || 0,
        })),
      });
    }

    setCotacoes(cotacoesWithItems);
    setLoading(false);
  }, []);

  const resetForm = () => {
    setNome("");
    setEmpresa("");
    setDestinatario("");
    setData(new Date().toISOString().split("T")[0]);
    setFormaPagamento("");
    setValidadeProposta("");
    setObservacoes("");
    setStatus("pendente");
    setItems([{ descritivo: "", valor: 0, hora_extra: "", km_extra: 0 }]);
    setEditingCotacao(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: Cotacao) => {
    setEditingCotacao(c);
    setNome(c.nome);
    setEmpresa(c.empresa);
    setDestinatario(c.destinatario);
    setData(c.data);
    setFormaPagamento(c.forma_pagamento);
    setValidadeProposta(c.validade_proposta);
    setObservacoes(c.observacoes);
    setStatus(c.status);
    setItems(c.items.length > 0 ? c.items : [{ descritivo: "", valor: 0, hora_extra: "", km_extra: 0 }]);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { descritivo: "", valor: 0, hora_extra: "", km_extra: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof CotacaoItem, value: any) => {
    const arr = [...items];
    arr[idx] = { ...arr[idx], [field]: value };
    setItems(arr);
  };

  const calcTotal = () => items.reduce((sum, i) => sum + (i.valor || 0), 0);

  const handleSave = async () => {
    if (!empresa.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    if (!session?.user?.id) return;

    const valorTotal = calcTotal();

    try {
      if (editingCotacao) {
        // Update
        const { error } = await supabase
          .from("cotacoes")
          .update({
            nome: empresa,
            empresa,
            destinatario,
            data,
            forma_pagamento: formaPagamento,
            validade_proposta: validadeProposta || null,
            observacoes,
            valor_total: valorTotal,
            status,
          })
          .eq("id", editingCotacao.id);

        if (error) throw error;

        // Delete old items and insert new
        await supabase.from("cotacao_items").delete().eq("cotacao_id", editingCotacao.id);

        const itemsToInsert = items
          .filter((i) => i.descritivo.trim())
          .map((i) => ({
            cotacao_id: editingCotacao.id,
            descritivo: i.descritivo,
            valor: i.valor || 0,
            hora_extra: i.hora_extra || "",
            km_extra: i.km_extra || 0,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase.from("cotacao_items").insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        toast.success("Cotação atualizada!");
      } else {
        // Insert
        const { data: newCotacao, error } = await supabase
          .from("cotacoes")
          .insert({
            user_id: session.user.id,
            nome: empresa,
            empresa,
            destinatario,
            data,
            forma_pagamento: formaPagamento,
            validade_proposta: validadeProposta || null,
            observacoes,
            valor_total: valorTotal,
            status,
          })
          .select()
          .single();

        if (error) throw error;

        const itemsToInsert = items
          .filter((i) => i.descritivo.trim())
          .map((i) => ({
            cotacao_id: newCotacao.id,
            descritivo: i.descritivo,
            valor: i.valor || 0,
            hora_extra: i.hora_extra || "",
            km_extra: i.km_extra || 0,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase.from("cotacao_items").insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        toast.success("Cotação criada!");
      }

      setDialogOpen(false);
      resetForm();
      loadCotacoes();
    } catch (error) {
      toast.error("Erro ao salvar cotação.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta cotação?")) return;
    const { error } = await supabase.from("cotacoes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir cotação");
      return;
    }
    toast.success("Cotação excluída!");
    loadCotacoes();
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const getStatusBadge = (s: string) => {
    const opt = statusOptions.find((o) => o.value === s);
    return opt ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>{opt.label}</span> : s;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-full bg-white p-1 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">Cotações</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <CalendarDays className="h-4 w-4" /> Agenda
              </span>
            </Link>
            {hasPermission && (
              <Link to="/vendas">
                <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                  <ShoppingCart className="h-4 w-4" /> Vendas
                </span>
              </Link>
            )}
            <Link to="/cadastros">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <ClipboardList className="h-4 w-4" /> Cadastros
              </span>
            </Link>
            <button onClick={signOut} className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Cotações
          </h2>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Cotação
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-10">Carregando...</p>
        ) : cotacoes.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Nenhuma cotação encontrada.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Nº</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Pgto</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacoes.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)}>
                    <TableCell className="font-medium">{c.numero_cotacao}</TableCell>
                    <TableCell>{c.nome}</TableCell>
                    <TableCell>{formatDate(c.data)}</TableCell>
                    <TableCell>{c.validade_proposta ? formatDate(c.validade_proposta) : "-"}</TableCell>
                    <TableCell>{c.forma_pagamento || "-"}</TableCell>
                    <TableCell>{c.items.length}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(c.valor_total)}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          const logoUrl = new URL(logo, window.location.origin).href;
                          printCotacao(c, logoUrl);
                        }}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {editingCotacao ? "Editar Cotação" : "Nova Cotação"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Empresa *</Label>
              <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-1.5">
              <Label>Destinatário</Label>
              <Input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Nome do destinatário" />
            </div>

            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Validade da Proposta</Label>
              <Input type="date" value={validadeProposta} onChange={(e) => setValidadeProposta(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento || "_empty"} onValueChange={(v) => setFormaPagamento(v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">-- Selecione --</SelectItem>
                  {formasPagamento.filter(Boolean).map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações gerais" rows={3} />
            </div>

            {/* Itens */}
            <div className="sm:col-span-2 border-t pt-3 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-muted-foreground">Itens da Cotação</p>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Adicionar Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs">Descritivo</Label>
                        <Input
                          value={item.descritivo}
                          onChange={(e) => updateItem(idx, "descritivo", e.target.value)}
                          placeholder="Descrição do serviço"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.valor || ""}
                          onChange={(e) => updateItem(idx, "valor", parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hora Extra (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.hora_extra || ""}
                          onChange={(e) => updateItem(idx, "hora_extra", e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">KM Extra</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.km_extra || ""}
                          onChange={(e) => updateItem(idx, "km_extra", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-right">
                <span className="text-sm font-semibold">
                  Total: {formatCurrency(calcTotal())}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> {editingCotacao ? "Salvar Alterações" : "Criar Cotação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cotacoes;
