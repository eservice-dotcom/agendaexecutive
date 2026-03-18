import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Truck, Pencil } from "lucide-react";
import { Veiculo, getVeiculos, saveVeiculo, updateVeiculo, deleteVeiculo } from "@/data/cadastroStorage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toast } from "sonner";

const emptyForm = { placa: "", modelo: "", tipo: "", capacidade: 0, ano: new Date().getFullYear() };

const CadastroVeiculos = () => {
  const [items, setItems] = useState<Veiculo[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    const data = await getVeiculos();
    setItems(data);
  };

  useEffect(() => { refresh(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: Veiculo) => {
    setEditingId(item.id);
    setForm({ placa: item.placa, modelo: item.modelo, tipo: item.tipo, capacidade: item.capacidade, ano: item.ano });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.placa.trim()) { toast.error("Placa é obrigatória"); return; }
    try {
      if (editingId) {
        await updateVeiculo(editingId, form);
        toast.success("Veículo atualizado!");
      } else {
        await saveVeiculo(form);
        toast.success("Veículo cadastrado!");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error("Erro ao salvar veículo");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVeiculo(id);
      await refresh();
      toast.success("Veículo removido");
    } catch (error) {
      toast.error("Erro ao remover veículo");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4" />
          {items.length} veículo(s) cadastrado(s)
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Veículo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
            <DialogDescription>{editingId ? "Altere os dados do veículo" : "Preencha os dados do veículo"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Placa *</Label><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Tipo</Label><Input placeholder="Van, Sedan..." value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
              <div><Label>Capacidade</Label><Input type="number" value={form.capacidade || ""} onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })} /></div>
              <div><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={handleSave}>{editingId ? "Atualizar" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">Nenhum veículo cadastrado.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Placa</TableHead>
                <TableHead className="font-semibold">Modelo</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold text-center">Capacidade</TableHead>
                <TableHead className="font-semibold text-center">Ano</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-medium">{item.placa}</TableCell>
                  <TableCell>{item.modelo}</TableCell>
                  <TableCell>{item.tipo}</TableCell>
                  <TableCell className="text-center">{item.capacidade}</TableCell>
                  <TableCell className="text-center">{item.ano}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
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

export default CadastroVeiculos;
