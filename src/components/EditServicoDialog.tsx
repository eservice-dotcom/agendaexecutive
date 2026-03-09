import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgendaItem, statusFaturamentoOptions, StatusFaturamento, Passageiro } from "@/data/agendaData";
import { updateAgendaItem, getTiposServico } from "@/data/cadastroStorage";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import PassageirosInput from "./PassageirosInput";
import { TooltipProvider } from "@/components/ui/tooltip";

interface EditServicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AgendaItem | null;
  onSaved: () => void;
}

const EditServicoDialog = ({ open, onOpenChange, item, onSaved }: EditServicoDialogProps) => {
  const tiposServico = getTiposServico();
  const [form, setForm] = useState({
    data: "",
    hora: "",
    cliente: "",
    pax: "",
    cot: "",
    tipo: "",
    origem: "",
    destino: "",
    placa: "",
    veiculo: "",
    motorista: "",
    telefone: "",
    valor: "",
    fornecedor: "",
    custo: "",
    observacoes: "",
    statusFaturamento: "" as StatusFaturamento,
  });
  
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);

  useEffect(() => {
    if (item && open) {
      setForm({
        data: item.data,
        hora: item.hora,
        cliente: item.cliente,
        pax: item.pax.toString(),
        cot: item.cot,
        tipo: item.tipo,
        origem: item.origem,
        destino: item.destino,
        placa: item.placa,
        veiculo: item.veiculo,
        motorista: item.motorista,
        telefone: item.telefone,
        valor: item.valor.toString(),
        fornecedor: item.fornecedor,
        custo: item.custo.toString(),
        observacoes: item.observacoes || "",
        statusFaturamento: item.statusFaturamento || "",
      });
      setPassageiros(item.passageiros || []);
    }
  }, [item, open]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!item) return;
    if (!form.data || !form.hora || !form.cliente || !form.tipo || !form.origem || !form.destino) {
      toast.error("Preencha os campos obrigatórios: Data, Hora, Cliente, Tipo, Origem e Destino.");
      return;
    }

    updateAgendaItem({
      id: item.id,
      data: form.data,
      hora: form.hora,
      cliente: form.cliente,
      pax: parseInt(form.pax) || 0,
      passageiros: passageiros,
      cot: form.cot,
      tipo: form.tipo,
      origem: form.origem,
      destino: form.destino,
      placa: form.placa,
      veiculo: form.veiculo,
      motorista: form.motorista,
      telefone: form.telefone,
      valor: parseFloat(form.valor) || 0,
      fornecedor: form.fornecedor,
      custo: parseFloat(form.custo) || 0,
      observacoes: form.observacoes,
      statusFaturamento: form.statusFaturamento,
    });

    toast.success("Serviço atualizado com sucesso!");
    onOpenChange(false);
    onSaved();
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Serviço
            </DialogTitle>
          </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <Input type="date" value={form.data} onChange={(e) => update("data", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hora *</Label>
            <Input type="time" value={form.hora} onChange={(e) => update("hora", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Input value={form.cliente} onChange={(e) => update("cliente", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>PAX</Label>
            <Input type="number" min={0} value={form.pax} onChange={(e) => update("pax", e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label>COT</Label>
            <Input value={form.cot} onChange={(e) => update("cot", e.target.value)} placeholder="COT-000" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <PassageirosInput passageiros={passageiros} onChange={setPassageiros} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => update("tipo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tiposServico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Origem *</Label>
            <Input value={form.origem} onChange={(e) => update("origem", e.target.value)} placeholder="Local de origem" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Destino *</Label>
            <Input value={form.destino} onChange={(e) => update("destino", e.target.value)} placeholder="Local de destino" />
          </div>

          <div className="space-y-1.5">
            <Label>Placa</Label>
            <Input value={form.placa} onChange={(e) => update("placa", e.target.value)} placeholder="ABC-1234" />
          </div>

          <div className="space-y-1.5">
            <Label>Veículo</Label>
            <Input value={form.veiculo} onChange={(e) => update("veiculo", e.target.value)} placeholder="Modelo do veículo" />
          </div>

          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <Input value={form.motorista} onChange={(e) => update("motorista", e.target.value)} placeholder="Nome do motorista" />
          </div>

          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="(00) 00000-0000" />
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => update("fornecedor", e.target.value)} placeholder="Nome do fornecedor" />
          </div>

          <div className="space-y-1.5">
            <Label>Custo (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} placeholder="Observações sobre o serviço" />
          </div>

          <div className="space-y-1.5">
            <Label>Status Faturamento</Label>
            <Select value={form.statusFaturamento || "_empty"} onValueChange={(v) => update("statusFaturamento", v === "_empty" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {statusFaturamentoOptions.map((o) => (
                  <SelectItem key={o.value || "_empty"} value={o.value || "_empty"}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditServicoDialog;
