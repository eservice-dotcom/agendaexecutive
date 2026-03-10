import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Building2 } from "lucide-react";
import { Fornecedor, getFornecedores, saveFornecedor, deleteFornecedor } from "@/data/cadastroStorage";
import { toast } from "sonner";

const CadastroFornecedores = () => {
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "" });

  const refresh = async () => {
    const data = await getFornecedores();
    setItems(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!form.razaoSocial.trim()) { toast.error("Razão Social é obrigatória"); return; }
    try {
      await saveFornecedor(form);
      setForm({ razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "" });
      setOpen(false);
      await refresh();
      toast.success("Fornecedor cadastrado!");
    } catch (error) {
      toast.error("Erro ao salvar fornecedor");
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          {items.length} fornecedor(es) cadastrado(s)
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
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
            <Button onClick={handleSave}>Salvar</Button>
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
                <TableHead className="font-semibold">CNPJ</TableHead>
                <TableHead className="font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.razaoSocial}</TableCell>
                  <TableCell className="font-mono text-sm">{item.cnpj}</TableCell>
                  <TableCell className="text-sm">{item.contato}</TableCell>
                  <TableCell className="text-sm">{item.telefone}</TableCell>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
