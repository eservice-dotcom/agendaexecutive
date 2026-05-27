import { supabase } from "@/integrations/supabase/client";
import { AgendaItem, mockData, tiposServicoDefault } from "@/data/agendaData";

export interface Cliente {
  id: string;
  nome: string;
  cnpjCpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cep: string;
  cidade: string;
  uf: string;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: string;
  capacidade: number;
  ano: number;
}

export interface Motorista {
  id: string;
  nome: string;
  cnh: string;
  telefone: string;
  email: string;
  categoria: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  pix: string;
}

// Clientes
export const getClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");
  
  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
  
  return (data || []).map((item) => ({
    id: item.id,
    nome: item.nome,
    cnpjCpf: item.cnpj_cpf,
    email: item.email,
    telefone: item.telefone,
    endereco: item.endereco,
    cep: (item as any).cep || "",
    cidade: (item as any).cidade || "",
    uf: (item as any).uf || "",
  }));
};

export const saveCliente = async (item: Omit<Cliente, "id">) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("clientes").insert({
    user_id: user.id,
    nome: item.nome,
    cnpj_cpf: item.cnpjCpf,
    email: item.email,
    telefone: item.telefone,
    endereco: item.endereco,
    cep: item.cep || "",
    cidade: item.cidade || "",
    uf: item.uf || "",
  });
  
  if (error) throw error;
};

export const updateCliente = async (id: string, item: Omit<Cliente, "id">, oldNome?: string) => {
  const { error } = await supabase.from("clientes").update({
    nome: item.nome,
    cnpj_cpf: item.cnpjCpf,
    email: item.email,
    telefone: item.telefone,
    endereco: item.endereco,
    cep: item.cep || "",
    cidade: item.cidade || "",
    uf: item.uf || "",
  }).eq("id", id);
  if (error) throw error;

  // Se o nome mudou, atualizar registros relacionados
  if (oldNome && oldNome !== item.nome) {
    await Promise.all([
      supabase.from("agenda_items").update({ cliente: item.nome } as any).eq("cliente", oldNome),
      supabase.from("contas_receber").update({ cliente: item.nome } as any).eq("cliente", oldNome),
      supabase.from("vendas").update({ cliente: item.nome } as any).eq("cliente", oldNome),
      supabase.from("fechamentos").update({ cliente: item.nome } as any).eq("cliente", oldNome),
    ]);
  }
};

export const deleteCliente = async (id: string) => {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
};

// Veículos
export const getVeiculos = async (): Promise<Veiculo[]> => {
  const { data, error } = await supabase
    .from("veiculos")
    .select("*")
    .order("placa");
  
  if (error) {
    console.error("Erro ao buscar veículos:", error);
    return [];
  }
  
  return data || [];
};

export const saveVeiculo = async (item: Omit<Veiculo, "id">) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("veiculos").insert({
    user_id: user.id,
    ...item,
  });
  
  if (error) throw error;
};

export const updateVeiculo = async (id: string, item: Partial<Omit<Veiculo, "id">>) => {
  const { error } = await supabase.from("veiculos").update(item).eq("id", id);
  if (error) throw error;
};

export const deleteVeiculo = async (id: string) => {
  const { error } = await supabase.from("veiculos").delete().eq("id", id);
  if (error) throw error;
};

// Motoristas
export const getMotoristas = async (): Promise<Motorista[]> => {
  const { data, error } = await supabase
    .from("motoristas")
    .select("*")
    .order("nome");
  
  if (error) {
    console.error("Erro ao buscar motoristas:", error);
    return [];
  }
  
  return data || [];
};

export const saveMotorista = async (item: Omit<Motorista, "id">) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("motoristas").insert({
    user_id: user.id,
    ...item,
  });
  
  if (error) throw error;
};

export const updateMotorista = async (id: string, item: Omit<Motorista, "id">) => {
  const { error } = await supabase.from("motoristas").update({
    nome: item.nome,
    cnh: item.cnh,
    telefone: item.telefone,
    email: item.email,
    categoria: item.categoria,
  }).eq("id", id);
  if (error) throw error;
};

export const deleteMotorista = async (id: string) => {
  const { error } = await supabase.from("motoristas").delete().eq("id", id);
  if (error) throw error;
};

// Fornecedores
export const getFornecedores = async (): Promise<Fornecedor[]> => {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .order("razao_social");
  
  if (error) {
    console.error("Erro ao buscar fornecedores:", error);
    return [];
  }
  
  return (data || []).map((item) => ({
    id: item.id,
    razaoSocial: item.razao_social,
    cnpj: item.cnpj,
    contato: item.contato,
    telefone: item.telefone,
    email: item.email,
    pix: (item as any).pix || "",
  }));
};

export const saveFornecedor = async (item: Omit<Fornecedor, "id">) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("fornecedores").insert({
    user_id: user.id,
    razao_social: item.razaoSocial,
    cnpj: item.cnpj,
    contato: item.contato,
    telefone: item.telefone,
    email: item.email,
    pix: item.pix,
  } as any);
  
  if (error) throw error;
};

