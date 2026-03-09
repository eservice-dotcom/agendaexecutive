import { supabase } from "@/integrations/supabase/client";
import { AgendaItem, mockData, tiposServicoDefault } from "@/data/agendaData";

export interface Cliente {
  id: string;
  nome: string;
  cnpjCpf: string;
  email: string;
  telefone: string;
  endereco: string;
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
  });
  
  if (error) throw error;
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
  });
  
  if (error) throw error;
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
    return tiposServicoDefault;
  }
  
  if (!data || data.length === 0) {
    return tiposServicoDefault;
  }
  
  return data.map((item) => item.tipo);
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
  const { data, error } = await supabase
    .from("agenda_items")
    .select("*")
    .order("data", { ascending: false })
    .order("hora", { ascending: false });
  
  if (error) {
    console.error("Erro ao buscar itens da agenda:", error);
    return mockData;
  }
  
  if (!data || data.length === 0) {
    return mockData;
  }
  
  return data.map((item) => ({
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
    statusFaturamento: (item.status_faturamento || "") as any,
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
    passageiros: item.passageiros,
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
    status_faturamento: item.statusFaturamento,
  });
  
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
      passageiros: updated.passageiros,
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
      status_faturamento: updated.statusFaturamento,
    })
    .eq("id", updated.id);
  
  if (error) throw error;
};

export const deleteAgendaItem = async (id: string) => {
  const { error } = await supabase.from("agenda_items").delete().eq("id", id);
  if (error) throw error;
};
