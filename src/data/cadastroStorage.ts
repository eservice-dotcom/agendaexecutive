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

// Agenda
import { AgendaItem, mockData } from "@/data/agendaData";

export const getAgendaItems = (): AgendaItem[] => {
  const data = localStorage.getItem("agenda_items");
  return data ? JSON.parse(data) : mockData;
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
