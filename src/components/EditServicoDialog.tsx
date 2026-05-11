import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgendaItem, statusFaturamentoOptions, StatusFaturamento, Passageiro, OutraDespesa } from "@/data/agendaData";
import { updateAgendaItem, getTiposServico, getVeiculos, getMotoristas, getClientes, getFornecedores, Veiculo, Motorista, Cliente, Fornecedor } from "@/data/cadastroStorage";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import PassageirosInput from "./PassageirosInput";
import { TooltipProvider } from "@/components/ui/tooltip";

interface EditServicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AgendaItem | null;
  onSaved: () => void;
}

const EditServicoDialog = ({ open, onOpenChange, item, onSaved }: EditServicoDialogProps) => {
  const [tiposServico, setTiposServico] = useState<string[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

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
    receptivo: "",
    statusFaturamento: "" as StatusFaturamento,
    kmIn: "",
    kmFim: "",
    kmExtra: "",
    horaIn: "",
    horaFim: "",
    estacionamento: "",
    horaExtra: "",
    formaContratacao: "",
  });
  
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [outrosDespesas, setOutrosDespesas] = useState<OutraDespesa[]>([]);
  const [motoristaDiariaMsg, setMotoristaDiariaMsg] = useState("");

  // Check if selected motorista already has "diaria" on the same date (excluding current item)
  useEffect(() => {
    const checkMotoristaDiaria = async () => {
      if (!form.motorista || !form.data || !item) {
        setMotoristaDiariaMsg("");
        return;
      }
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("agenda_items")
        .select("id, forma_contratacao")
        .eq("data", form.data)
        .eq("motorista", form.motorista)
        .eq("forma_contratacao", "diaria")
        .neq("id", item.id)
        .limit(1);
      if (data && data.length > 0) {
        setMotoristaDiariaMsg(`Motorista ${form.motorista} já está em Diária nesta data`);
        update("formaContratacao", "diaria");
      } else {
        setMotoristaDiariaMsg("");
      }
    };
    checkMotoristaDiaria();
  }, [form.motorista, form.data, item]);

  useEffect(() => {
    if (open) {
      Promise.all([
        getTiposServico(),
        getVeiculos(),
        getMotoristas(),
        getClientes(),
        getFornecedores(),
      ]).then(([t, v, m, c, f]) => {
        setTiposServico(t);
        setVeiculos(v);
        setMotoristas(m);
        setClientes(c);
        setFornecedores(f);
      });
    }
  }, [open]);

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
        receptivo: item.receptivo || "",
        statusFaturamento: item.statusFaturamento || (item as any).status_faturamento || "",
        kmIn: (item.kmIn || 0).toString(),
        kmFim: (item.kmFim || 0).toString(),
        kmExtra: (item.kmExtra || 0).toString(),
        horaIn: item.horaIn || "",
        horaFim: item.horaFim || "",
        estacionamento: (item.estacionamento || 0).toString(),
        horaExtra: item.horaExtra || "",
        formaContratacao: (item as any).formaContratacao || "",
      });
      setPassageiros(item.passageiros || []);
      setOutrosDespesas(item.outrosDespesas || []);
    }
  }, [item, open]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleVeiculoChange = (veiculoId: string) => {
    if (veiculoId === "_manual") {
      update("placa", "");
      update("veiculo", "");
      return;
    }
    const v = veiculos.find((v) => v.id === veiculoId);
    if (v) {
      update("placa", v.placa);
      update("veiculo", v.modelo);
    }
  };

  const handleMotoristaChange = (motoristaId: string) => {
    if (motoristaId === "_empty") {
      update("motorista", "");
      update("telefone", "");
      return;
    }
    if (motoristaId === "_manual") {
      update("motorista", "");
      update("telefone", "");
      return;
    }
    const m = motoristas.find((m) => m.id === motoristaId);
    if (m) {
      update("motorista", m.nome);
      update("telefone", m.telefone);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    if (clienteId === "_manual") {
      update("cliente", "");
      return;
    }
    const c = clientes.find((c) => c.id === clienteId);
    if (c) {
      update("cliente", c.nome);
    }
  };

  const handleFornecedorChange = (fornecedorId: string) => {
    if (fornecedorId === "_manual") {
      update("fornecedor", "");
      return;
    }
    const f = fornecedores.find((f) => f.id === fornecedorId);
    if (f) {
      update("fornecedor", f.razaoSocial);
    }
  };

  const handleSave = async () => {
    if (!item) return;
    if (!form.data || !form.hora || !form.cliente || !form.tipo || !form.origem || !form.destino) {
      toast.error("Preencha os campos obrigatórios: Data, Hora, Cliente, Tipo, Origem e Destino.");
      return;
    }

    try {
      await updateAgendaItem({
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
        custo: form.fornecedor.toLowerCase().includes("executive") ? 0 : (parseFloat(form.custo) || 0),
        observacoes: form.observacoes,
        receptivo: form.receptivo,
        statusFaturamento: form.statusFaturamento,
        kmIn: parseFloat(form.kmIn) || 0,
        kmFim: parseFloat(form.kmFim) || 0,
        kmExtra: parseFloat(form.kmExtra) || 0,
        horaIn: form.horaIn || "",
        horaFim: form.horaFim || "",
        estacionamento: parseFloat(form.estacionamento) || 0,
        horaExtra: form.horaExtra || "",
        outrosDespesas: outrosDespesas,
        formaContratacao: form.formaContratacao || "",
      });

      toast.success("Serviço atualizado com sucesso!");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error("Erro ao atualizar serviço");
    }
  };

  // Find matching IDs for current values
  const currentVeiculoId = veiculos.find((v) => v.placa === form.placa && v.modelo === form.veiculo)?.id || "";
  const currentMotoristaId = motoristas.find((m) => m.nome === form.motorista)?.id || "";
  const currentClienteId = clientes.find((c) => c.nome === form.cliente)?.id || "";
  const currentFornecedorId = fornecedores.find((f) => f.razaoSocial === form.fornecedor)?.id || "";

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
            <Select value={currentClienteId || "_manual"} onValueChange={handleClienteChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_manual">-- Digitar manualmente --</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!currentClienteId) && (
              <Input value={form.cliente} onChange={(e) => update("cliente", e.target.value)} placeholder="Nome do cliente" className="mt-1" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>SHT</Label>
            <Input type="number" min={0} value={form.pax} onChange={(e) => update("pax", e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label>O.S.</Label>
            <Input value={form.cot} onChange={(e) => update("cot", e.target.value)} placeholder="O.S.-000" />
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
            <Select value={currentVeiculoId || "_manual"} onValueChange={handleVeiculoChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_manual">-- Digitar manualmente --</SelectItem>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!currentVeiculoId) && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input value={form.placa} onChange={(e) => update("placa", e.target.value)} placeholder="Placa" />
                <Input value={form.veiculo} onChange={(e) => update("veiculo", e.target.value)} placeholder="Modelo" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <Select value={currentMotoristaId || (form.motorista ? "_manual" : "_empty")} onValueChange={handleMotoristaChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">-- Sem motorista --</SelectItem>
                <SelectItem value="_manual">-- Digitar manualmente --</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!currentMotoristaId && form.motorista) && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Input value={form.motorista} onChange={(e) => update("motorista", e.target.value)} placeholder="Nome" />
                <Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="Telefone" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={currentFornecedorId || "_manual"} onValueChange={handleFornecedorChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_manual">-- Digitar manualmente --</SelectItem>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.razaoSocial}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!currentFornecedorId) && (
              <Input value={form.fornecedor} onChange={(e) => update("fornecedor", e.target.value)} placeholder="Nome do fornecedor" className="mt-1" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Forma de Contratação</Label>
            {motoristaDiariaMsg ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                {motoristaDiariaMsg}
              </div>
            ) : (
              <Select value={form.formaContratacao || "_empty"} onValueChange={(v) => update("formaContratacao", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">-- Nenhuma --</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Custo (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.fornecedor.toLowerCase().includes("executive") ? "0" : form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="0,00" disabled={form.fornecedor.toLowerCase().includes("executive")} />
          </div>

          <div className="space-y-1.5">
            <Label>Receptivo</Label>
            <Input value={form.receptivo} onChange={(e) => update("receptivo", e.target.value)} placeholder="Nome do receptivo" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observações</Label>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {["Motorista Recepciona", "Terá Coordenador"].map((chip) => {
                const isActive = form.observacoes.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        update("observacoes", form.observacoes.replace(chip, "").replace(/\s{2,}/g, " ").replace(/^[\s,]+|[\s,]+$/g, "").trim());
                      } else {
                        update("observacoes", form.observacoes ? `${form.observacoes.trim()}, ${chip}` : chip);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
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
                <Label>Hora Extra</Label>
                <Input type="time" value={form.horaExtra} onChange={(e) => update("horaExtra", e.target.value)} />
              </div>
              {/* Outras Despesas */}
              <div className="sm:col-span-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Outras Despesas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOutrosDespesas([...outrosDespesas, { descricao: "", valor: 0 }])} className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {outrosDespesas.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={d.descricao}
                      onChange={(e) => { const arr = [...outrosDespesas]; arr[idx] = { ...arr[idx], descricao: e.target.value }; setOutrosDespesas(arr); }}
                      placeholder="Descrição da despesa"
                      className="flex-1"
                    />
                    <Input
                      type="number" min={0} step="0.01"
                      value={d.valor || ""}
                      onChange={(e) => { const arr = [...outrosDespesas]; arr[idx] = { ...arr[idx], valor: parseFloat(e.target.value) || 0 }; setOutrosDespesas(arr); }}
                      placeholder="R$ 0,00"
                      className="w-28"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setOutrosDespesas(outrosDespesas.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};

export default EditServicoDialog;
