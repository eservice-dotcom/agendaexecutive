import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientes, getVeiculos, getMotoristas, getFornecedores, saveAgendaItem, getTiposServico, saveMotorista, saveFornecedor, saveVeiculo, saveCliente } from "@/data/cadastroStorage";
import { Passageiro, OutraDespesa } from "@/data/agendaData";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";
import PassageirosInput from "./PassageirosInput";
import { TooltipProvider } from "@/components/ui/tooltip";

interface NovoServicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialData?: import("@/data/agendaData").AgendaItem | null;
}

const NovoServicoDialog = ({ open, onOpenChange, onSaved, initialData }: NovoServicoDialogProps) => {
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
    horaExtra: "",
    formaContratacao: "",
    placaReceptivoUrl: "",
  });
  
  const [uploadingPlaca, setUploadingPlaca] = useState(false);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [outrosDespesas, setOutrosDespesas] = useState<OutraDespesa[]>([]);
  const [motoristaDiariaMsg, setMotoristaDiariaMsg] = useState("");

  // Check if selected motorista already has "diaria" on the same date
  useEffect(() => {
    const checkMotoristaDiaria = async () => {
      const motoristaObj = motoristas.find((m: any) => m.id === form.motoristaId);
      if (!motoristaObj || !form.data) {
        setMotoristaDiariaMsg("");
        return;
      }
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("agenda_items")
        .select("id, forma_contratacao")
        .eq("data", form.data)
        .eq("motorista", motoristaObj.nome)
        .eq("forma_contratacao", "diaria")
        .limit(1);
      if (data && data.length > 0) {
        setMotoristaDiariaMsg(`Motorista ${motoristaObj.nome} já está em Diária nesta data`);
        update("formaContratacao", "diaria");
      } else {
        setMotoristaDiariaMsg("");
      }
    };
    checkMotoristaDiaria();
  }, [form.motoristaId, form.data, motoristas]);

  // Quick-add veiculo
  const [showNewVeiculo, setShowNewVeiculo] = useState(false);
  const [newVeiculo, setNewVeiculo] = useState({ placa: "", modelo: "", tipo: "", ano: "", capacidade: "" });

  // Quick-add motorista
  const [showNewMotorista, setShowNewMotorista] = useState(false);
  const [newMotorista, setNewMotorista] = useState({ nome: "", cnh: "", telefone: "", email: "", categoria: "" });

  // Quick-add fornecedor
  const [showNewFornecedor, setShowNewFornecedor] = useState(false);
  const [newFornecedor, setNewFornecedor] = useState({ razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "" });

  // Quick-add cliente
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [newCliente, setNewCliente] = useState({ nome: "", cnpjCpf: "", telefone: "", email: "", endereco: "", cep: "", cidade: "", uf: "" });

  const handleSaveNewVeiculo = async () => {
    if (!newVeiculo.placa || !newVeiculo.modelo) { toast.error("Placa e modelo são obrigatórios"); return; }
    try {
      await saveVeiculo({ ...newVeiculo, ano: parseInt(newVeiculo.ano) || new Date().getFullYear(), capacidade: parseInt(newVeiculo.capacidade) || 0 });
      const updated = await getVeiculos();
      setVeiculos(updated);
      const created = updated.find((v) => v.placa === newVeiculo.placa);
      if (created) update("veiculoId", created.id);
      setNewVeiculo({ placa: "", modelo: "", tipo: "", ano: "", capacidade: "" });
      setShowNewVeiculo(false);
      toast.success("Veículo cadastrado!");
    } catch { toast.error("Erro ao cadastrar veículo"); }
  };

  const handleSaveNewMotorista = async () => {
    if (!newMotorista.nome) { toast.error("Nome do motorista é obrigatório"); return; }
    try {
      await saveMotorista(newMotorista);
      const updated = await getMotoristas();
      setMotoristas(updated);
      const created = updated.find((m) => m.nome === newMotorista.nome);
      if (created) update("motoristaId", created.id);
      setNewMotorista({ nome: "", cnh: "", telefone: "", email: "", categoria: "" });
      setShowNewMotorista(false);
      toast.success("Motorista cadastrado!");
    } catch { toast.error("Erro ao cadastrar motorista"); }
  };

  const handleSaveNewFornecedor = async () => {
    if (!newFornecedor.razaoSocial) { toast.error("Razão social é obrigatória"); return; }
    try {
      await saveFornecedor(newFornecedor);
      const updated = await getFornecedores();
      setFornecedores(updated);
      const created = updated.find((f) => f.razaoSocial === newFornecedor.razaoSocial);
      if (created) update("fornecedorId", created.id);
      setNewFornecedor({ razaoSocial: "", cnpj: "", contato: "", telefone: "", email: "", pix: "" });
      setShowNewFornecedor(false);
      toast.success("Fornecedor cadastrado!");
    } catch { toast.error("Erro ao cadastrar fornecedor"); }
  };

  const handleSaveNewCliente = async () => {
    if (!newCliente.nome) { toast.error("Nome do cliente é obrigatório"); return; }
    try {
      await saveCliente(newCliente);
      const updated = await getClientes();
      setClientes(updated);
      const created = updated.find((c) => c.nome === newCliente.nome);
      if (created) update("clienteId", created.id);
      setNewCliente({ nome: "", cnpjCpf: "", telefone: "", email: "", endereco: "", cep: "", cidade: "", uf: "" });
      setShowNewCliente(false);
      toast.success("Cliente cadastrado!");
    } catch { toast.error("Erro ao cadastrar cliente"); }
  };

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

        // Pre-fill form if initialData is provided (clone)
        if (initialData) {
          const clienteMatch = c.find((cl: any) => cl.nome === initialData.cliente);
          const veiculoMatch = v.find((ve: any) => ve.placa === initialData.placa);
          const motoristaMatch = m.find((mo: any) => mo.nome === initialData.motorista);
          const fornecedorMatch = f.find((fo: any) => fo.razaoSocial === initialData.fornecedor);

          setForm({
            data: initialData.data,
            hora: initialData.hora,
            clienteId: clienteMatch?.id || "",
            pax: String(initialData.pax || ""),
            cot: initialData.cot,
            tipo: initialData.tipo,
            origem: initialData.origem,
            destino: initialData.destino,
            veiculoId: veiculoMatch?.id || "",
            motoristaId: motoristaMatch?.id || "",
            valor: String(initialData.valor || ""),
            fornecedorId: fornecedorMatch?.id || "",
            custo: String(initialData.custo || ""),
            observacoes: initialData.observacoes || "",
            receptivo: initialData.receptivo || "",
            kmIn: String(initialData.kmIn || ""),
            kmFim: String(initialData.kmFim || ""),
            kmExtra: String(initialData.kmExtra || ""),
            horaIn: initialData.horaIn || "",
            horaFim: initialData.horaFim || "",
            estacionamento: String(initialData.estacionamento || ""),
            horaExtra: initialData.horaExtra || "",
            formaContratacao: (initialData as any).formaContratacao || "",
            placaReceptivoUrl: (initialData as any).placaReceptivoUrl || "",
          });
          setPassageiros(initialData.passageiros || []);
          setOutrosDespesas(initialData.outrosDespesas || []);
        }
      })();
    }
  }, [open, initialData]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleUploadPlaca = async (file: File) => {
    if (!file) return;
    setUploadingPlaca(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("placas-receptivo").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("placas-receptivo").getPublicUrl(path);
      update("placaReceptivoUrl", data.publicUrl);
      toast.success("Arquivo enviado!");
    } catch (e: any) {
      toast.error("Erro ao enviar arquivo: " + (e?.message || ""));
    } finally {
      setUploadingPlaca(false);
    }
  };

  const handleSave = async () => {
    if (!form.data || !form.hora || !form.clienteId || !form.tipo || !form.origem || !form.destino) {
      toast.error("Preencha os campos obrigatórios: Data, Hora, Cliente, Tipo, Origem e Destino.");
      return;
    }

    const cliente = clientes.find((c) => c.id === form.clienteId);
    const veiculo = veiculos.find((v) => v.id === form.veiculoId);
    const motorista = motoristas.find((m) => m.id === form.motoristaId);
    const fornecedor = fornecedores.find((f) => f.id === form.fornecedorId);

    const kmDiff = (parseFloat(form.kmFim) || 0) - (parseFloat(form.kmIn) || 0);
    if (kmDiff > 100) {
      toast.warning(`Atenção: foram rodados ${kmDiff.toFixed(0)} km (acima de 100 km).`);
    }
    if (form.horaIn && form.horaFim) {
      const [h1, m1] = form.horaIn.split(":").map(Number);
      const [h2, m2] = form.horaFim.split(":").map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      const horas = mins / 60;
      if (horas > 10) {
        toast.warning(`Atenção: jornada de ${horas.toFixed(1)}h (acima de 10h trabalhadas).`);
      }
    }

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
        custo: fornecedor?.razaoSocial.toLowerCase().includes("executive") ? 0 : (parseFloat(form.custo) || 0),
        observacoes: form.observacoes,
        receptivo: form.receptivo,
        statusFaturamento: "",
        kmIn: parseFloat(form.kmIn) || 0,
        kmFim: parseFloat(form.kmFim) || 0,
        kmExtra: parseFloat(form.kmExtra) || 0,
        horaIn: form.horaIn || "",
        horaFim: form.horaFim || "",
        estacionamento: parseFloat(form.estacionamento) || 0,
        horaExtra: form.horaExtra || "",
        outrosDespesas: outrosDespesas,
        formaContratacao: form.formaContratacao || "",
        placaReceptivoUrl: form.placaReceptivoUrl || "",
      });

      toast.success("Serviço adicionado com sucesso!");
      setForm({
        data: "", hora: "", clienteId: "", pax: "", cot: "", tipo: "",
        origem: "", destino: "", veiculoId: "", motoristaId: "", valor: "",
        fornecedorId: "", custo: "", observacoes: "", receptivo: "",
        kmIn: "", kmFim: "", kmExtra: "", horaIn: "", horaFim: "",
        estacionamento: "", horaExtra: "", formaContratacao: "", placaReceptivoUrl: "",
      });
      setPassageiros([]);
      setOutrosDespesas([]);
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
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => setShowNewCliente(!showNewCliente)}>
                <UserPlus className="h-3 w-3" /> Novo
              </Button>
            </div>
            {showNewCliente ? (
              <div className="space-y-2 rounded-md border border-border p-2 bg-muted/30">
                <Input value={newCliente.nome} onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })} placeholder="Nome *" />
                <Input value={newCliente.cnpjCpf} onChange={(e) => setNewCliente({ ...newCliente, cnpjCpf: e.target.value })} placeholder="CNPJ/CPF" />
                <Input value={newCliente.telefone} onChange={(e) => setNewCliente({ ...newCliente, telefone: e.target.value })} placeholder="Telefone" />
                <Input value={newCliente.email} onChange={(e) => setNewCliente({ ...newCliente, email: e.target.value })} placeholder="Email" />
                <Input value={newCliente.endereco} onChange={(e) => setNewCliente({ ...newCliente, endereco: e.target.value })} placeholder="Endereço" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveNewCliente}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewCliente(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Select value={form.clienteId} onValueChange={(v) => update("clienteId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <div className="flex items-center justify-between">
              <Label>Veículo</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => setShowNewVeiculo(!showNewVeiculo)}>
                <UserPlus className="h-3 w-3" /> Novo
              </Button>
            </div>
            {showNewVeiculo ? (
              <div className="space-y-2 rounded-md border border-border p-2 bg-muted/30">
                <Input value={newVeiculo.placa} onChange={(e) => setNewVeiculo({ ...newVeiculo, placa: e.target.value })} placeholder="Placa *" />
                <Input value={newVeiculo.modelo} onChange={(e) => setNewVeiculo({ ...newVeiculo, modelo: e.target.value })} placeholder="Modelo *" />
                <Input value={newVeiculo.tipo} onChange={(e) => setNewVeiculo({ ...newVeiculo, tipo: e.target.value })} placeholder="Tipo (ex: Sedan)" />
                <Input type="number" value={newVeiculo.ano} onChange={(e) => setNewVeiculo({ ...newVeiculo, ano: e.target.value })} placeholder="Ano" />
                <Input type="number" value={newVeiculo.capacidade} onChange={(e) => setNewVeiculo({ ...newVeiculo, capacidade: e.target.value })} placeholder="Capacidade" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveNewVeiculo}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewVeiculo(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Select value={form.veiculoId} onValueChange={(v) => update("veiculoId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {veiculos.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Motorista</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => setShowNewMotorista(!showNewMotorista)}>
                <UserPlus className="h-3 w-3" /> Novo
              </Button>
            </div>
            {showNewMotorista ? (
              <div className="space-y-2 rounded-md border border-border p-2 bg-muted/30">
                <Input value={newMotorista.nome} onChange={(e) => setNewMotorista({ ...newMotorista, nome: e.target.value })} placeholder="Nome *" />
                <Input value={newMotorista.telefone} onChange={(e) => setNewMotorista({ ...newMotorista, telefone: e.target.value })} placeholder="Telefone" />
                <Input value={newMotorista.cnh} onChange={(e) => setNewMotorista({ ...newMotorista, cnh: e.target.value })} placeholder="CNH" />
                <Input value={newMotorista.categoria} onChange={(e) => setNewMotorista({ ...newMotorista, categoria: e.target.value })} placeholder="Categoria" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveNewMotorista}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewMotorista(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Select value={form.motoristaId || "_empty"} onValueChange={(v) => update("motoristaId", v === "_empty" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">-- Sem motorista --</SelectItem>
                  {motoristas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update("valor", e.target.value)} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Fornecedor</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => setShowNewFornecedor(!showNewFornecedor)}>
                <UserPlus className="h-3 w-3" /> Novo
              </Button>
            </div>
            {showNewFornecedor ? (
              <div className="space-y-2 rounded-md border border-border p-2 bg-muted/30">
                <Input value={newFornecedor.razaoSocial} onChange={(e) => setNewFornecedor({ ...newFornecedor, razaoSocial: e.target.value })} placeholder="Razão Social *" />
                <Input value={newFornecedor.cnpj} onChange={(e) => setNewFornecedor({ ...newFornecedor, cnpj: e.target.value })} placeholder="CNPJ" />
                <Input value={newFornecedor.contato} onChange={(e) => setNewFornecedor({ ...newFornecedor, contato: e.target.value })} placeholder="Contato" />
                <Input value={newFornecedor.telefone} onChange={(e) => setNewFornecedor({ ...newFornecedor, telefone: e.target.value })} placeholder="Telefone" />
                <Input value={newFornecedor.pix} onChange={(e) => setNewFornecedor({ ...newFornecedor, pix: e.target.value })} placeholder="PIX" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveNewFornecedor}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewFornecedor(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Select value={form.fornecedorId} onValueChange={(v) => update("fornecedorId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.length === 0 && <SelectItem value="_none" disabled>Nenhum cadastrado</SelectItem>}
                  {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razaoSocial}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <Input type="number" min={0} step="0.01" value={(() => { const f = fornecedores.find((f) => f.id === form.fornecedorId); return f && f.razaoSocial.toLowerCase().includes("executive") ? "0" : form.custo; })()} onChange={(e) => update("custo", e.target.value)} placeholder="0,00" disabled={(() => { const f = fornecedores.find((f) => f.id === form.fornecedorId); return !!(f && f.razaoSocial.toLowerCase().includes("executive")); })()} />
          </div>

          <div className="space-y-1.5">
            <Label>Receptivo</Label>
            <Input value={form.receptivo} onChange={(e) => update("receptivo", e.target.value)} placeholder="Nome do receptivo" />
          </div>

          <div className="space-y-1.5">
            <Label>Arquivo da Placa de Receptivo</Label>
            <Input
              type="file"
              accept="image/*,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf"
              disabled={uploadingPlaca}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPlaca(f); }}
            />
            {form.placaReceptivoUrl && (
              <div className="flex items-center gap-2 text-xs">
                <a href={form.placaReceptivoUrl} target="_blank" rel="noreferrer" className="text-primary underline truncate">
                  Arquivo enviado
                </a>
                <button type="button" className="text-destructive hover:underline" onClick={() => update("placaReceptivoUrl", "")}>Remover</button>
              </div>
            )}
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

          {/* Fechamento */}
          <div className="sm:col-span-2 border-t pt-3 mt-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Fechamento Cliente</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>KM Início</Label>
                <Input type="number" min={0} value={form.kmIn} onChange={(e) => {
                  const kmIn = e.target.value;
                  const diff = (parseFloat(form.kmFim) || 0) - (parseFloat(kmIn) || 0);
                  const extra = diff > 100 ? diff - 100 : 0;
                  setForm({ ...form, kmIn, kmExtra: String(extra) });
                }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>KM Fim</Label>
                <Input type="number" min={0} value={form.kmFim} onChange={(e) => {
                  const kmFim = e.target.value;
                  const diff = (parseFloat(kmFim) || 0) - (parseFloat(form.kmIn) || 0);
                  const extra = diff > 100 ? diff - 100 : 0;
                  setForm({ ...form, kmFim, kmExtra: String(extra) });
                }} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>KM Extra</Label>
                <Input type="number" min={0} value={form.kmExtra} readOnly className="bg-muted" placeholder="0" />
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
          <Button onClick={handleSave}>Salvar Serviço</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};

export default NovoServicoDialog;
