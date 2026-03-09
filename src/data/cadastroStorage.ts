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

function getItems<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setItems<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

function generateId() {
  return crypto.randomUUID();
}

// Clientes
export const getClientes = () => getItems<Cliente>("cadastro_clientes");
export const saveCliente = (item: Omit<Cliente, "id">) => {
  const items = getClientes();
  items.push({ ...item, id: generateId() });
  setItems("cadastro_clientes", items);
};
export const deleteCliente = (id: string) => {
  setItems("cadastro_clientes", getClientes().filter((i) => i.id !== id));
};

// Veículos
export const getVeiculos = () => getItems<Veiculo>("cadastro_veiculos");
export const saveVeiculo = (item: Omit<Veiculo, "id">) => {
  const items = getVeiculos();
  items.push({ ...item, id: generateId() });
  setItems("cadastro_veiculos", items);
};
export const deleteVeiculo = (id: string) => {
  setItems("cadastro_veiculos", getVeiculos().filter((i) => i.id !== id));
};

// Motoristas
export const getMotoristas = () => getItems<Motorista>("cadastro_motoristas");
export const saveMotorista = (item: Omit<Motorista, "id">) => {
  const items = getMotoristas();
  items.push({ ...item, id: generateId() });
  setItems("cadastro_motoristas", items);
};
export const deleteMotorista = (id: string) => {
  setItems("cadastro_motoristas", getMotoristas().filter((i) => i.id !== id));
};

// Fornecedores
export const getFornecedores = () => getItems<Fornecedor>("cadastro_fornecedores");
export const saveFornecedor = (item: Omit<Fornecedor, "id">) => {
  const items = getFornecedores();
  items.push({ ...item, id: generateId() });
  setItems("cadastro_fornecedores", items);
};
export const deleteFornecedor = (id: string) => {
  setItems("cadastro_fornecedores", getFornecedores().filter((i) => i.id !== id));
};

// Tipos de Serviço
import { AgendaItem, mockData, tiposServicoDefault } from "@/data/agendaData";

export const getTiposServico = (): string[] => {
  const data = localStorage.getItem("cadastro_tipos_servico");
  return data ? JSON.parse(data) : tiposServicoDefault;
};

export const saveTipoServico = (tipo: string) => {
  const items = getTiposServico();
  items.push(tipo);
  setItems("cadastro_tipos_servico", items);
};

export const deleteTipoServico = (tipo: string) => {
  setItems("cadastro_tipos_servico", getTiposServico().filter((t) => t !== tipo));
};

// Agenda

const coerceString = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

const normalizePassageiros = (raw: unknown): { nome: string; voo: string }[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((p: any) => ({ nome: coerceString(p?.nome), voo: coerceString(p?.voo) }))
    .filter((p) => p.nome !== "" || p.voo !== "");
};

const normalizeAgendaItem = (raw: any): AgendaItem => {
  const passageirosFromArray = normalizePassageiros(raw?.passageiros);
  const legacyNome = coerceString(raw?.nomePassageiro ?? raw?.passageiro ?? "");
  const legacyVoo = coerceString(raw?.numeroVoo ?? raw?.voo ?? "");

  const passageiros =
    passageirosFromArray.length > 0
      ? passageirosFromArray
      : legacyNome || legacyVoo
        ? [{ nome: legacyNome, voo: legacyVoo }]
        : [];

  return {
    ...raw,
    passageiros,
    statusFaturamento: coerceString(raw?.statusFaturamento) as any,
  } as AgendaItem;
};

export const getAgendaItems = (): AgendaItem[] => {
  const data = localStorage.getItem("agenda_items");
  const parsed = data ? (JSON.parse(data) as any[]) : null;
  if (!Array.isArray(parsed)) return mockData;

  const normalized = parsed.map(normalizeAgendaItem);

  // Migração automática de dados antigos para não quebrar após updates
  const needsWriteBack = parsed.some((r: any) => !Array.isArray(r?.passageiros) || r?.nomePassageiro != null || r?.numeroVoo != null);
  if (needsWriteBack) setItems("agenda_items", normalized);

  return normalized;
};

export const saveAgendaItem = (item: Omit<AgendaItem, "id">) => {
  const items = getAgendaItems();
  items.push({ ...item, id: generateId() });
  setItems("agenda_items", items);
};

export const updateAgendaItem = (updated: AgendaItem) => {
  const items = getAgendaItems().map((i) => (i.id === updated.id ? updated : i));
  setItems("agenda_items", items);
};

export const deleteAgendaItem = (id: string) => {
  setItems("agenda_items", getAgendaItems().filter((i) => i.id !== id));
};
