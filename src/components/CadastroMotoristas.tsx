import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, User, Pencil, Settings2, X, Check, Filter } from "lucide-react";
import { Motorista, getMotoristas, saveMotorista, updateMotorista, deleteMotorista } from "@/data/cadastroStorage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emptyForm = { nome: "", cnh: "", telefone: "", email: "", categoria: "", tipos: [] as string[] };

interface TipoMotorista { id: string; nome: string; }

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");
const formatTelefone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 0) return `(${ddd}) `;
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
};

const CadastroMotoristas = () => {
  const [items, setItems] = useState<Motorista[]>([]);
  const [tipos, setTipos] = useState<TipoMotorista[]>([]);
  const [open, setOpen] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [novoTipo, setNovoTipo] = useState("");
  const [editingTipoId, setEditingTipoId] = useState<string | null>(null);
  const [editingTipoNome, setEditingTipoNome] = useState("");
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);

  const refresh = async () => {
    const data = await getMotoristas();
    setItems(data);
  };

  const refreshTipos = async () => {
    const { data } = await (supabase as any).from("tipos_motorista").select("id, nome").order("nome");
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
    const { error } = await (supabase as any).from("tipos_motorista").insert({ nome });
    if (error) { toast.error("Erro ao adicionar"); return; }
    setNovoTipo("");
    await refreshTipos();
    toast.success("Tipo adicionado!");
  };

  const handleUpdateTipo = async (id: string) => {
    const nome = editingTipoNome.trim();
    if (!nome) { toast.error("Nome obrigatório"); return; }
    const old = tipos.find((t) => t.id === id);
    const { error } = await (supabase as any).from("tipos_motorista").update({ nome }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    if (old && old.nome !== nome) {
      const afetados = items.filter((m) => (m.tipos || []).includes(old.nome));
      await Promise.all(afetados.map((m) => {
        const novos = (m.tipos || []).map((t) => t === old.nome ? nome : t);
        return (supabase as any).from("motoristas").update({ tipos: novos }).eq("id", m.id);
      }));
    }
    setEditingTipoId(null);
    setEditingTipoNome("");
    await refreshTipos();
    await refresh();
    toast.success("Tipo atualizado!");
  };

  const handleDeleteTipo = async (id: string, nome: string) => {
    if (!confirm(`Remover o tipo "${nome}"? Ele será também removido dos motoristas que o possuem.`)) return;
    const { error } = await (supabase as any).from("tipos_motorista").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    const afetados = items.filter((m) => (m.tipos || []).includes(nome));
    await Promise.all(afetados.map((m) => {
      const novos = (m.tipos || []).filter((t) => t !== nome);
      return (supabase as any).from("motoristas").update({ tipos: novos }).eq("id", m.id);
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

  const handleOpen = (motorista?: Motorista) => {
    if (motorista) {
      setEditingId(motorista.id);
      setForm({ nome: motorista.nome, cnh: motorista.cnh, telefone: motorista.telefone, email: motorista.email, categoria: motorista.categoria, tipos: motorista.tipos || [] });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editingId) {
        await updateMotorista(editingId, form);
        toast.success("Motorista atualizado!");
      } else {
        await saveMotorista(form);
        toast.success("Motorista cadastrado!");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error("Erro ao salvar motorista");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMotorista(id);
      await refresh();
      toast.success("Motorista removido");
    } catch (error) {
      toast.error("Erro ao remover motorista");
    }
  };

  const filteredItems = filtroTipos.length > 0
    ? items.filter((m) => (m.tipos || []).some((t) => filtroTipos.includes(t)))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {filtroTipos.length > 0
            ? `${filteredItems.length} de ${items.length} motorista(s)`
            : `${items.length} motorista(s) cadastrado(s)`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTiposOpen(true)} className="gap-2">
            <Settings2 className="h-4 w-4" /> Gerenciar Tipos
          </Button>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Motorista
          </Button>
        </div>
      </div>

      {tipos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {tipos.map((t) => {
            const ativo = filtroTipos.includes(t.nome);
            return (
              <button
                key={t.id}
                onClick={() =>
                  setFiltroTipos((prev) =>
                    ativo ? prev.filter((x) => x !== t.nome) : [...prev, t.nome]
                  )
                }
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  ativo
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
                }`}
              >
                {t.nome}
              </button>
            );
          })}
          {filtroTipos.length > 0 && (
            <button
              onClick={() => setFiltroTipos([])}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <Dialog open={tiposOpen} onOpenChange={setTiposOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Tipos de Motorista</DialogTitle>
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

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Motorista" : "Novo Motorista"}</DialogTitle>
            <DialogDescription>Preencha os dados do motorista</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNH</Label><Input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input placeholder="B, D, E..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div>
              <Label>Tipo de Motorista (selecione um ou mais)</Label>
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
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredItems.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          {items.length === 0 ? "Nenhum motorista cadastrado." : "Nenhum motorista corresponde aos filtros selecionados."}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Tipos</TableHead>
                <TableHead className="font-semibold">CNH</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.tipos || []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.cnh}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell className="text-sm">{item.telefone}</TableCell>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={() => handleOpen(item)}>
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

export default CadastroMotoristas;
