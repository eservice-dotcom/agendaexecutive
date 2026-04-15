import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo-executive-service.png";
import { Plus, Trash2, Save, Pencil, FileText, CalendarDays, ClipboardList, ShoppingCart, Printer, FileSignature, Upload, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getClientes, getVeiculos, getTiposServico } from "@/data/cadastroStorage";
import { printContrato } from "@/lib/printUtils";

interface ContratoItem {
  descritivo: string;
  valor: number;
  tipo_servico: string;
  forma_contratacao: string;
  origem: string;
  destino: string;
  paradas: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  duracao_estimada: string;
}

interface ContratoVeiculo {
  tipo: string;
  modelo: string;
  placa: string;
  ano: string;
  cor: string;
  capacidade: string;
  acessorios: string;
}

interface Contrato {
  id: string;
  numero_contrato: number;
  data_emissao: string;
  contratante_nome: string;
  contratante_cnpj_cpf: string;
  contratante_inscricao: string;
  contratante_endereco: string;
  contratante_cidade: string;
  contratante_uf: string;
  contratante_cep: string;
  contratante_telefone: string;
  contratante_email: string;
  contratante_contato: string;
  veiculo_tipo: string;
  veiculo_modelo: string;
  veiculo_placa: string;
  veiculo_ano: string;
  veiculo_cor: string;
  veiculo_capacidade: string;
  veiculo_acessorios: string;
  tipo_servico: string;
  forma_contratacao: string;
  origem: string;
  destino: string;
  paradas: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  duracao_estimada: string;
  valor_total: number;
  valor_unitario: string;
  km_excedente: string;
  hora_extra: string;
  estacionamento_pedagio: string;
  alimentacao_motorista: string;
  outros_extras: string;
  forma_faturamento: string;
  condicao_pagamento: string;
  data_vencimento: string;
  dados_faturamento: string;
  antecedencia_cancelamento: string;
  multa_cancelamento: string;
  observacoes: string;
  foro_comarca: string;
  arquivo_assinado_url: string;
  dados_bancarios: string;
  contrato_items: ContratoItem[];
  contrato_veiculos: ContratoVeiculo[];
}

const emptyVeiculo: ContratoVeiculo = {
  tipo: "", modelo: "", placa: "", ano: "", cor: "", capacidade: "", acessorios: "",
};

const emptyItem: ContratoItem = {
  descritivo: "", valor: 0, tipo_servico: "", forma_contratacao: "",
  origem: "", destino: "", paradas: "", data_inicio: "", hora_inicio: "",
  data_fim: "", hora_fim: "", duracao_estimada: "",
};

const emptyContrato: Omit<Contrato, "id" | "numero_contrato"> = {
  data_emissao: new Date().toISOString().split("T")[0],
  contratante_nome: "", contratante_cnpj_cpf: "", contratante_inscricao: "",
  contratante_endereco: "", contratante_cidade: "", contratante_uf: "",
  contratante_cep: "", contratante_telefone: "", contratante_email: "", contratante_contato: "",
  veiculo_tipo: "", veiculo_modelo: "", veiculo_placa: "", veiculo_ano: "",
  veiculo_cor: "", veiculo_capacidade: "", veiculo_acessorios: "",
  tipo_servico: "", forma_contratacao: "", origem: "", destino: "", paradas: "",
  data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "", duracao_estimada: "",
  valor_total: 0, valor_unitario: "", km_excedente: "", hora_extra: "",
  estacionamento_pedagio: "", alimentacao_motorista: "", outros_extras: "",
  forma_faturamento: "", condicao_pagamento: "", data_vencimento: "", dados_faturamento: "",
  antecedencia_cancelamento: "24", multa_cancelamento: "50",
  observacoes: "", foro_comarca: "", arquivo_assinado_url: "", dados_bancarios: "",
  contrato_items: [{ ...emptyItem }],
  contrato_veiculos: [{ ...emptyVeiculo }],
};

