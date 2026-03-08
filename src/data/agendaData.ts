export interface AgendaItem {
  id: string;
  data: string;
  hora: string;
  cliente: string;
  pax: number;
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
}

export const tiposServico = ["Transfer In", "Transfer Out", "City Tour", "Translado", "Fretamento"];
export const fornecedores = ["TransLog", "VipTur", "RoadMaster", "FlexRide", "AutoElite"];

export const mockData: AgendaItem[] = [
  {
    id: "1",
    data: "2026-03-08",
    hora: "08:00",
    cliente: "Hotel Fasano",
    pax: 4,
    cot: "COT-001",
    tipo: "Transfer In",
    origem: "Aeroporto GRU",
    destino: "Hotel Fasano - Ipanema",
    placa: "ABC-1234",
    veiculo: "Van Sprinter",
    motorista: "Carlos Silva",
    telefone: "(11) 99876-5432",
    valor: 350,
    fornecedor: "TransLog",
    custo: 220,
  },
  {
    id: "2",
    data: "2026-03-08",
    hora: "10:30",
    cliente: "Copacabana Palace",
    pax: 2,
    cot: "COT-002",
    tipo: "City Tour",
    origem: "Copacabana Palace",
    destino: "Cristo Redentor",
    placa: "DEF-5678",
    veiculo: "Sedan Executivo",
    motorista: "Roberto Almeida",
    telefone: "(21) 98765-4321",
    valor: 480,
    fornecedor: "VipTur",
    custo: 300,
  },
  {
    id: "3",
    data: "2026-03-09",
    hora: "06:00",
    cliente: "Embratur",
    pax: 8,
    cot: "COT-003",
    tipo: "Fretamento",
    origem: "Centro de Convenções",
    destino: "Aeroporto Santos Dumont",
    placa: "GHI-9012",
    veiculo: "Micro-ônibus",
    motorista: "Ana Beatriz",
    telefone: "(21) 97654-3210",
    valor: 900,
    fornecedor: "RoadMaster",
    custo: 600,
  },
  {
    id: "4",
    data: "2026-03-09",
    hora: "14:00",
    cliente: "Magazine Luiza",
    pax: 1,
    cot: "COT-004",
    tipo: "Transfer Out",
    origem: "Hilton Barra",
    destino: "Aeroporto GIG",
    placa: "JKL-3456",
    veiculo: "Sedan Executivo",
    motorista: "Pedro Santos",
    telefone: "(11) 96543-2109",
    valor: 280,
    fornecedor: "FlexRide",
    custo: 180,
  },
  {
    id: "5",
    data: "2026-03-10",
    hora: "09:00",
    cliente: "Natura",
    pax: 6,
    cot: "COT-005",
    tipo: "Translado",
    origem: "Hotel Windsor",
    destino: "Riocentro",
    placa: "MNO-7890",
    veiculo: "Van Sprinter",
    motorista: "Fernanda Costa",
    telefone: "(21) 95432-1098",
    valor: 520,
    fornecedor: "AutoElite",
    custo: 350,
  },
  {
    id: "6",
    data: "2026-03-10",
    hora: "16:00",
    cliente: "Itaú Unibanco",
    pax: 3,
    cot: "COT-006",
    tipo: "Transfer In",
    origem: "Aeroporto GIG",
    destino: "JW Marriott",
    placa: "PQR-1234",
    veiculo: "SUV Blindado",
    motorista: "Carlos Silva",
    telefone: "(11) 99876-5432",
    valor: 650,
    fornecedor: "TransLog",
    custo: 420,
  },
  {
    id: "7",
    data: "2026-03-11",
    hora: "07:30",
    cliente: "Petrobras",
    pax: 12,
    cot: "COT-007",
    tipo: "Fretamento",
    origem: "EDSERJ",
    destino: "Macaé",
    placa: "STU-5678",
    veiculo: "Ônibus Executivo",
    motorista: "Marcos Oliveira",
    telefone: "(22) 94321-0987",
    valor: 2200,
    fornecedor: "RoadMaster",
    custo: 1500,
  },
  {
    id: "8",
    data: "2026-03-11",
    hora: "11:00",
    cliente: "Ambev",
    pax: 2,
    cot: "COT-008",
    tipo: "City Tour",
    origem: "Sheraton Grand",
    destino: "Pão de Açúcar",
    placa: "VWX-9012",
    veiculo: "Sedan Executivo",
    motorista: "Roberto Almeida",
    telefone: "(21) 98765-4321",
    valor: 380,
    fornecedor: "VipTur",
    custo: 240,
  },
];
