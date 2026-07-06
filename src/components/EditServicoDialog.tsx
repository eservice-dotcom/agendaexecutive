import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgendaItem, statusFaturamentoOptions, StatusFaturamento, Passageiro, OutraDespesa } from "@/data/agendaData";
import { updateAgendaItem, getTiposServico, getVeiculos, getMotoristas, getClientes, getFornecedores, saveMotorista, Veiculo, Motorista, Cliente, Fornecedor } from "@/data/cadastroStorage";
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

const computeHoraExtra = (horaIn?: string, horaFim?: string): string => {
  if (!horaIn || !horaFim) return "";
  const toMin = (t: string) => { const [h, m] = (t || "").split(":").map(Number); return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m); };
  let total = toMin(horaFim) - toMin(horaIn);
  if (total < 0) total += 24 * 60;
  const extra = total > 600 ? total - 600 : 0;
  if (extra <= 0) return "";
  return `${String(Math.floor(extra / 60)).padStart(2, "0")}:${String(extra % 60).padStart(2, "0")}`;
};

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
    valorKmExtra: "",
    horaIn: "",
    horaFim: "",
    estacionamento: "",
    horaExtra: "",
    valorHoraExtra: "",
    valorKmExtraFornecedor: "",
    valorHoraExtraFornecedor: "",
    estacionamentoFornecedor: "",
    kmInFornecedor: "",
    kmFimFornecedor: "",
    kmExtraFornecedor: "",
    horaInFornecedor: "",
    horaFimFornecedor: "",
    horaExtraFornecedor: "",
    formaContratacao: "",
    placaReceptivoUrl: "",
    placaReceptivoUrls: [] as string[],
    comprovanteEstacionamentoUrls: [] as string[],
  });
  
  const [uploadingPlaca, setUploadingPlaca] = useState(false);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [outrosDespesas, setOutrosDespesas] = useState<OutraDespesa[]>([]);
  const [motoristaDiariaMsg, setMotoristaDiariaMsg] = useState("");
  const [showNewMotorista, setShowNewMotorista] = useState(false);
  const [newMotorista, setNewMotorista] = useState({ nome: "", cnh: "", telefone: "", email: "", categoria: "", tipos: [] as string[] });

  const handleSaveNewMotorista = async () => {
    if (!newMotorista.nome) { toast.error("Nome do motorista é obrigatório"); return; }
    try {
      await saveMotorista(newMotorista);
      const updated = await getMotoristas();
      setMotoristas(updated);
      update("motorista", newMotorista.nome);
      update("telefone", newMotorista.telefone);
      setNewMotorista({ nome: "", cnh: "", telefone: "", email: "", categoria: "", tipos: [] as string[] });
      setShowNewMotorista(false);
      toast.success("Motorista cadastrado!");
    } catch { toast.error("Erro ao cadastrar motorista"); }
  };

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
        custo: (() => {
          const total = Number(item.custo) || 0;
          const kmEf = Number((item as any).kmExtraFornecedor) || Number(item.kmExtra) || 0;
          const kmTot = kmEf * (Number((item as any).valorKmExtraFornecedor) || 0);
          const heStr = (item as any).horaExtraFornecedor || item.horaExtra || "";
          const [hh, mm] = heStr.split(":").map((v: string) => parseInt(v) || 0);
          const horas = (hh || 0) + ((mm || 0) / 60);
          const horaTot = horas * (Number((item as any).valorHoraExtraFornecedor) || 0);
          const estac = Number((item as any).estacionamentoFornecedor) || 0;
          const base = total - kmTot - horaTot - estac;
          return base > 0 ? String(base) : String(total || "");
        })(),
        observacoes: item.observacoes || "",
        receptivo: item.receptivo || "",
        statusFaturamento: item.statusFaturamento || (item as any).status_faturamento || "",
        kmIn: (item.kmIn || 0).toString(),
        kmFim: (item.kmFim || 0).toString(),
        kmExtra: (item.kmExtra || 0).toString(),
        valorKmExtra: ((item as any).valorKmExtra || 0).toString(),
        horaIn: item.horaIn || "",
        horaFim: item.horaFim || "",
        estacionamento: (item.estacionamento || 0).toString(),
        horaExtra: item.horaExtra || "",
        valorHoraExtra: ((item as any).valorHoraExtra || 0).toString(),
        valorKmExtraFornecedor: ((item as any).valorKmExtraFornecedor || 0).toString(),
        valorHoraExtraFornecedor: ((item as any).valorHoraExtraFornecedor || 0).toString(),
        estacionamentoFornecedor: ((item as any).estacionamentoFornecedor || 0).toString(),
        kmInFornecedor: ((item as any).kmInFornecedor || 0).toString(),
        kmFimFornecedor: ((item as any).kmFimFornecedor || 0).toString(),
        kmExtraFornecedor: ((item as any).kmExtraFornecedor || 0).toString(),
        horaInFornecedor: (item as any).horaInFornecedor || "",
        horaFimFornecedor: (item as any).horaFimFornecedor || "",
        horaExtraFornecedor: (item as any).horaExtraFornecedor || "",
        formaContratacao: (item as any).formaContratacao || "",
        placaReceptivoUrl: (item as any).placaReceptivoUrl || "",
        placaReceptivoUrls: ((item as any).placaReceptivoUrls || []) as string[],
        comprovanteEstacionamentoUrls: ((item as any).comprovanteEstacionamentoUrls || []) as string[],
      });
      setPassageiros(item.passageiros || []);
      setOutrosDespesas(item.outrosDespesas || []);
    }
  }, [item, open]);

  // Auto-recalcula Hora Extra quando Hora Início/Fim mudam (mantém editável manualmente)
  useEffect(() => {
    const computed = computeHoraExtra(form.horaIn, form.horaFim);
    setForm((f) => (f.horaExtra === computed ? f : { ...f, horaExtra: computed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.horaIn, form.horaFim]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleUploadPlaca = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingPlaca(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("[UploadPlaca] auth error:", userError);
        throw new Error("Sessão expirada. Faça login novamente para anexar arquivos.");
      }
      const novos: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("placas-receptivo")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) { console.error("[UploadPlaca] storage error:", upErr); throw upErr; }
        const { data } = supabase.storage.from("placas-receptivo").getPublicUrl(path);
        novos.push(data.publicUrl);
      }

      let anexosAtuais = [
        ...(form.placaReceptivoUrl ? [form.placaReceptivoUrl] : []),
        ...(form.placaReceptivoUrls || []),
      ];
      if (item?.id) {
        const { data: atual, error: fetchErr } = await supabase
          .from("agenda_items")
          .select("placa_receptivo_url, placa_receptivo_urls")
          .eq("id", item.id)
          .maybeSingle();
        if (fetchErr) { console.error("[UploadPlaca] fetch current error:", fetchErr); throw fetchErr; }
        anexosAtuais = [
          ...(((atual as any)?.placa_receptivo_url) ? [(atual as any).placa_receptivo_url] : []),
          ...(Array.isArray((atual as any)?.placa_receptivo_urls) ? (atual as any).placa_receptivo_urls : []),
          ...anexosAtuais,
        ];
      }

      const novaLista = [...new Set([...anexosAtuais, ...novos].filter(Boolean))];
      const novoLegacy = novaLista[0] || "";
      setForm((f) => ({ ...f, placaReceptivoUrl: novoLegacy, placaReceptivoUrls: novaLista }));
      // Persiste imediatamente no banco para não perder o anexo se o usuário fechar sem salvar
      if (item?.id) {
        const { error: dbErr } = await supabase
          .from("agenda_items")
          .update({ placa_receptivo_url: novoLegacy || null, placa_receptivo_urls: novaLista } as any)
          .eq("id", item.id);
        if (dbErr) { console.error("[UploadPlaca] db error:", dbErr); throw dbErr; }
        onSaved();
        toast.success(novos.length > 1 ? `${novos.length} arquivos anexados e salvos!` : "Arquivo anexado e salvo!");
      } else {
        toast.success(novos.length > 1 ? `${novos.length} arquivos prontos — clique em Salvar` : "Arquivo pronto — clique em Salvar");
      }
    } catch (e: any) {
      console.error("[UploadPlaca] falha:", e);
      toast.error("Erro ao enviar arquivo: " + (e?.message || JSON.stringify(e)), { duration: 8000 });
    } finally {
      setUploadingPlaca(false);
    }
  };

  const handleUploadEstacionamento = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingPlaca(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const novos: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `estac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("placas-receptivo").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("placas-receptivo").getPublicUrl(path);
        novos.push(data.publicUrl);
      }
      const novaLista = [...(form.comprovanteEstacionamentoUrls || []), ...novos];
      setForm((f) => ({ ...f, comprovanteEstacionamentoUrls: novaLista }));
      if (item?.id) {
        const { error: dbErr } = await supabase
          .from("agenda_items")
          .update({ comprovante_estacionamento_urls: novaLista } as any)
          .eq("id", item.id);
        if (dbErr) throw dbErr;
        onSaved();
      }
      toast.success(novos.length > 1 ? `${novos.length} arquivos enviados!` : "Comprovante enviado!");
    } catch (e: any) {
      toast.error("Erro ao enviar arquivo: " + (e?.message || ""));
    } finally {
      setUploadingPlaca(false);
    }
  };




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
    if (uploadingPlaca) {
      toast.warning("Aguarde o arquivo terminar de anexar antes de salvar.");
      return;
    }
    if (!form.data || !form.hora || !form.cliente || !form.tipo || !form.origem || !form.destino) {
      toast.error("Preencha os campos obrigatórios: Data, Hora, Cliente, Tipo, Origem e Destino.");
      return;
    }

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
        custo: (() => {
          if (form.fornecedor.toLowerCase().includes("executive")) return 0;
          const base = parseFloat(form.custo) || 0;
          const kmTot = (parseFloat(form.kmExtraFornecedor) || 0) * (parseFloat(form.valorKmExtraFornecedor) || 0);
          const [hh, mm] = (form.horaExtraFornecedor || "").split(":").map((v: string) => parseInt(v) || 0);
          const horas = (hh || 0) + ((mm || 0) / 60);
          const horaTot = horas * (parseFloat(form.valorHoraExtraFornecedor) || 0);
          const estac = parseFloat(form.estacionamentoFornecedor) || 0;
          return base + kmTot + horaTot + estac;
        })(),
        observacoes: form.observacoes,
        receptivo: form.receptivo,
        statusFaturamento: form.statusFaturamento,
        kmIn: parseFloat(form.kmIn) || 0,
        kmFim: parseFloat(form.kmFim) || 0,
        kmExtra: parseFloat(form.kmExtra) || 0,
        valorKmExtra: parseFloat(form.valorKmExtra) || 0,
        horaIn: form.horaIn || "",
        horaFim: form.horaFim || "",
        estacionamento: parseFloat(form.estacionamento) || 0,
        horaExtra: form.horaExtra || "",
        valorHoraExtra: parseFloat(form.valorHoraExtra) || 0,
        valorKmExtraFornecedor: parseFloat(form.valorKmExtraFornecedor) || 0,
        valorHoraExtraFornecedor: parseFloat(form.valorHoraExtraFornecedor) || 0,
        estacionamentoFornecedor: parseFloat(form.estacionamentoFornecedor) || 0,
        kmInFornecedor: parseFloat(form.kmInFornecedor) || 0,
        kmFimFornecedor: parseFloat(form.kmFimFornecedor) || 0,
        kmExtraFornecedor: parseFloat(form.kmExtraFornecedor) || 0,
        horaInFornecedor: form.horaInFornecedor || "",
        horaFimFornecedor: form.horaFimFornecedor || "",
        horaExtraFornecedor: form.horaExtraFornecedor || "",
        outrosDespesas: outrosDespesas,
        formaContratacao: form.formaContratacao || "",
        placaReceptivoUrl: form.placaReceptivoUrl || "",
        placaReceptivoUrls: form.placaReceptivoUrls || [],
        comprovanteEstacionamentoUrls: form.comprovanteEstacionamentoUrls || [],
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
            <div className="flex items-center justify-between">
              <Label>Motorista</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs px-2" onClick={() => setShowNewMotorista(!showNewMotorista)}>
                <Plus className="h-3 w-3" /> Novo
              </Button>
            </div>
            {showNewMotorista ? (
              <div className="grid grid-cols-2 gap-2 p-2 border border-border rounded-md">
                <Input value={newMotorista.nome} onChange={(e) => setNewMotorista({ ...newMotorista, nome: e.target.value })} placeholder="Nome *" />
                <Input value={newMotorista.telefone} onChange={(e) => setNewMotorista({ ...newMotorista, telefone: e.target.value })} placeholder="Telefone" />
                <Input value={newMotorista.cnh} onChange={(e) => setNewMotorista({ ...newMotorista, cnh: e.target.value })} placeholder="CNH" />
                <Input value={newMotorista.categoria} onChange={(e) => setNewMotorista({ ...newMotorista, categoria: e.target.value })} placeholder="Categoria" />
                <div className="col-span-2 flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveNewMotorista}>Salvar</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewMotorista(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
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
              </>
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
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              readOnly={form.fornecedor.toLowerCase().includes("executive")}
              className={form.fornecedor.toLowerCase().includes("executive") ? "bg-muted" : ""}
              value={form.fornecedor.toLowerCase().includes("executive") ? "0" : form.custo}
              onChange={(e) => update("custo", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Receptivo</Label>
            <Input value={form.receptivo} onChange={(e) => update("receptivo", e.target.value)} placeholder="Nome do receptivo" />
          </div>

          <div className="space-y-1.5">
            <Label>Arquivos da Placa de Receptivo</Label>
            <Input
              type="file"
              multiple
              accept="image/*,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.pptx"
              disabled={uploadingPlaca}
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files || []);
                e.currentTarget.value = "";
                handleUploadPlaca(files);
              }}
            />
            {(() => {
              const lista = [
                ...(form.placaReceptivoUrl ? [form.placaReceptivoUrl] : []),
                ...(form.placaReceptivoUrls || []),
              ];
              if (lista.length === 0) return null;
              return (
                <div className="space-y-1">
                  {lista.map((url, i) => (
                    <div key={url + i} className="flex items-center gap-2 text-xs">
                      <a href={url} target="_blank" rel="noreferrer" className="text-primary underline truncate">
                        Arquivo {i + 1}
                      </a>
                      <button
                        type="button"
                        className="text-destructive hover:underline"
                        onClick={async () => {
                          const novaLista = (form.placaReceptivoUrls || []).filter((u) => u !== url);
                          const novoLegacy = form.placaReceptivoUrl === url ? "" : form.placaReceptivoUrl;
                          setForm((f) => ({ ...f, placaReceptivoUrl: novoLegacy, placaReceptivoUrls: novaLista }));
                          if (item?.id) {
                            const { supabase } = await import("@/integrations/supabase/client");
                            await supabase.from("agenda_items").update({
                              placa_receptivo_urls: novaLista,
                              placa_receptivo_url: novoLegacy || null,
                            } as any).eq("id", item.id);
                            onSaved();
                          }
                        }}
                      >
                        Remover
                      </button>

                    </div>
                  ))}
                </div>
              );
            })()}
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
          <div className="sm:col-span-2 border-t pt-3 mt-2 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">Fechamento Cliente</p>

            {/* Horas */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horas</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>Hora Início</Label>
                  <Input type="time" value={form.horaIn} onChange={(e) => {
                    const horaIn = e.target.value;
                    const toMin = (t: string) => { const [h,m] = (t||"").split(":").map(Number); return (isNaN(h)?0:h)*60+(isNaN(m)?0:m); };
                    const fmt = (mins: number) => `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
                    let total = horaIn && form.horaFim ? toMin(form.horaFim) - toMin(horaIn) : 0;
                    if (total < 0) total += 24*60;
                    const extra = total > 600 ? total - 600 : 0;
                    setForm({ ...form, horaIn, horaExtra: extra > 0 ? fmt(extra) : "" });
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Fim</Label>
                  <Input type="time" value={form.horaFim} onChange={(e) => {
                    const horaFim = e.target.value;
                    const toMin = (t: string) => { const [h,m] = (t||"").split(":").map(Number); return (isNaN(h)?0:h)*60+(isNaN(m)?0:m); };
                    const fmt = (mins: number) => `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
                    let total = form.horaIn && horaFim ? toMin(horaFim) - toMin(form.horaIn) : 0;
                    if (total < 0) total += 24*60;
                    const extra = total > 600 ? total - 600 : 0;
                    setForm({ ...form, horaFim, horaExtra: extra > 0 ? fmt(extra) : "" });
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Extra</Label>
                  <Input type="time" value={form.horaExtra} onChange={(e) => update("horaExtra", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Hora Extra</Label>
                  <Input type="number" min={0} step="0.01" value={form.valorHoraExtra} onChange={(e) => update("valorHoraExtra", e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Total Hora Extra</Label>
                  <Input type="text" readOnly className="bg-muted" value={(() => {
                    const [h,m] = (form.horaExtra||"").split(":").map(Number);
                    const horas = ((isNaN(h)?0:h) + (isNaN(m)?0:m)/60);
                    return `R$ ${(horas * (parseFloat(form.valorHoraExtra) || 0)).toFixed(2)}`;
                  })()} />
                </div>
              </div>
            </div>

            {/* Outros */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outros</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Estacionamento (R$)</Label>
                  <Input type="number" min={0} step="0.01" value={form.estacionamento} onChange={(e) => update("estacionamento", e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Comprovantes de Estacionamento</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.pptx"
                    disabled={uploadingPlaca}
                    onChange={(e) => {
                      const files = Array.from(e.currentTarget.files || []);
                      e.currentTarget.value = "";
                      handleUploadEstacionamento(files);
                    }}
                  />
                  {(form.comprovanteEstacionamentoUrls || []).length > 0 && (
                    <div className="space-y-1">
                      {(form.comprovanteEstacionamentoUrls || []).map((url, i) => (
                        <div key={url + i} className="flex items-center gap-2 text-xs">
                          <a href={url} target="_blank" rel="noreferrer" className="text-primary underline truncate">Comprovante {i + 1}</a>
                          <button
                            type="button"
                            className="text-destructive hover:underline"
                            onClick={async () => {
                              const novaLista = (form.comprovanteEstacionamentoUrls || []).filter((u) => u !== url);
                              setForm((f) => ({ ...f, comprovanteEstacionamentoUrls: novaLista }));
                              if (item?.id) {
                                const { supabase } = await import("@/integrations/supabase/client");
                                await supabase.from("agenda_items").update({ comprovante_estacionamento_urls: novaLista } as any).eq("id", item.id);
                                onSaved();
                              }
                            }}
                          >Remover</button>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
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

          {/* Fechamento Fornecedor */}
          <div className="sm:col-span-2 border-t pt-3 mt-2 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">Fechamento Fornecedor</p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custo Base</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>Custo (R$)</Label>
                  <Input type="number" min={0} step="0.01" value={form.custo} onChange={(e) => update("custo", e.target.value)} placeholder="0,00" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quilometragem</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>KM Início</Label>
                  <Input type="number" min={0} value={form.kmInFornecedor} onChange={(e) => {
                    const v = e.target.value;
                    const diff = (parseFloat(form.kmFimFornecedor) || 0) - (parseFloat(v) || 0);
                    const extra = diff > 100 ? diff - 100 : 0;
                    setForm({ ...form, kmInFornecedor: v, kmExtraFornecedor: String(extra) });
                  }} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>KM Fim</Label>
                  <Input type="number" min={0} value={form.kmFimFornecedor} onChange={(e) => {
                    const v = e.target.value;
                    const diff = (parseFloat(v) || 0) - (parseFloat(form.kmInFornecedor) || 0);
                    const extra = diff > 100 ? diff - 100 : 0;
                    setForm({ ...form, kmFimFornecedor: v, kmExtraFornecedor: String(extra) });
                  }} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>KM Extra</Label>
                  <Input type="number" min={0} value={form.kmExtraFornecedor} onChange={(e) => update("kmExtraFornecedor", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Km Extra</Label>
                  <Input type="number" min={0} step="0.01" value={form.valorKmExtraFornecedor} onChange={(e) => update("valorKmExtraFornecedor", e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Total Km Extra</Label>
                  <Input type="text" readOnly className="bg-muted" value={`R$ ${((parseFloat(form.kmExtraFornecedor) || 0) * (parseFloat(form.valorKmExtraFornecedor) || 0)).toFixed(2)}`} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horas</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>Hora Início</Label>
                  <Input type="time" value={form.horaInFornecedor} onChange={(e) => {
                    const horaIn = e.target.value;
                    const toMin = (t: string) => { const [h,m] = (t||"").split(":").map(Number); return (isNaN(h)?0:h)*60+(isNaN(m)?0:m); };
                    const fmt = (mins: number) => `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
                    let total = horaIn && form.horaFimFornecedor ? toMin(form.horaFimFornecedor) - toMin(horaIn) : 0;
                    if (total < 0) total += 24*60;
                    const extra = total > 600 ? total - 600 : 0;
                    setForm({ ...form, horaInFornecedor: horaIn, horaExtraFornecedor: extra > 0 ? fmt(extra) : "" });
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Fim</Label>
                  <Input type="time" value={form.horaFimFornecedor} onChange={(e) => {
                    const horaFim = e.target.value;
                    const toMin = (t: string) => { const [h,m] = (t||"").split(":").map(Number); return (isNaN(h)?0:h)*60+(isNaN(m)?0:m); };
                    const fmt = (mins: number) => `${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
                    let total = form.horaInFornecedor && horaFim ? toMin(horaFim) - toMin(form.horaInFornecedor) : 0;
                    if (total < 0) total += 24*60;
                    const extra = total > 600 ? total - 600 : 0;
                    setForm({ ...form, horaFimFornecedor: horaFim, horaExtraFornecedor: extra > 0 ? fmt(extra) : "" });
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora Extra</Label>
                  <Input type="time" value={form.horaExtraFornecedor} onChange={(e) => update("horaExtraFornecedor", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Hora Extra</Label>
                  <Input type="number" min={0} step="0.01" value={form.valorHoraExtraFornecedor} onChange={(e) => update("valorHoraExtraFornecedor", e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>R$ Total Hora Extra</Label>
                  <Input type="text" readOnly className="bg-muted" value={(() => {
                    const [h,m] = (form.horaExtraFornecedor||"").split(":").map(Number);
                    const horas = ((isNaN(h)?0:h) + (isNaN(m)?0:m)/60);
                    return `R$ ${(horas * (parseFloat(form.valorHoraExtraFornecedor) || 0)).toFixed(2)}`;
                  })()} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outros</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>Estacionamento (R$)</Label>
                  <Input type="number" min={0} step="0.01" value={form.estacionamentoFornecedor} onChange={(e) => update("estacionamentoFornecedor", e.target.value)} placeholder="0,00" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={uploadingPlaca}>
            {uploadingPlaca ? "Anexando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};

export default EditServicoDialog;