export const updateFornecedor = async (id: string, item: Omit<Fornecedor, "id">, oldRazaoSocial?: string) => {
  const { error } = await supabase.from("fornecedores").update({
    razao_social: item.razaoSocial,
    cnpj: item.cnpj,
    contato: item.contato,
    telefone: item.telefone,
    email: item.email,
    pix: item.pix,
  } as any).eq("id", id);
  if (error) throw error;

  // Se a razão social mudou, atualizar registros relacionados
  if (oldRazaoSocial && oldRazaoSocial !== item.razaoSocial) {
    await Promise.all([
      supabase.from("agenda_items").update({ fornecedor: item.razaoSocial } as any).eq("fornecedor", oldRazaoSocial),
      supabase.from("contas_pagar").update({ fornecedor: item.razaoSocial } as any).eq("fornecedor", oldRazaoSocial),
    ]);
  }
};

export const deleteFornecedor = async (id: string) => {
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);
  if (error) throw error;
};

// Tipos de Serviço
export const getTiposServico = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("tipos_servico")
    .select("tipo")
    .order("tipo");
  
  if (error) {
    console.error("Erro ao buscar tipos de serviço:", error);
    return [];
  }
  
  return data && data.length > 0 ? data.map((item) => item.tipo) : [];
};

export const saveTipoServico = async (tipo: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("tipos_servico").insert({
    user_id: user.id,
    tipo,
  });
  
  if (error) throw error;
};

export const deleteTipoServico = async (tipo: string) => {
  const { error } = await supabase
    .from("tipos_servico")
    .delete()
    .eq("tipo", tipo);
  
  if (error) throw error;
};

// Agenda
export const getAgendaItems = async (): Promise<AgendaItem[]> => {
  const pageSize = 1000;
  const allItems: any[] = [];

  const fetchPage = async (from: number): Promise<void> => {
    const { data, error } = await supabase
      .from("agenda_items")
      .select("*")
      .is("deleted_at", null)
      .order("data", { ascending: true })
      .order("hora", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    
    if (error) throw error;
    allItems.push(...(data || []));

    if ((data || []).length === pageSize) {
      await fetchPage(from + pageSize);
    }
  };

  try {
    await fetchPage(0);
  } catch (error) {
    console.error("Erro ao buscar itens da agenda:", error);
    return [];
  }
  
  return allItems.map((item) => ({
    id: item.id,
    data: item.data,
    hora: item.hora,
    cliente: item.cliente,
    pax: item.pax,
    passageiros: item.passageiros as { nome: string; voo: string }[],
    cot: item.cot,
    tipo: item.tipo,
    origem: item.origem,
    destino: item.destino,
    placa: item.placa,
    veiculo: item.veiculo,
    motorista: item.motorista,
    telefone: item.telefone,
    valor: Number(item.valor),
    fornecedor: item.fornecedor,
    custo: Number(item.custo),
    observacoes: item.observacoes || "",
    receptivo: item.receptivo || "",
    statusFaturamento: (item.status_faturamento || "") as any,
    corManual: (item as any).cor_manual || undefined,
    kmIn: Number((item as any).km_in) || 0,
    kmFim: Number((item as any).km_fim) || 0,
    kmExtra: Number((item as any).km_extra) || 0,
    valorKmExtra: Number((item as any).valor_km_extra) || 0,
    valorHoraExtra: Number((item as any).valor_hora_extra) || 0,
    valorKmExtraFornecedor: Number((item as any).valor_km_extra_fornecedor) || 0,
    valorHoraExtraFornecedor: Number((item as any).valor_hora_extra_fornecedor) || 0,
    estacionamentoFornecedor: Number((item as any).estacionamento_fornecedor) || 0,
    horaIn: (item as any).hora_in || "",
    horaFim: (item as any).hora_fim || "",
    estacionamento: Number((item as any).estacionamento) || 0,
    horaExtra: (item as any).hora_extra || "",
    kmInFornecedor: Number((item as any).km_in_fornecedor) || 0,
    kmFimFornecedor: Number((item as any).km_fim_fornecedor) || 0,
    kmExtraFornecedor: Number((item as any).km_extra_fornecedor) || 0,
    horaInFornecedor: (item as any).hora_in_fornecedor || "",
    horaFimFornecedor: (item as any).hora_fim_fornecedor || "",
    horaExtraFornecedor: (item as any).hora_extra_fornecedor || "",
    outrosDespesas: ((item as any).outros_despesas || []) as { descricao: string; valor: number }[],
    formaContratacao: (item as any).forma_contratacao || "",
    placaReceptivoUrl: (item as any).placa_receptivo_url || "",
    placaReceptivoUrls: (() => {
      const arr: string[] = Array.isArray((item as any).placa_receptivo_urls) ? (item as any).placa_receptivo_urls.filter(Boolean) : [];
      const legacy = (item as any).placa_receptivo_url;
      if (legacy && !arr.includes(legacy)) arr.unshift(legacy);
      return arr;
    })(),
    comprovanteEstacionamentoUrls: Array.isArray((item as any).comprovante_estacionamento_urls)
      ? (item as any).comprovante_estacionamento_urls.filter(Boolean)
      : [],
  }));
};

export const saveAgendaItem = async (item: Omit<AgendaItem, "id">) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("agenda_items").insert({
    user_id: user.id,
    data: item.data,
    hora: item.hora,
    cliente: item.cliente,
    pax: item.pax,
    passageiros: item.passageiros as any,
    cot: item.cot,
    tipo: item.tipo,
    origem: item.origem,
    destino: item.destino,
    placa: item.placa,
    veiculo: item.veiculo,
    motorista: item.motorista,
    telefone: item.telefone,
    valor: item.valor,
    fornecedor: item.fornecedor,
    custo: item.custo,
    observacoes: item.observacoes,
    receptivo: item.receptivo || "",
    status_faturamento: item.statusFaturamento,
    km_in: item.kmIn || 0,
    km_fim: item.kmFim || 0,
    km_extra: item.kmExtra || 0,
    valor_km_extra: item.valorKmExtra || 0,
    valor_hora_extra: item.valorHoraExtra || 0,
    valor_km_extra_fornecedor: item.valorKmExtraFornecedor || 0,
    valor_hora_extra_fornecedor: item.valorHoraExtraFornecedor || 0,
    estacionamento_fornecedor: item.estacionamentoFornecedor || 0,
    hora_in: item.horaIn || null,
    hora_fim: item.horaFim || null,
    estacionamento: item.estacionamento || 0,
    hora_extra: item.horaExtra || "",
    outros_despesas: item.outrosDespesas || [],
    forma_contratacao: item.formaContratacao || "",
    placa_receptivo_url: item.placaReceptivoUrl || null,
    placa_receptivo_urls: item.placaReceptivoUrls || [],
    km_in_fornecedor: item.kmInFornecedor || 0,
    km_fim_fornecedor: item.kmFimFornecedor || 0,
    km_extra_fornecedor: item.kmExtraFornecedor || 0,
    hora_in_fornecedor: item.horaInFornecedor || null,
    hora_fim_fornecedor: item.horaFimFornecedor || null,
    hora_extra_fornecedor: item.horaExtraFornecedor || "",
  } as any);
  
  if (error) throw error;
};

