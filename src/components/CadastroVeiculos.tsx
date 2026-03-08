import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Truck } from "lucide-react";
import { Veiculo, getVeiculos, saveVeiculo, deleteVeiculo } from "@/data/cadastroStorage";
import { toast } from "sonner";

const CadastroVeiculos = () => {
  const [items, setItems] = useState<Veiculo[]>(getVeiculos());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ placa: "", modelo: "", tipo: "", capacidade: 0, ano: new Date().getFullYear() });

  const refresh = () => setItems(getVeiculos());

  const handleSave = () => {
    if (!form.placa.trim()) { toast.error("Placa é obrigatória"); return; }
    saveVeiculo(form);
    setForm({ placa: "", modelo: "", tipo: "", capacidade: 0, ano: new Date().getFullYear() });
    setOpen(false);
    refresh();
    toast.success("Veículo cadastrado!");
  };

  const handleDelete = (id: string) => {
    deleteVeiculo(id);
    refresh();
    toast.success("Veículo removido");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4" />
          {items.length} veículo(s) cadastrado(s)
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Veículo
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Veículo</DialogTitle>
            <DialogDescription>Preencha os dados do veículo</DialogDescription>
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
            <Button onClick={handleSave}>Salvar</Button>
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
                <TableHead className="w-12"></TableHead>
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

export default CadastroVeiculos;
