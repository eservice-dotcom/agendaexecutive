import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientes, getVeiculos, getMotoristas, getFornecedores, saveAgendaItem, getTiposServico } from "@/data/cadastroStorage";
import { Passageiro } from "@/data/agendaData";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import PassageirosInput from "./PassageirosInput";
import { TooltipProvider } from "@/components/ui/tooltip";

interface NovoServicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const NovoServicoDialog = ({ open, onOpenChange, onSaved }: NovoServicoDialogProps) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [tiposServico, setTiposServico] = useState<string[]>([]);

  const [form, setForm] = useState({
    data: "",
    hora: "",
    clienteId: "",
    pax: "",
    cot: "",
    tipo: "",
    origem: "",
    destino: "",
    veiculoId: "",
    motoristaId: "",
    valor: "",
    fornecedorId: "",
    custo: "",
    observacoes: "",
    receptivo: "",
    kmIn: "",
    kmFim: "",
    kmExtra: "",
    horaIn: "",
    horaFim: "",
    estacionamento: "",
    outros: "",
  });
  
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);

  useEffect(() => {
    if (open) {
      (async () => {
        const [c, v, m, f, t] = await Promise.all([
          getClientes(),
          getVeiculos(),
          getMotoristas(),
          getFornecedores(),
          getTiposServico(),
        ]);
        setClientes(c);
        setVeiculos(v);
        setMotoristas(m);
        setFornecedores(f);
        setTiposServico(t);
      })();
    }
  }, [open]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.data || !form.hora || !form.clienteId || !form.tipo || !form.origem || !form.destino) {
      toast.error("Preencha os campos obrigatórios: Data, Hora, Cliente, Tipo, Origem e Destino.");
      return;
    }

    const cliente = clientes.find((c) => c.id === form.clienteId);
    const veiculo = veiculos.find((v) => v.id === form.veiculoId);
    const motorista = motoristas.find((m) => m.id === form.motoristaId);
    const fornecedor = fornecedores.find((f) => f.id === form.fornecedorId);

    try {
      await saveAgendaItem({
        data: form.data,
        hora: form.hora,
        cliente: cliente?.nome || "",
        pax: parseInt(form.pax) || 0,
        passageiros: passageiros,
        cot: form.cot,
        tipo: form.tipo,
        origem: form.origem,
        destino: form.destino,
        placa: veiculo?.placa || "",
        veiculo: veiculo ? `${veiculo.modelo}` : "",
        motorista: motorista?.nome || "",
        telefone: motorista?.telefone || "",
        valor: parseFloat(form.valor) || 0,
        fornecedor: fornecedor?.razaoSocial || "",
        custo: parseFloat(form.custo) || 0,
        observacoes: form.observacoes,
        receptivo: form.receptivo,
        statusFaturamento: "",
        kmIn: parseFloat(form.kmIn) || 0,
        kmFim: parseFloat(form.kmFim) || 0,
        kmExtra: parseFloat(form.kmExtra) || 0,
        horaIn: form.horaIn || "",
        horaFim: form.horaFim || "",
        estacionamento: parseFloat(form.estacionamento) || 0,
        outros: parseFloat(form.outros) || 0,
      });

      toast.success("Serviço adicionado com sucesso!");
      setForm({
        data: "", hora: "", clienteId: "", pax: "", cot: "", tipo: "",
        origem: "", destino: "", veiculoId: "", motoristaId: "", valor: "",
        fornecedorId: "", custo: "", observacoes: "", receptivo: "",
        kmIn: "", kmFim: "", kmExtra: "", horaIn: "", horaFim: "",
        estacionamento: "", outros: "",
      });
      setPassageiros([]);
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error("Erro ao salvar serviço");
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Serviço
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
            <Select value={form.clienteId} onValueChange={(v) => update("clienteId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Label>Veículo</Label>
            <Select value={form.veiculoId} onValueChange={(v) => update("veiculoId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {veiculos.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <Select value={form.motoristaId} onValueChange={(v) => update("motoristaId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {motoristas.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                {motoristas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={form.fornecedorId} onValueChange={(v) => update("fornecedorId", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {fornecedores.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razaoSocial}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Custo (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label>Receptivo</Label>
            <Input value={form.receptivo} onChange={(e) => update("receptivo", e.target.value)} placeholder="Nome do receptivo" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} placeholder="Observações sobre o serviço" />
          </div>

          {/* Fechamento */}
          <div className="sm:col-span-2 border-t pt-3 mt-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Fechamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>KM Início</Label>
                <Input type="number" min={0} value={form.kmIn} onChange={(e) => update("kmIn", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>KM Fim</Label>
                <Input type="number" min={0} value={form.kmFim} onChange={(e) => update("kmFim", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>KM Extra</Label>
                <Input type="number" min={0} value={form.kmExtra} onChange={(e) => update("kmExtra", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Hora Início</Label>
                <Input type="time" value={form.horaIn} onChange={(e) => update("horaIn", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora Fim</Label>
                <Input type="time" value={form.horaFim} onChange={(e) => update("horaFim", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estacionamento (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.estacionamento} onChange={(e) => update("estacionamento", e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Outros (R$)</Label>
                <Input type="number" min={0} step="0.01" value={form.outros} onChange={(e) => update("outros", e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Serviço</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};

export default NovoServicoDialog;
