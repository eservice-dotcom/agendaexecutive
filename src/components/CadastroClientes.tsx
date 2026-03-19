import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users, Pencil } from "lucide-react";
import { Cliente, getClientes, saveCliente, updateCliente, deleteCliente } from "@/data/cadastroStorage";
import { toast } from "sonner";

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const emptyForm = { nome: "", cnpjCpf: "", email: "", telefone: "", endereco: "", cep: "", cidade: "", uf: "" };

const CadastroClientes = () => {
  const [items, setItems] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    const data = await getClientes();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editingId) {
        const old = items.find(i => i.id === editingId);
        await updateCliente(editingId, form, old?.nome);
        toast.success("Cliente atualizado!");
      } else {
        await saveCliente(form);
        toast.success("Cliente cadastrado!");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error("Erro ao salvar cliente");
    }
  };

  const handleEdit = (item: Cliente) => {
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      cnpjCpf: item.cnpjCpf,
      email: item.email,
      telefone: item.telefone,
      endereco: item.endereco,
      cep: item.cep || "",
      cidade: item.cidade || "",
      uf: item.uf || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCliente(id);
      await refresh();
      toast.success("Cliente removido");
    } catch (error) {
      toast.error("Erro ao remover cliente");
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
          <Users className="h-4 w-4" />
          {items.length} cliente(s) cadastrado(s)
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>CNPJ/CPF</Label><Input value={form.cnpjCpf} onChange={(e) => setForm({ ...form, cnpjCpf: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            </div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>CEP</Label><Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div>
                <Label>UF</Label>
                <select
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  {UF_LIST.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleSave}>{editingId ? "Atualizar" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">Nenhum cliente cadastrado.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">CNPJ/CPF</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Endereço</TableHead>
                <TableHead className="font-semibold">CEP</TableHead>
                <TableHead className="font-semibold">Cidade/UF</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{item.cnpjCpf}</TableCell>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell className="text-sm">{item.telefone}</TableCell>
                  <TableCell className="text-sm">{item.endereco}</TableCell>
                  <TableCell className="text-sm">{item.cep}</TableCell>
                  <TableCell className="text-sm">{[item.cidade, item.uf].filter(Boolean).join("/") || "—"}</TableCell>
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

export default CadastroClientes;