const formatDate = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const Contratos = () => {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [form, setForm] = useState(emptyContrato);
  const [hasPermission, setHasPermission] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Lookup data
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [tiposServico, setTiposServico] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("numero_contrato", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar contratos");
    } else {
      setContratos((data || []).map((c: any) => ({
        ...c,
        data_emissao: c.data_emissao || "",
        data_inicio: c.data_inicio || "",
        data_fim: c.data_fim || "",
        data_vencimento: c.data_vencimento || "",
        contrato_items: Array.isArray(c.contrato_items) && c.contrato_items.length > 0
          ? c.contrato_items
          : [],
        contrato_veiculos: Array.isArray(c.contrato_veiculos) && c.contrato_veiculos.length > 0
          ? c.contrato_veiculos
          : [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    Promise.all([getClientes(), getVeiculos(), getTiposServico()]).then(([c, v, t]) => {
      setClientes(c);
      setVeiculos(v);
      setTiposServico(t);
    });
  }, [loadData]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.rpc("can_view_financials", { _user_id: session.user.id }).then(({ data }) => {
      setHasPermission(!!data);
    });
  }, [session]);

  // Handle navigation from Cotações → Gerar Contrato
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromCotacao) {
      const cot = state.fromCotacao;
      const cliente = clientes.find(c => c.nome === cot.empresa);
      const cotItems: ContratoItem[] = cot.items?.map((i: any) => ({
        ...emptyItem,
        descritivo: i.descritivo || "",
        valor: i.valor || 0,
      })) || [{ ...emptyItem }];

      setForm({
        ...emptyContrato,
        contratante_nome: cot.empresa || "",
        contratante_contato: cot.destinatario || "",
        contratante_cnpj_cpf: cliente?.cnpj_cpf || "",
        contratante_email: cliente?.email || "",
        contratante_telefone: cliente?.telefone || "",
        contratante_endereco: cliente?.endereco || "",
        contratante_cidade: cliente?.cidade || "",
        contratante_uf: cliente?.uf || "",
        contratante_cep: cliente?.cep || "",
        condicao_pagamento: cot.forma_pagamento || "",
        observacoes: `Ref. Cotação nº ${cot.numero_cotacao}${cot.observacoes ? ". " + cot.observacoes : ""}`,
        valor_total: cot.valor_total || 0,
        tipo_servico: "",
        contrato_items: cotItems,
        contrato_veiculos: [{ ...emptyVeiculo }],
      });
      setEditingContrato(null);
      setDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, clientes]);

  const setField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Items helpers
  const itemsTotal = form.contrato_items.reduce((sum, i) => sum + (Number(i.valor) || 0), 0);

  const addItem = () => setForm(prev => ({
    ...prev,
    contrato_items: [...prev.contrato_items, { ...emptyItem }],
  }));

  const removeItem = (idx: number) => setForm(prev => ({
    ...prev,
    contrato_items: prev.contrato_items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx: number, field: keyof ContratoItem, value: any) => {
    setForm(prev => {
      const items = [...prev.contrato_items];
      items[idx] = { ...items[idx], [field]: value };
      const total = items.reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
      return { ...prev, contrato_items: items, valor_total: total };
    });
  };

  // Veículos helpers
  const addVeiculo = () => setForm(prev => ({
    ...prev,
    contrato_veiculos: [...prev.contrato_veiculos, { ...emptyVeiculo }],
  }));

  const removeVeiculo = (idx: number) => setForm(prev => ({
    ...prev,
    contrato_veiculos: prev.contrato_veiculos.filter((_, i) => i !== idx),
  }));

  const updateVeiculo = (idx: number, field: keyof ContratoVeiculo, value: string) => {
    setForm(prev => {
      const veics = [...prev.contrato_veiculos];
      veics[idx] = { ...veics[idx], [field]: value };
      return { ...prev, contrato_veiculos: veics };
    });
  };

  const handleVeiculoSelectForIndex = (placa: string, idx: number) => {
    const v = veiculos.find(ve => ve.placa === placa);
    if (v) {
      setForm(prev => {
        const veics = [...prev.contrato_veiculos];
        veics[idx] = {
          placa: v.placa,
          modelo: v.modelo || "",
          tipo: v.tipo || "",
          ano: String(v.ano || ""),
          capacidade: String(v.capacidade || ""),
          cor: "",
          acessorios: "",
        };
        return { ...prev, contrato_veiculos: veics };
      });
    }
  };

  const openNew = () => {
    setEditingContrato(null);
    setForm(emptyContrato);
    setDialogOpen(true);
  };

  const openEdit = (c: Contrato) => {
    setEditingContrato(c);
    const { id, numero_contrato, ...rest } = c;
    setForm({
      ...rest as any,
      contrato_items: Array.isArray(c.contrato_items) && c.contrato_items.length > 0
        ? c.contrato_items.map((i: any) => ({ ...emptyItem, ...i }))
        : [{ ...emptyItem }],
      contrato_veiculos: Array.isArray(c.contrato_veiculos) && c.contrato_veiculos.length > 0
        ? c.contrato_veiculos
        : [{ ...emptyVeiculo }],
    });
    setDialogOpen(true);
  };

  const handleClienteSelect = (nome: string) => {
    const cliente = clientes.find(c => c.nome === nome);
    if (cliente) {
      setForm(prev => ({
        ...prev,
        contratante_nome: cliente.nome,
        contratante_cnpj_cpf: cliente.cnpjCpf || "",
        contratante_endereco: cliente.endereco || "",
        contratante_cidade: cliente.cidade || "",
        contratante_uf: cliente.uf || "",
        contratante_cep: cliente.cep || "",
        contratante_telefone: cliente.telefone || "",
        contratante_email: cliente.email || "",
      }));
    }
  };

  const handleSave = async () => {
    if (!form.contratante_nome.trim()) {
      toast.error("Informe o nome do contratante");
      return;
    }
    try {
      const payload = {
        ...form,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        data_vencimento: form.data_vencimento || null,
        contrato_items: form.contrato_items,
        contrato_veiculos: form.contrato_veiculos,
        // Sync legacy single vehicle fields from first vehicle for backwards compat
        veiculo_tipo: form.contrato_veiculos[0]?.tipo || form.veiculo_tipo,
        veiculo_modelo: form.contrato_veiculos[0]?.modelo || form.veiculo_modelo,
        veiculo_placa: form.contrato_veiculos[0]?.placa || form.veiculo_placa,
        veiculo_ano: form.contrato_veiculos[0]?.ano || form.veiculo_ano,
        veiculo_cor: form.contrato_veiculos[0]?.cor || form.veiculo_cor,
        veiculo_capacidade: form.contrato_veiculos[0]?.capacidade || form.veiculo_capacidade,
        veiculo_acessorios: form.contrato_veiculos[0]?.acessorios || form.veiculo_acessorios,
      };

      if (editingContrato) {
        const { error } = await supabase
          .from("contratos")
          .update(payload as any)
          .eq("id", editingContrato.id);
        if (error) throw error;
        toast.success("Contrato atualizado!");
      } else {
        const { error } = await supabase
          .from("contratos")
          .insert({
            user_id: session!.user.id,
            ...payload,
          } as any);
        if (error) throw error;
        toast.success("Contrato criado!");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    const { error } = await supabase.from("contratos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Contrato excluído");
      loadData();
    }
  };

  const handlePrint = (c: Contrato) => {
    printContrato(c, logo);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingContrato) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${editingContrato.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("contratos-assinados")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contratos-assinados")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      await supabase.from("contratos").update({ arquivo_assinado_url: publicUrl } as any).eq("id", editingContrato.id);
      setField("arquivo_assinado_url", publicUrl);
      setEditingContrato({ ...editingContrato, arquivo_assinado_url: publicUrl });
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleFileRemove = async () => {
    if (!editingContrato || !form.arquivo_assinado_url) return;
    if (!confirm("Remover o arquivo assinado?")) return;
    try {
      const url = form.arquivo_assinado_url;
      const bucketPath = url.split("/contratos-assinados/").pop();
      if (bucketPath) {
        await supabase.storage.from("contratos-assinados").remove([bucketPath]);
      }
      await supabase.from("contratos").update({ arquivo_assinado_url: "" } as any).eq("id", editingContrato.id);
      setField("arquivo_assinado_url", "");
      setEditingContrato({ ...editingContrato, arquivo_assinado_url: "" });
      toast.success("Arquivo removido!");
    } catch (err: any) {
      toast.error("Erro ao remover arquivo");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-3 text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded" />
            <h1 className="text-lg font-bold">Executive Service</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <CalendarDays className="h-4 w-4" /> Agenda
              </span>
            </Link>
            {hasPermission && (
              <Link to="/vendas">
                <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                  <ShoppingCart className="h-4 w-4" /> Vendas
                </span>
              </Link>
            )}
            <Link to="/cotacoes">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <FileText className="h-4 w-4" /> Cotações
              </span>
            </Link>
            <span className="flex items-center gap-1 text-sm text-primary-foreground font-semibold">
              <FileSignature className="h-4 w-4" /> Contratos
            </span>
            <Link to="/cadastros">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <ClipboardList className="h-4 w-4" /> Cadastros
              </span>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground/80 hover:text-primary-foreground">
              Sair
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Contratos</h2>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Contrato</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : contratos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum contrato registrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Contratante</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">
                      <span className="flex items-center gap-1">
                        {c.numero_contrato}
                        {c.arquivo_assinado_url && <span title="Contrato assinado anexado"><FileText className="h-3 w-3 text-primary" /></span>}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(c.data_emissao)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.contratante_nome}</TableCell>
                    <TableCell>{c.tipo_servico}</TableCell>
                    <TableCell>
                      {c.data_inicio && c.data_fim
                        ? `${formatDate(c.data_inicio)} a ${formatDate(c.data_fim)}`
                        : c.data_inicio ? formatDate(c.data_inicio) : ""}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(c.valor_total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(c)} title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContrato ? `Editar Contrato #${editingContrato.numero_contrato}` : "Novo Contrato"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contratante */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Dados do Contratante</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome / Razão Social *</Label>
                  <div className="flex gap-2">
                    <Input value={form.contratante_nome} onChange={e => setField("contratante_nome", e.target.value)} placeholder="Nome do contratante" />
                    {clientes.length > 0 && (
                      <Select onValueChange={handleClienteSelect}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Importar cliente" /></SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div>
                  <Label>CNPJ / CPF</Label>
                  <Input value={form.contratante_cnpj_cpf} onChange={e => setField("contratante_cnpj_cpf", e.target.value)} />
                </div>
                <div>
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.contratante_inscricao} onChange={e => setField("contratante_inscricao", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.contratante_endereco} onChange={e => setField("contratante_endereco", e.target.value)} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.contratante_cidade} onChange={e => setField("contratante_cidade", e.target.value)} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={form.contratante_uf} onChange={e => setField("contratante_uf", e.target.value)} className="w-20" maxLength={2} />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={form.contratante_cep} onChange={e => setField("contratante_cep", e.target.value)} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.contratante_telefone} onChange={e => setField("contratante_telefone", e.target.value)} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={form.contratante_email} onChange={e => setField("contratante_email", e.target.value)} />
                </div>
                <div>
                  <Label>Contato Responsável</Label>
                  <Input value={form.contratante_contato} onChange={e => setField("contratante_contato", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Veículos (múltiplos) */}
            <div>
              <div className="flex items-center justify-between mb-2 border-b pb-1">
                <h3 className="text-sm font-semibold text-primary">Veículos</h3>
                <Button type="button" variant="outline" size="sm" onClick={addVeiculo}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Veículo
                </Button>
              </div>
              {form.contrato_veiculos.map((v, idx) => (
                <div key={idx} className="mb-3 p-3 border rounded-md relative">
                  {form.contrato_veiculos.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeVeiculo(idx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Placa</Label>
                      <div className="flex gap-1">
                        <Input value={v.placa} onChange={e => updateVeiculo(idx, "placa", e.target.value)} className="h-8 text-xs" />
                        {veiculos.length > 0 && (
                          <Select onValueChange={(val) => handleVeiculoSelectForIndex(val, idx)}>
                            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Buscar" /></SelectTrigger>
                            <SelectContent>
                              {veiculos.map(ve => <SelectItem key={ve.id} value={ve.placa}>{ve.placa} - {ve.modelo}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Input value={v.tipo} onChange={e => updateVeiculo(idx, "tipo", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <Input value={v.modelo} onChange={e => updateVeiculo(idx, "modelo", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Ano</Label>
                      <Input value={v.ano} onChange={e => updateVeiculo(idx, "ano", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Cor</Label>
                      <Input value={v.cor} onChange={e => updateVeiculo(idx, "cor", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Capacidade</Label>
                      <Input value={v.capacidade} onChange={e => updateVeiculo(idx, "capacidade", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Acessórios</Label>
                      <Input value={v.acessorios} onChange={e => updateVeiculo(idx, "acessorios", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Serviço */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Dados do Serviço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={form.tipo_servico} onValueChange={v => setField("tipo_servico", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tiposServico.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Forma de Contratação</Label>
                  <Select value={form.forma_contratacao} onValueChange={v => setField("forma_contratacao", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Por hora">Por hora</SelectItem>
                      <SelectItem value="Por km">Por km</SelectItem>
                      <SelectItem value="Diária">Diária</SelectItem>
                      <SelectItem value="Pacote">Pacote</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração Estimada</Label>
                  <Input value={form.duracao_estimada} onChange={e => setField("duracao_estimada", e.target.value)} placeholder="Ex: 5 dias" />
                </div>
                <div>
                  <Label>Origem</Label>
                  <Input value={form.origem} onChange={e => setField("origem", e.target.value)} />
                </div>
                <div>
                  <Label>Destino</Label>
                  <Input value={form.destino} onChange={e => setField("destino", e.target.value)} />
                </div>
                <div>
                  <Label>Paradas Intermediárias</Label>
                  <Input value={form.paradas} onChange={e => setField("paradas", e.target.value)} />
                </div>
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => setField("data_inicio", e.target.value)} />
                </div>
                <div>
                  <Label>Hora Início</Label>
                  <Input value={form.hora_inicio} onChange={e => setField("hora_inicio", e.target.value)} placeholder="08:00" />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={form.data_fim} onChange={e => setField("data_fim", e.target.value)} />
                </div>
                <div>
                  <Label>Hora Fim</Label>
                  <Input value={form.hora_fim} onChange={e => setField("hora_fim", e.target.value)} placeholder="18:00" />
                </div>
              </div>
            </div>

            {/* Itens do Contrato */}
            <div>
              <div className="flex items-center justify-between mb-2 border-b pb-1">
                <h3 className="text-sm font-semibold text-primary">Itens do Contrato</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                </Button>
              </div>
              <div className="space-y-2">
                {form.contrato_items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs">Descritivo</Label>}
                      <Input
                        value={item.descritivo}
                        onChange={e => updateItem(idx, "descritivo", e.target.value)}
                        placeholder="Descrição do item"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-32">
                      {idx === 0 && <Label className="text-xs">Valor (R$)</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        value={item.valor || ""}
                        onChange={e => updateItem(idx, "valor", Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    {form.contrato_items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right text-sm font-semibold">
                Valor Total: {formatCurrency(itemsTotal)}
              </div>
            </div>

            {/* Valores e Faturamento */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Extras e Faturamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>KM Excedente</Label>
                  <Input value={form.km_excedente} onChange={e => setField("km_excedente", e.target.value)} placeholder="R$ ___/km" />
                </div>
                <div>
                  <Label>Hora Extra</Label>
                  <Input value={form.hora_extra} onChange={e => setField("hora_extra", e.target.value)} placeholder="R$ ___/hora" />
                </div>
                <div>
                  <Label>Estacionamento / Pedágio</Label>
                  <Input value={form.estacionamento_pedagio} onChange={e => setField("estacionamento_pedagio", e.target.value)} />
                </div>
                <div>
                  <Label>Alimentação Motorista</Label>
                  <Input value={form.alimentacao_motorista} onChange={e => setField("alimentacao_motorista", e.target.value)} />
                </div>
                <div>
                  <Label>Outros Extras</Label>
                  <Input value={form.outros_extras} onChange={e => setField("outros_extras", e.target.value)} />
                </div>
                <div>
                  <Label>Forma de Faturamento</Label>
                  <Input value={form.forma_faturamento} onChange={e => setField("forma_faturamento", e.target.value)} placeholder="Ex: PIX, Boleto..." />
                </div>
                <div>
                  <Label>Condição de Pagamento</Label>
                  <Input value={form.condicao_pagamento} onChange={e => setField("condicao_pagamento", e.target.value)} placeholder="Ex: 30 dias" />
                </div>
                <div>
                  <Label>Data Vencimento</Label>
                  <Input type="date" value={form.data_vencimento} onChange={e => setField("data_vencimento", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Dados para Faturamento (se diferente)</Label>
                  <Input value={form.dados_faturamento} onChange={e => setField("dados_faturamento", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Dados Bancários</Label>
                  <Textarea value={form.dados_bancarios} onChange={e => setField("dados_bancarios", e.target.value)} rows={2} placeholder="Banco, Agência, Conta, PIX..." />
                </div>
              </div>
            </div>

            {/* Cancelamento e Observações */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Cancelamento e Observações</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Antecedência Cancelamento (horas)</Label>
                  <Input value={form.antecedencia_cancelamento} onChange={e => setField("antecedencia_cancelamento", e.target.value)} />
                </div>
                <div>
                  <Label>Multa Cancelamento (%)</Label>
                  <Input value={form.multa_cancelamento} onChange={e => setField("multa_cancelamento", e.target.value)} />
                </div>
                <div>
                  <Label>Foro (Comarca)</Label>
                  <Input value={form.foro_comarca} onChange={e => setField("foro_comarca", e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Observações Adicionais</Label>
                  <Textarea value={form.observacoes} onChange={e => setField("observacoes", e.target.value)} rows={3} />
                </div>
              </div>
            </div>

            {/* Arquivo Assinado */}
            {editingContrato && (
              <div>
                <h3 className="text-sm font-semibold text-primary mb-2 border-b pb-1">Contrato Assinado</h3>
                <div className="flex items-center gap-3">
                  {form.arquivo_assinado_url ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" /> Arquivo anexado
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a href={form.arquivo_assinado_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" /> Visualizar
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={handleFileRemove}>
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/50 px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <Upload className="h-4 w-4" />
                          {uploading ? "Enviando..." : "Clique para enviar o contrato assinado (PDF, imagem)"}
                        </div>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contratos;
