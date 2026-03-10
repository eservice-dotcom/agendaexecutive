import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, User, Pencil } from "lucide-react";
import { Motorista, getMotoristas, saveMotorista, updateMotorista, deleteMotorista } from "@/data/cadastroStorage";
import { toast } from "sonner";

const emptyForm = { nome: "", cnh: "", telefone: "", email: "", categoria: "" };

const CadastroMotoristas = () => {
  const [items, setItems] = useState<Motorista[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    const data = await getMotoristas();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = (motorista?: Motorista) => {
    if (motorista) {
      setEditingId(motorista.id);
      setForm({ nome: motorista.nome, cnh: motorista.cnh, telefone: motorista.telefone, email: motorista.email, categoria: motorista.categoria });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {items.length} motorista(s) cadastrado(s)
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Motorista
        </Button>
      </div>

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
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">Nenhum motorista cadastrado.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">CNH</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
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
