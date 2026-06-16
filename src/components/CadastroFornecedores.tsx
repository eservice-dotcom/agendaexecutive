import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Building2, Pencil, Settings2, X, Check, Filter } from "lucide-react";
import { Fornecedor, getFornecedores, saveFornecedor, updateFornecedor, deleteFornecedor } from "@/data/cadastroStorage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emptyForm = { razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "", tipos: [] as string[] };

interface TipoFornecedor { id: string; nome: string; }

const CadastroFornecedores = () => {
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
  const [open, setOpen] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [novoTipo, setNovoTipo] = useState("");
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [editingTipoNome, setEditingTipoNome] = useState("");
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);

  const refresh = async () => {
    const data = await getFornecedores();
    setItems(data);
  };

  const refreshTipos = async () => {
    const { data } = await supabase.from("tipos_fornecedor").select("id, nome").order("nome");
    if (data) setTipos(data);
  };

  useEffect(() => {
    refresh();
    refreshTipos();
  }, []);

  const handleAddTipo = async () => {
    const nome = novoTipo.trim();
    if (!nome) { toast.error("Digite o nome do tipo"); return; }
    if (tipos.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Esse tipo já existe"); return;
    }
    const { error } = await supabase.from("tipos_fornecedor").insert({ nome });
    if (error) { toast.error("Erro ao adicionar"); return; }
    setNovoTipo("");
    await refreshTipos();
    toast.success("Tipo adicionado!");
  };

  const handleUpdateTipo = async (id: string) => {
    const nome = editingTipoNome.trim();
    if (!nome) { toast.error("Nome obrigatório"); return; }
    const old = tipos.find((t) => t.id === id);
    const { error } = await supabase.from("tipos_fornecedor").update({ nome }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    if (old && old.nome !== nome) {
      const afetados = items.filter((f) => (f.tipos || []).includes(old.nome));
      await Promise.all(afetados.map((f) => {
        const novos = (f.tipos || []).map((t) => t === old.nome ? nome : t);
        return supabase.from("fornecedores").update({ tipos: novos }).eq("id", f.id);
      }));
    }
    setEditingTipoId(null);
    setEditingTipoNome("");
    await refreshTipos();
    await refresh();
    toast.success("Tipo atualizado!");
  };

  const handleDeleteTipo = async (id: string, nome: string) => {
    if (!confirm(`Remover o tipo "${nome}"? Ele será também removido dos fornecedores que o possuem.`)) return;
    const { error } = await supabase.from("tipos_fornecedor").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    const afetados = items.filter((f) => (f.tipos || []).includes(nome));
    await Promise.all(afetados.map((f) => {
      const novos = (f.tipos || []).filter((t) => t !== nome);
      return supabase.from("fornecedores").update({ tipos: novos }).eq("id", f.id);
    }));
    await refreshTipos();
    await refresh();
    toast.success("Tipo removido!");
  };

  const toggleTipo = (tipo: string) => {
    setForm((f) => ({
      ...f,
      tipos: f.tipos.includes(tipo) ? f.tipos.filter((t) => t !== tipo) : [...f.tipos, tipo],
    }));
  };

  const handleSave = async () => {
    if (!form.razaoSocial.trim()) { toast.error("Razão Social é obrigatória"); return; }
    try {
      if (editingId) {
        const old = items.find(i => i.id === editingId);
        await updateFornecedor(editingId, form, old?.razaoSocial);
        toast.success("Fornecedor atualizado!");
      } else {
        await saveFornecedor(form);
        toast.success("Fornecedor cadastrado!");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error("Erro ao salvar fornecedor");
    }
  };

  const handleEdit = (item: Fornecedor) => {
    setEditingId(item.id);
    setForm({ razaoSocial: item.razaoSocial, cnpj: item.cnpj, contato: item.contato, telefone: item.telefone, email: item.email, pix: item.pix, tipos: item.tipos || [] });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFornecedor(id);
      await refresh();
      toast.success("Fornecedor removido");
    } catch (error) {
      toast.error("Erro ao remover fornecedor");
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          {items.length} fornecedor(es) cadastrado(s)
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTiposOpen(true)} className="gap-2">
            <Settings2 className="h-4 w-4" /> Gerenciar Tipos
          </Button>
          <Button onClick={handleOpenNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Fornecedor
          </Button>
        </div>

        <Dialog open={tiposOpen} onOpenChange={setTiposOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Tipos de Fornecedor</DialogTitle>
              <DialogDescription>Adicione, edite ou remova os tipos disponíveis.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Novo tipo..."
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTipo()}
                />
                <Button onClick={handleAddTipo} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
              <div className="rounded-md border border-border divide-y">
                {tipos.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Nenhum tipo cadastrado.</div>
                ) : tipos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2">
                    {editingTipoId === t.id ? (
                      <>
                        <Input
                          value={editingTipoNome}
                          onChange={(e) => setEditingTipoNome(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateTipo(t.id)}
                          className="h-8"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUpdateTipo(t.id)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingTipoId(null); setEditingTipoNome(""); }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">{t.nome}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingTipoId(t.id); setEditingTipoNome(t.nome); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTipo(t.id, t.nome)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Razão Social *</Label><Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>PIX</Label><Input value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="Chave PIX (CPF, CNPJ, e-mail, telefone ou aleatória)" /></div>
            <div>
              <Label>Tipo de Fornecedor (selecione um ou mais)</Label>
              <div className="mt-2 flex flex-wrap gap-3 rounded-md border border-border p-3">
                {tipos.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhum tipo cadastrado. Clique em "Gerenciar Tipos".</span>
                ) : tipos.map((tipo) => (
                  <label key={tipo.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={form.tipos.includes(tipo.nome)} onCheckedChange={() => toggleTipo(tipo.nome)} />
                    <span>{tipo.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleSave}>{editingId ? "Atualizar" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">Nenhum fornecedor cadastrado.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Razão Social</TableHead>
                <TableHead className="font-semibold">Tipos</TableHead>
                <TableHead className="font-semibold">CNPJ</TableHead>
                <TableHead className="font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">PIX</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.razaoSocial}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.tipos || []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.cnpj}</TableCell>
                  <TableCell className="text-sm">{item.contato}</TableCell>
                  <TableCell className="text-sm">{item.telefone}</TableCell>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell className="text-sm">{item.pix}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(item.id)}>
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
    </div>
  );
};

export default CadastroFornecedores;
