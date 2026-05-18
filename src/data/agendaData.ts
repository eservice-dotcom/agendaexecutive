export type StatusFaturamento = "" | "enviado" | "faturado";

export interface Passageiro {
  nome: string;
  voo: string;
  telefone?: string;
}

export interface OutraDespesa {
  descricao: string;
  valor: number;
}

export interface AgendaItem {
  id: string;
  data: string;
  hora: string;
  cliente: string;
  pax: number;
  passageiros: Passageiro[];
  cot: string;
  tipo: string;
  origem: string;
  destino: string;
  placa: string;
  veiculo: string;
  motorista: string;
  telefone: string;
  valor: number;
  fornecedor: string;
  custo: number;
  observacoes: string;
  receptivo: string;
  statusFaturamento: StatusFaturamento;
  corManual?: string;
  kmIn?: number;
  kmFim?: number;
  kmExtra?: number;
  valorKmExtra?: number;
  horaIn?: string;
  horaFim?: string;
  estacionamento?: number;
  horaExtra?: string;
  outrosDespesas?: OutraDespesa[];
  formaContratacao?: string;
  placaReceptivoUrl?: string;
}

export const tiposServicoDefault = ["Transfer In", "Transfer Out", "City Tour", "Translado", "Fretamento", "Coordenação", "Diária de 5h", "Diária de 10h", "Viagem", "Comissaria"];
export const tiposServico = tiposServicoDefault;
export const fornecedores = ["TransLog", "VipTur", "RoadMaster", "FlexRide", "AutoElite"];

export const statusFaturamentoOptions: { value: StatusFaturamento; label: string }[] = [
  { value: "", label: "Vazio" },
  { value: "enviado", label: "Enviado" },
  { value: "faturado", label: "Faturado" },
];

// Dados de exemplo removidos - agora o sistema usa apenas dados reais do banco
export const mockData: AgendaItem[] = [];
