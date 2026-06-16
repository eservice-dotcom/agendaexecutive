import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Building2, Pencil } from "lucide-react";
import { Fornecedor, TIPOS_FORNECEDOR, getFornecedores, saveFornecedor, updateFornecedor, deleteFornecedor } from "@/data/cadastroStorage";
import { toast } from "sonner";

const emptyForm = { razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "", tipos: [] as string[] };

const CadastroFornecedores = () => {
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    const data = await getFornecedores();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

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
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </Button>
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
                {TIPOS_FORNECEDOR.map((tipo) => (
                  <label key={tipo} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={form.tipos.includes(tipo)} onCheckedChange={() => toggleTipo(tipo)} />
                    <span>{tipo}</span>
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