export const updateAgendaItem = async (updated: AgendaItem) => {
  const { error } = await supabase
    .from("agenda_items")
    .update({
      data: updated.data,
      hora: updated.hora,
      cliente: updated.cliente,
      pax: updated.pax,
      passageiros: updated.passageiros as any,
      cot: updated.cot,
      tipo: updated.tipo,
      origem: updated.origem,
      destino: updated.destino,
      placa: updated.placa,
      veiculo: updated.veiculo,
      motorista: updated.motorista,
      telefone: updated.telefone,
      valor: updated.valor,
      fornecedor: updated.fornecedor,
      custo: updated.custo,
      observacoes: updated.observacoes,
      receptivo: updated.receptivo || "",
      status_faturamento: updated.statusFaturamento,
      cor_manual: updated.corManual || null,
      km_in: updated.kmIn || 0,
      km_fim: updated.kmFim || 0,
      km_extra: updated.kmExtra || 0,
      valor_km_extra: updated.valorKmExtra || 0,
      valor_hora_extra: updated.valorHoraExtra || 0,
      valor_km_extra_fornecedor: updated.valorKmExtraFornecedor || 0,
      valor_hora_extra_fornecedor: updated.valorHoraExtraFornecedor || 0,
      estacionamento_fornecedor: updated.estacionamentoFornecedor || 0,
      hora_in: updated.horaIn || null,
      hora_fim: updated.horaFim || null,
      estacionamento: updated.estacionamento || 0,
      hora_extra: updated.horaExtra || "",
      outros_despesas: updated.outrosDespesas || [],
      forma_contratacao: updated.formaContratacao || "",
      placa_receptivo_url: updated.placaReceptivoUrl || null,
      placa_receptivo_urls: updated.placaReceptivoUrls || [],
      km_in_fornecedor: updated.kmInFornecedor || 0,
      km_fim_fornecedor: updated.kmFimFornecedor || 0,
      km_extra_fornecedor: updated.kmExtraFornecedor || 0,
      hora_in_fornecedor: updated.horaInFornecedor || null,
      hora_fim_fornecedor: updated.horaFimFornecedor || null,
      hora_extra_fornecedor: updated.horaExtraFornecedor || "",
    } as any)
    .eq("id", updated.id);
  
  if (error) throw error;
};

export const deleteAgendaItem = async (id: string) => {
  const { error } = await supabase
    .from("agenda_items")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
};
