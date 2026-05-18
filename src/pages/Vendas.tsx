import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ShoppingCart, Search, Check, FileText, XCircle, DollarSign, CheckCircle, Download, Pencil, ClipboardList, X, Printer, MessageCircle, FileSpreadsheet, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo-executive-service.png";
import { generateClosingReport } from "@/lib/closingReport";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";
import { printContasPagar, printContasReceber } from "@/lib/printUtils";
import DashboardFinanceiro from "@/components/DashboardFinanceiro";
import RelatorioContasConsolidado from "@/components/RelatorioContasConsolidado";
import WhatsAppPagamentoDialog from "@/components/WhatsAppPagamentoDialog";

interface Venda {
  id: string;
  numero_venda: number;
  cliente: string;
  data_venda: string;
  data_vencimento: string | null;
  valor_total: number;
  status: string;
  observacoes: string;
  forma_pagamento: string;
  created_at: string;
}

interface AgendaItem {
  id: string;
  cliente: string;
  data: string;
  hora: string;
  tipo: string;
  origem: string;
  destino: string;
  valor: number;
  custo: number;
  motorista: string;
  veiculo: string;
  pax: number;
  cot: string;
  fornecedor: string;
  status_faturamento: string | null;
  placa?: string;
  estacionamento?: number;
  outros?: number;
  outros_despesas?: any;
}

interface ExtraItem {
  descricao: string;
  valor: number;
}

interface ContaPagar {
  fornecedor: string;
  descritivo: string;
  valor: number;
  data: string;
  data_vencimento: string;
}

interface ContaPagarDB {
  id: string;
  venda_id: string;
  fornecedor: string;
  descritivo: string;
  valor: number;
  valor_pago: number;
  data: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  centro_custo: string;
  subgrupo_custo: string;
  placa: string;
}

interface ContaReceberDB {
  id: string;
  venda_id: string;
  cliente: string;
  descritivo: string;
  valor: number;
  valor_pago: number;
  data: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  centro_receita: string;
  subgrupo_receita: string;
}

interface SubgrupoCusto {
  id: string;
  nome: string;
  centro_custo_id: string;
}

interface SubgrupoReceita {
  id: string;
  nome: string;
  centro_receita_id: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const parseMoneyValue = (value: string | number | null | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;

  if (hasComma && hasDot) {
    normalized = raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const horaExtraToHours = (he?: string | null) => {
  if (!he || typeof he !== "string") return 0;
  const parts = he.split(":").map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h + m / 60;
};

const buildAgendaExtrasFromItems = (items: any[]) => {
  return items.flatMap((item: any) => {
    const osLabel = item?.cot ? `O.S. ${item.cot}` : "Serviço";
    const rawDespesas = item?.outros_despesas;
    let despesas: any[] = [];

    if (Array.isArray(rawDespesas)) {
      despesas = rawDespesas;
    } else if (typeof rawDespesas === "string" && rawDespesas.trim()) {
      try {
        const parsed = JSON.parse(rawDespesas);
        despesas = Array.isArray(parsed) ? parsed : [];
      } catch {
        despesas = [];
      }
    }

    const despesasExtras = despesas
      .map((d: any) => ({
        descricao: (d?.descricao || "").trim() || `Outros ${osLabel}`,
        valor: parseMoneyValue(d?.valor),
      }))
      .filter((d) => d.valor > 0);

    const outrosValor = parseMoneyValue(item?.outros);
    const outrosExtra = outrosValor > 0 ? [{ descricao: `Outros ${osLabel}`, valor: outrosValor }] : [];

    // Include estacionamento as an automatic extra
    const estacValor = parseMoneyValue(item?.estacionamento);
    const estacExtra = estacValor > 0 ? [{ descricao: `Estacionamento ${osLabel}`, valor: estacValor }] : [];

    // Km Extra (cliente) - discriminado
    const kmExtraQtd = Number(item?.km_extra) || 0;
    const valorKmExtra = Number(item?.valor_km_extra) || 0;
    const kmExtraTotal = kmExtraQtd * valorKmExtra;
    const kmExtraExtra = kmExtraTotal > 0
      ? [{ descricao: `Km Extra ${osLabel} (${kmExtraQtd} km x R$ ${valorKmExtra.toFixed(2)})`, valor: kmExtraTotal }]
      : [];

    // Hora Extra (cliente) - discriminado
    const horasExtra = horaExtraToHours(item?.hora_extra);
    const valorHoraExtra = Number(item?.valor_hora_extra) || 0;
    const horaExtraTotal = horasExtra * valorHoraExtra;
    const horaExtraExtra = horaExtraTotal > 0
      ? [{ descricao: `Hora Extra ${osLabel} (${item?.hora_extra} x R$ ${valorHoraExtra.toFixed(2)})`, valor: horaExtraTotal }]
      : [];

    return [...estacExtra, ...kmExtraExtra, ...horaExtraExtra, ...despesasExtras, ...outrosExtra];
  });
};

const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência Bancária", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Cheque"];

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatOsDescricao = (item: Pick<AgendaItem, "cot" | "tipo" | "origem" | "destino" | "motorista" | "data"> & { custo?: number | string }) =>
  `O.S.${item.cot} - ${item.tipo || ""} - ${item.origem || ""} → ${item.destino || ""} - ${item.motorista || ""} (${formatDate(item.data)}) - ${formatCurrency(Number(item.custo) || 0)}`;

const normalizeDescricaoForDisplay = (value?: string | null) => {
  if (!value) return "—";
  return value.replace(/\s*\|\s*/g, "\n");
};

const Vendas = () => {
  const { session, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab && ["vendas", "receber", "pagar", "dashboard"].includes(tab) ? tab : "vendas";
  });
  const [zoomPagar, setZoomPagar] = useState(1);
  const zoomPagarNodeRef = useRef<HTMLDivElement | null>(null);
  const zoomPagarHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const zoomPagarCallbackRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup old
    if (zoomPagarNodeRef.current && zoomPagarHandlerRef.current) {
      zoomPagarNodeRef.current.removeEventListener('wheel', zoomPagarHandlerRef.current);
    }
    zoomPagarNodeRef.current = node;
    if (node) {
      const handler = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          setZoomPagar((prev) => {
            const next = prev + (e.deltaY < 0 ? 0.05 : -0.05);
            return Math.min(Math.max(next, 0.4), 1.5);
          });
        }
      };
      zoomPagarHandlerRef.current = handler;
      node.addEventListener('wheel', handler, { passive: false });
    }
  }, []);

  // Form state
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState("");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [searchAgenda, setSearchAgenda] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [fornecedoresPixMap, setFornecedoresPixMap] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<ExtraItem[]>([]);

  // Contas lists
  const [contasPagarList, setContasPagarList] = useState<ContaPagarDB[]>([]);
  const [contasReceberList, setContasReceberList] = useState<ContaReceberDB[]>([]);

  // Mapa venda_id -> { numero_venda, cliente, cots, cotsByFornecedor }
  const [vendaOsMap, setVendaOsMap] = useState<Record<string, { numero_venda: number; cliente: string; cots: string[]; cotsByFornecedor: Record<string, string[]> }>>({});

  // Edit conta dialog
  const [editDialog, setEditDialog] = useState<{ type: "pagar" | "receber"; item: any } | null>(null);
  const [editForm, setEditForm] = useState({ descritivo: "", valor: "", data: "", data_vencimento: "", data_pagamento: "", centro: "", subgrupo: "", cliente: "", fornecedor: "", placa: "" });

  // Baixa parcial dialog
  const [baixaDialog, setBaixaDialog] = useState<{ type: "pagar" | "receber"; item: any } | null>(null);
  const [baixaValor, setBaixaValor] = useState("");

  // New manual conta dialogs
  const [novaContaDialog, setNovaContaDialog] = useState<"pagar" | "receber" | null>(null);
  const [novaContaForm, setNovaContaForm] = useState({
    descritivo: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    data_pagamento: "",
    fornecedor: "",
    cliente: "",
    centro_custo: "",
    centro_receita: "",
    subgrupo_custo: "",
    subgrupo_receita: "",
    placa: "",
    parcelado: false,
    num_parcelas: "2",
  });
  const [quickAddFornecedor, setQuickAddFornecedor] = useState(false);
  const [quickAddFornecedorNome, setQuickAddFornecedorNome] = useState("");
  const [quickAddCliente, setQuickAddCliente] = useState(false);
  const [quickAddClienteNome, setQuickAddClienteNome] = useState("");
  const [quickAddCentroCusto, setQuickAddCentroCusto] = useState(false);
  const [quickAddCentroCustoNome, setQuickAddCentroCustoNome] = useState("");
  const [quickAddSubgrupoCusto, setQuickAddSubgrupoCusto] = useState(false);
  const [quickAddSubgrupoCustoNome, setQuickAddSubgrupoCustoNome] = useState("");

  // Centros de custo/receita and subgrupos
  const [centrosCusto, setCentrosCusto] = useState<{ id: string; nome: string }[]>([]);
  const [centrosReceita, setCentrosReceita] = useState<{ id: string; nome: string }[]>([]);
  const [subgruposCusto, setSubgruposCusto] = useState<SubgrupoCusto[]>([]);
  const [subgruposReceita, setSubgruposReceita] = useState<SubgrupoReceita[]>([]);
  const [veiculosList, setVeiculosList] = useState<{ placa: string; modelo: string }[]>([]);

  // Edit venda dialog
  const [editVendaDialog, setEditVendaDialog] = useState<Venda | null>(null);
  const [editVendaForm, setEditVendaForm] = useState({ cliente: "", data_venda: "", data_vencimento: "", observacoes: "", status: "", forma_pagamento: "" });
  const [editVendaItems, setEditVendaItems] = useState<AgendaItem[]>([]);
  const [editVendaSelectedIds, setEditVendaSelectedIds] = useState<Set<string>>(new Set());
  const [editVendaAvailableItems, setEditVendaAvailableItems] = useState<AgendaItem[]>([]);
  const [editVendaSearch, setEditVendaSearch] = useState("");
  const [editVendaExtras, setEditVendaExtras] = useState<ExtraItem[]>([]);

  // Filtro contas a pagar por OS, fornecedor e centro de custo
  const [filtroOsPagar, setFiltroOsPagar] = useState("");
  const [filtroFornecedorPagar, setFiltroFornecedorPagar] = useState("");
  const [filtroStatusPagar, setFiltroStatusPagar] = useState("");
  const [filtroCentroCustoPagar, setFiltroCentroCustoPagar] = useState("");
  const [filtroVencimentoInicioPagar, setFiltroVencimentoInicioPagar] = useState("");
  const [filtroVencimentoFimPagar, setFiltroVencimentoFimPagar] = useState("");

  // Filtro contas a receber por OS e cliente
  const [filtroOsReceber, setFiltroOsReceber] = useState("");
  const [filtroClienteReceber, setFiltroClienteReceber] = useState("");
  const [filtroStatusReceber, setFiltroStatusReceber] = useState("");
  const [filtroVencimentoInicioReceber, setFiltroVencimentoInicioReceber] = useState("");
  const [filtroVencimentoFimReceber, setFiltroVencimentoFimReceber] = useState("");

  // Filtro aba Vendas
  const [filtroClienteVendas, setFiltroClienteVendas] = useState("");
  const [filtroOsVendas, setFiltroOsVendas] = useState("");
  const [filtroStatusVendas, setFiltroStatusVendas] = useState("");
  const [filtroDataInicioVendas, setFiltroDataInicioVendas] = useState("");
  const [filtroDataFimVendas, setFiltroDataFimVendas] = useState("");

  // WhatsApp pagamento
  const [whatsappPagamento, setWhatsappPagamento] = useState<{ conta: any; contas?: any[]; vendaInfo: any } | null>(null);
  const [selectedContasPagar, setSelectedContasPagar] = useState<Set<string>>(new Set());

  // Closing report selection
  const [fechamentoDialogOpen, setFechamentoDialogOpen] = useState(false);
  const [fechamentoCliente, setFechamentoCliente] = useState("");
  const [fechamentoAllClientes, setFechamentoAllClientes] = useState<string[]>([]);
  const [fechamentoItems, setFechamentoItems] = useState<any[]>([]);
  const [fechamentoSelected, setFechamentoSelected] = useState<Set<number>>(new Set());
  const [fechamentoExtras, setFechamentoExtras] = useState<{ descricao: string; valor: number }[]>([]);
  const [fechamentoExtrasSelected, setFechamentoExtrasSelected] = useState<Set<number>>(new Set());
  const [fechamentoNovoExtra, setFechamentoNovoExtra] = useState({ descricao: "", valor: "" });
  const [fechamentoSearch, setFechamentoSearch] = useState("");
  const [fechamentoDataInicio, setFechamentoDataInicio] = useState("");
  const [fechamentoDataFim, setFechamentoDataFim] = useState("");
  const [fechamentoReceptivo, setFechamentoReceptivo] = useState("");

  const loadVendas = useCallback(async () => {
    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setVendas(data as Venda[]);
  }, []);

  const loadClientes = useCallback(async () => {
    const [agendaRes, clientesRes] = await Promise.all([
      supabase.from("agenda_items").select("cliente").order("cliente"),
      supabase.from("clientes").select("nome").order("nome"),
    ]);
    const fromAgenda = (agendaRes.data || []).map((d) => d.cliente);
    const fromCadastro = (clientesRes.data || []).map((d) => d.nome);
    const unique = [...new Set([...fromAgenda, ...fromCadastro])].filter(Boolean).sort();
    setClientes(unique);
  }, []);

  const loadFornecedores = useCallback(async () => {
    const { data } = await supabase
      .from("fornecedores")
      .select("razao_social, pix")
      .order("razao_social");
    if (data) {
      setFornecedores(data.map((f) => f.razao_social).filter(Boolean));
      const pixMap: Record<string, string> = {};
      data.forEach((f) => { if (f.razao_social && f.pix) pixMap[f.razao_social] = f.pix; });
      setFornecedoresPixMap(pixMap);
    }
  }, []);

  const loadCentrosCusto = useCallback(async () => {
    const { data } = await supabase.from("centros_custo").select("id, nome").order("nome");
    if (data) setCentrosCusto(data);
  }, []);

  const loadCentrosReceita = useCallback(async () => {
    const { data } = await supabase.from("centros_receita").select("id, nome").order("nome");
    if (data) setCentrosReceita(data);
  }, []);

  const loadSubgruposCusto = useCallback(async () => {
    const { data } = await supabase.from("subgrupos_custo").select("id, nome, centro_custo_id").order("nome");
    if (data) setSubgruposCusto(data);
  }, []);

  const loadSubgruposReceita = useCallback(async () => {
    const { data } = await supabase.from("subgrupos_receita").select("id, nome, centro_receita_id").order("nome");
    if (data) setSubgruposReceita(data);
  }, []);

  const loadVeiculos = useCallback(async () => {
    const { data } = await supabase.from("veiculos").select("placa, modelo").order("placa");
    if (data) setVeiculosList(data);
  }, []);

  const loadContasPagar = useCallback(async () => {
    const { data } = await supabase
      .from("contas_pagar")
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (data) setContasPagarList(data as ContaPagarDB[]);
  }, []);

  const loadContasReceber = useCallback(async () => {
    const { data } = await supabase
      .from("contas_receber")
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (data) setContasReceberList(data as ContaReceberDB[]);
  }, []);

  const loadVendaOsMap = useCallback(async () => {
    const pageSize = 1000;

    const vendasData: Array<{ id: string; numero_venda: number; cliente: string }> = [];
    let vendasFrom = 0;
    while (true) {
      const { data } = await supabase
        .from("vendas")
        .select("id, numero_venda, cliente")
        .range(vendasFrom, vendasFrom + pageSize - 1);

      if (!data || data.length === 0) break;
      vendasData.push(...data);
      if (data.length < pageSize) break;
      vendasFrom += pageSize;
    }

    const vendaItemsData: Array<{ venda_id: string; agenda_item_id: string }> = [];
    let vendaItemsFrom = 0;
    while (true) {
      const { data } = await supabase
        .from("venda_items")
        .select("venda_id, agenda_item_id")
        .range(vendaItemsFrom, vendaItemsFrom + pageSize - 1);

      if (!data || data.length === 0) break;
      vendaItemsData.push(...data);
      if (data.length < pageSize) break;
      vendaItemsFrom += pageSize;
    }

    const agendaIds = Array.from(new Set(vendaItemsData.map((vi) => vi.agenda_item_id)));
    const agendaInfo: Record<string, { cot: string; fornecedor: string }> = {};

    if (agendaIds.length > 0) {
      const chunkSize = 500;
      const chunks: string[][] = [];

      for (let i = 0; i < agendaIds.length; i += chunkSize) {
        chunks.push(agendaIds.slice(i, i + chunkSize));
      }

      const responses = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from("agenda_items")
            .select("id, cot, fornecedor")
            .in("id", chunk)
        )
      );

      responses.forEach(({ data }) => {
        (data || []).forEach((a: any) => {
          agendaInfo[a.id] = { cot: a.cot, fornecedor: a.fornecedor || "" };
        });
      });
    }

    const map: Record<string, { numero_venda: number; cliente: string; cots: string[]; cotsByFornecedor: Record<string, string[]> }> = {};
    const cotSetByVenda = new Map<string, Set<string>>();
    const cotSetByVendaForn = new Map<string, Map<string, Set<string>>>();

    vendasData.forEach((v) => {
      map[v.id] = { numero_venda: v.numero_venda, cliente: v.cliente, cots: [], cotsByFornecedor: {} };
      cotSetByVenda.set(v.id, new Set());
      cotSetByVendaForn.set(v.id, new Map());
    });

    vendaItemsData.forEach((vi) => {
      const info = agendaInfo[vi.agenda_item_id];
      if (!map[vi.venda_id] || !info?.cot) return;
      cotSetByVenda.get(vi.venda_id)?.add(info.cot);
      const fornKey = (info.fornecedor || "").trim().toLowerCase();
      const fornMap = cotSetByVendaForn.get(vi.venda_id)!;
      if (!fornMap.has(fornKey)) fornMap.set(fornKey, new Set());
      fornMap.get(fornKey)!.add(info.cot);
    });

    Object.keys(map).forEach((vendaId) => {
      map[vendaId].cots = Array.from(cotSetByVenda.get(vendaId) || []);
      const fornMap = cotSetByVendaForn.get(vendaId) || new Map();
      const obj: Record<string, string[]> = {};
      fornMap.forEach((set, key) => { obj[key] = Array.from(set); });
      map[vendaId].cotsByFornecedor = obj;
    });

    setVendaOsMap(map);
  }, []);

  useEffect(() => {
    loadVendas();
    loadClientes();
    loadFornecedores();
    loadContasPagar();
    loadContasReceber();
    loadVendaOsMap();
    loadCentrosCusto();
    loadCentrosReceita();
    loadSubgruposCusto();
    loadSubgruposReceita();
    loadVeiculos();
  }, [loadVendas, loadClientes, loadFornecedores, loadContasPagar, loadContasReceber, loadVendaOsMap, loadCentrosCusto, loadCentrosReceita, loadSubgruposCusto, loadSubgruposReceita, loadVeiculos]);


  useEffect(() => {
    if (!cliente) {
      setAgendaItems([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("agenda_items")
        .select("id, cliente, data, hora, tipo, origem, destino, valor, custo, motorista, veiculo, placa, pax, cot, fornecedor, status_faturamento, estacionamento, outros, outros_despesas, km_extra, valor_km_extra, hora_extra, valor_hora_extra, valor_km_extra_fornecedor, valor_hora_extra_fornecedor, estacionamento_fornecedor")
        .eq("cliente", cliente)
        .eq("status_faturamento", "enviado")
        .is("deleted_at", null)
        .order("data", { ascending: true });
      if (data) setAgendaItems(data as AgendaItem[]);
    };
    load();
  }, [cliente]);

  const filteredAgendaItems = useMemo(() => {
    let items = agendaItems;
    if (periodoInicio) {
      items = items.filter((i) => i.data >= periodoInicio);
    }
    if (periodoFim) {
      items = items.filter((i) => i.data <= periodoFim);
    }
    if (!searchAgenda) return items;
    const s = searchAgenda.toLowerCase();
    return items.filter(
      (i) =>
        i.cot.toLowerCase().includes(s) ||
        i.origem.toLowerCase().includes(s) ||
        i.destino.toLowerCase().includes(s) ||
        i.motorista.toLowerCase().includes(s) ||
        i.data.includes(s)
    );
  }, [agendaItems, searchAgenda, periodoInicio, periodoFim]);

  const extrasTotal = useMemo(() => extras.reduce((s, e) => s + e.valor, 0), [extras]);

  const totalSelectedCalc = useMemo(() => {
    const servicos = agendaItems
      .filter((i) => selectedItems.has(i.id))
      .reduce((sum, i) => sum + i.valor, 0);
    return servicos + extrasTotal;
  }, [agendaItems, selectedItems, extrasTotal]);

  const [totalSelectedManual, setTotalSelectedManual] = useState<number | null>(null);
  const totalSelected = totalSelectedManual !== null ? totalSelectedManual : totalSelectedCalc;

  // Auto-populate extras from selected agenda items (estacionamento + outros_despesas)
  useEffect(() => {
    const selected = agendaItems.filter((i) => selectedItems.has(i.id));
    const autoExtras = buildAgendaExtrasFromItems(selected);
    setExtras(autoExtras);
  }, [agendaItems, selectedItems]);

  // Reset manual override when selection or extras change
  useEffect(() => {
    setTotalSelectedManual(null);
  }, [totalSelectedCalc]);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === filteredAgendaItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAgendaItems.map((i) => i.id)));
    }
  };

  const handleSave = async () => {
    if (!cliente || selectedItems.size === 0) {
      toast({ title: "Selecione um cliente e pelo menos um serviço", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          user_id: session!.user.id,
          cliente,
          data_venda: dataVenda,
          data_vencimento: dataVencimento || null,
          valor_total: totalSelected,
          status: "faturado",
          observacoes,
          forma_pagamento: formaPagamento,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      const items = Array.from(selectedItems).map((agenda_item_id) => ({
        venda_id: venda.id,
        agenda_item_id,
        valor: agendaItems.find((i) => i.id === agenda_item_id)?.valor || 0,
      }));

      const { error: itemsError } = await supabase.from("venda_items").insert(items);
      if (itemsError) throw itemsError;

      const { error: statusError } = await supabase
        .from("agenda_items")
        .update({ status_faturamento: "faturado" })
        .in("id", Array.from(selectedItems));
      if (statusError) {
        console.error("Erro ao atualizar status de faturamento:", statusError);
      }

      // Auto-generate conta a receber (client owes)
      const { error: crError } = await supabase.from("contas_receber").insert({
        venda_id: venda.id,
        user_id: session!.user.id,
        cliente,
        descritivo: `Venda - ${items.length} serviço(s)`,
        valor: totalSelected,
        data: dataVenda,
        data_vencimento: dataVencimento || null,
        status: "pendente",
      });
      if (crError) throw crError;

      // Auto-generate contas a pagar grouped by fornecedor with detailed descritivo
      const selectedAgendaItems = agendaItems.filter((i) => selectedItems.has(i.id));
      const fornecedorMap = new Map<string, { total: number; items: typeof selectedAgendaItems; extrasLines: string[]; extrasTotal: number }>();
      selectedAgendaItems.forEach((item: any) => {
        if (item.fornecedor && Number(item.custo) > 0) {
          const existing = fornecedorMap.get(item.fornecedor) || { total: 0, items: [], extrasLines: [], extrasTotal: 0 };
          existing.total += Number(item.custo);
          existing.items.push(item);

          const osLabel = item?.cot ? `O.S. ${item.cot}` : "Serviço";
          const kmExtraQtd = Number(item?.km_extra) || 0;
          const valKmExtFor = Number(item?.valor_km_extra_fornecedor) || 0;
          const kmExtraTotalFor = kmExtraQtd * valKmExtFor;
          if (kmExtraTotalFor > 0) {
            existing.extrasLines.push(`Km Extra ${osLabel} (${kmExtraQtd} km x R$ ${valKmExtFor.toFixed(2)}) = R$ ${kmExtraTotalFor.toFixed(2)}`);
            existing.extrasTotal += kmExtraTotalFor;
          }
          const horas = horaExtraToHours(item?.hora_extra);
          const valHoraExtFor = Number(item?.valor_hora_extra_fornecedor) || 0;
          const horaExtraTotalFor = horas * valHoraExtFor;
          if (horaExtraTotalFor > 0) {
            existing.extrasLines.push(`Hora Extra ${osLabel} (${item?.hora_extra} x R$ ${valHoraExtFor.toFixed(2)}) = R$ ${horaExtraTotalFor.toFixed(2)}`);
            existing.extrasTotal += horaExtraTotalFor;
          }
          const estacFor = Number(item?.estacionamento_fornecedor) || 0;
          if (estacFor > 0) {
            existing.extrasLines.push(`Estacionamento ${osLabel} = R$ ${estacFor.toFixed(2)}`);
            existing.extrasTotal += estacFor;
          }

          fornecedorMap.set(item.fornecedor, existing);
        }
      });

      const autoContasPagar = Array.from(fornecedorMap.entries()).map(([fornecedor, info]) => {
        const descLines = info.items.map((item) => formatOsDescricao(item));
        const allLines = info.extrasLines.length > 0
          ? [...descLines, "--- Extras ---", ...info.extrasLines]
          : descLines;
        // Vencimento = data do serviço mais recente + 30 dias
        const datasServico = info.items.map((i) => i.data).filter(Boolean).sort();
        const dataBase = datasServico[datasServico.length - 1] || dataVenda;
        const vencFornecedor = new Date(`${dataBase}T00:00:00`);
        vencFornecedor.setDate(vencFornecedor.getDate() + 30);
        const vencFornecedorStr = vencFornecedor.toISOString().split("T")[0];
        const isMillena = /millena\s*marques/i.test(fornecedor);
        return {
          venda_id: venda.id,
          user_id: session!.user.id,
          fornecedor,
          descritivo: allLines.join("\n"),
          valor: info.total,
          data: dataVenda,
          data_vencimento: vencFornecedorStr,
          status: "pendente",
          centro_custo: "FORCECEDORES",
          subgrupo_custo: isMillena ? "RH" : "VEÍCULOS",
        };
      });

      // Also add manually entered contas a pagar
      const manualContas = contasPagar.map((cp) => {
        const isMillena = /millena\s*marques/i.test(cp.fornecedor || "");
        return {
          venda_id: venda.id,
          user_id: session!.user.id,
          fornecedor: cp.fornecedor,
          descritivo: cp.descritivo,
          valor: cp.valor,
          data: cp.data,
          data_vencimento: cp.data_vencimento || null,
          status: "pendente",
          centro_custo: "FORCECEDORES",
          subgrupo_custo: isMillena ? "RH" : "VEÍCULOS",
        };
      });

      const allContasPagar = [...autoContasPagar, ...manualContas];
      if (allContasPagar.length > 0) {
        const { error: cpError } = await supabase.from("contas_pagar").insert(allContasPagar);
        if (cpError) throw cpError;
      }

      // Save extras
      if (extras.length > 0) {
        const extrasToInsert = extras.filter(e => e.descricao && e.valor > 0).map(e => ({
          venda_id: venda.id,
          descricao: e.descricao,
          valor: e.valor,
        }));
        if (extrasToInsert.length > 0) {
          await supabase.from("venda_extras").insert(extrasToInsert);
        }
      }

      toast({ title: "Venda criada com sucesso! Contas geradas automaticamente." });
      setDialogOpen(false);
      resetForm();
      loadVendas();
      loadContasPagar();
      loadContasReceber();
      loadVendaOsMap();
    } catch (err: any) {
      toast({ title: "Erro ao salvar venda", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCliente("");
    setSelectedItems(new Set());
    setObservacoes("");
    setDataVenda(new Date().toISOString().split("T")[0]);
    setDataVencimento("");
    setSearchAgenda("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setContasPagar([]);
    setExtras([]);
    setFormaPagamento("");
    setTotalSelectedManual(null);
  };

  const addExtra = () => setExtras((prev) => [...prev, { descricao: "", valor: 0 }]);
  const updateExtra = (idx: number, field: keyof ExtraItem, value: string | number) =>
    setExtras((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  const removeExtra = (idx: number) => setExtras((prev) => prev.filter((_, i) => i !== idx));

  const addEditVendaExtra = () => setEditVendaExtras((prev) => [...prev, { descricao: "", valor: 0 }]);
  const updateEditVendaExtra = (idx: number, field: keyof ExtraItem, value: string | number) =>
    setEditVendaExtras((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  const removeEditVendaExtra = (idx: number) => setEditVendaExtras((prev) => prev.filter((_, i) => i !== idx));

  const addContaPagar = () => {
    setContasPagar((prev) => [
      ...prev,
      { fornecedor: "", descritivo: "", valor: 0, data: new Date().toISOString().split("T")[0], data_vencimento: "" },
    ]);
  };

  const updateContaPagar = (index: number, field: keyof ContaPagar, value: string | number) => {
    setContasPagar((prev) => prev.map((cp, i) => (i === index ? { ...cp, [field]: value } : cp)));
  };

  const removeContaPagar = (index: number) => {
    setContasPagar((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta venda? Os contas a pagar e a receber vinculados também serão excluídos.")) return;
    // Reverter status_faturamento dos serviços vinculados para "enviado"
    const { data: itemsToReset } = await supabase
      .from("venda_items")
      .select("agenda_item_id")
      .eq("venda_id", id);
    if (itemsToReset && itemsToReset.length > 0) {
      await supabase
        .from("agenda_items")
        .update({ status_faturamento: "enviado" })
        .in("id", itemsToReset.map((i) => i.agenda_item_id));
    }
    await supabase.from("contas_pagar").delete().eq("venda_id", id);
    await supabase.from("contas_receber").delete().eq("venda_id", id);
    await supabase.from("venda_items").delete().eq("venda_id", id);
    await supabase.from("venda_extras").delete().eq("venda_id", id);
    await supabase.from("vendas").delete().eq("id", id);
    loadVendas();
    loadContasPagar();
    loadContasReceber();
    loadVendaOsMap();
    toast({ title: "Venda excluída", description: "Contas vinculadas também foram removidas e serviços voltaram para 'enviado'." });
  };

  const handleCancelar = async (venda: Venda) => {
    if (!confirm("Cancelar esta venda? Os serviços vinculados voltarão para o status 'enviado'.")) return;
    try {
      const { data: items } = await supabase
        .from("venda_items")
        .select("agenda_item_id")
        .eq("venda_id", venda.id);

      if (items && items.length > 0) {
        await supabase
          .from("agenda_items")
          .update({ status_faturamento: "enviado" })
          .in("id", items.map((i) => i.agenda_item_id));
      }

      await supabase.from("vendas").update({ status: "cancelado" }).eq("id", venda.id);

      // Cancel related financial records
      await supabase.from("contas_pagar").update({ status: "cancelado" }).eq("venda_id", venda.id);
      await supabase.from("contas_receber").update({ status: "cancelado" }).eq("venda_id", venda.id);

      toast({ title: "Venda cancelada" });
      loadVendas();
      loadContasPagar();
      loadContasReceber();
      loadVendaOsMap();
    } catch (err: any) {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    }
  };

  const handleRegerarContasPagar = async (venda: Venda) => {
    if (!confirm("Regerar contas a pagar desta venda? As contas a pagar existentes (não pagas) serão excluídas e recriadas com base nos custos atuais da agenda.")) return;
    try {
      // Get venda items with agenda data
      const { data: vendaItems } = await supabase
        .from("venda_items")
        .select("agenda_item_id")
        .eq("venda_id", venda.id);

      if (!vendaItems || vendaItems.length === 0) {
        toast({ title: "Nenhum serviço vinculado a esta venda", variant: "destructive" });
        return;
      }

      // Fetch current agenda items with updated costs
      const agendaIds = vendaItems.map((vi) => vi.agenda_item_id);
      const { data: agendaItems } = await supabase
        .from("agenda_items")
        .select("*")
        .in("id", agendaIds);

      if (!agendaItems) {
        toast({ title: "Erro ao buscar serviços da agenda", variant: "destructive" });
        return;
      }

      // Delete existing non-paid contas_pagar for this venda
      await supabase
        .from("contas_pagar")
        .delete()
        .eq("venda_id", venda.id)
        .in("status", ["pendente", "cancelado"]);

      // Fetch already paid/partial contas to avoid duplicates
      const { data: existingPagas } = await supabase
        .from("contas_pagar")
        .select("fornecedor, valor, valor_pago, status")
        .eq("venda_id", venda.id)
        .in("status", ["pago", "parcial"]);

      // Sum already paid amounts per fornecedor
      const pagosPorFornecedor = new Map<string, number>();
      (existingPagas || []).forEach((c: any) => {
        const prev = pagosPorFornecedor.get(c.fornecedor) || 0;
        pagosPorFornecedor.set(c.fornecedor, prev + Number(c.valor));
      });

      // Group by fornecedor (same logic as original creation)
      const fornecedorMap = new Map<string, { total: number; items: any[]; extrasLines: string[]; extrasTotal: number }>();
      agendaItems.forEach((item: any) => {
        if (item.fornecedor && Number(item.custo) > 0) {
          const existing = fornecedorMap.get(item.fornecedor) || { total: 0, items: [], extrasLines: [], extrasTotal: 0 };
          existing.total += Number(item.custo);
          existing.items.push(item);

          const osLabel = item?.cot ? `O.S. ${item.cot}` : "Serviço";
          const kmExtraQtd = Number(item?.km_extra) || 0;
          const valKmExtFor = Number(item?.valor_km_extra_fornecedor) || 0;
          const kmExtraTotalFor = kmExtraQtd * valKmExtFor;
          if (kmExtraTotalFor > 0) {
            existing.extrasLines.push(`Km Extra ${osLabel} (${kmExtraQtd} km x R$ ${valKmExtFor.toFixed(2)}) = R$ ${kmExtraTotalFor.toFixed(2)}`);
            existing.extrasTotal += kmExtraTotalFor;
          }
          const horas = horaExtraToHours(item?.hora_extra);
          const valHoraExtFor = Number(item?.valor_hora_extra_fornecedor) || 0;
          const horaExtraTotalFor = horas * valHoraExtFor;
          if (horaExtraTotalFor > 0) {
            existing.extrasLines.push(`Hora Extra ${osLabel} (${item?.hora_extra} x R$ ${valHoraExtFor.toFixed(2)}) = R$ ${horaExtraTotalFor.toFixed(2)}`);
            existing.extrasTotal += horaExtraTotalFor;
          }
          const estacFor = Number(item?.estacionamento_fornecedor) || 0;
          if (estacFor > 0) {
            existing.extrasLines.push(`Estacionamento ${osLabel} = R$ ${estacFor.toFixed(2)}`);
            existing.extrasTotal += estacFor;
          }

          fornecedorMap.set(item.fornecedor, existing);
        }
      });

      if (fornecedorMap.size === 0) {
        toast({ title: "Nenhum serviço com custo > 0 encontrado", description: "Verifique os custos na agenda.", variant: "destructive" });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const novasContas = Array.from(fornecedorMap.entries())
        .map(([fornecedor, info]) => {
          const jaPago = pagosPorFornecedor.get(fornecedor) || 0;
          const totalComExtras = info.total;
          const valorRestante = Math.round((totalComExtras - jaPago) * 100) / 100;
          if (valorRestante <= 0) return null; // já totalmente pago
          const descLines = info.items.map((item: any) => formatOsDescricao(item));
          const allLines = info.extrasLines.length > 0
            ? [...descLines, "--- Extras ---", ...info.extrasLines]
            : descLines;
          // Vencimento = data do serviço mais recente + 30 dias
          const datasServico = info.items.map((i: any) => i.data).filter(Boolean).sort();
          const dataBase = datasServico[datasServico.length - 1] || venda.data_venda;
          const vencFornecedor = new Date(`${dataBase}T00:00:00`);
          vencFornecedor.setDate(vencFornecedor.getDate() + 30);
          const vencFornecedorStr = vencFornecedor.toISOString().split("T")[0];
          const isMillena = /millena\s*marques/i.test(fornecedor);
          return {
            venda_id: venda.id,
            user_id: user.id,
            fornecedor,
            descritivo: allLines.join("\n"),
            valor: valorRestante,
            data: venda.data_venda,
            data_vencimento: vencFornecedorStr,
            status: "pendente",
            centro_custo: "FORCECEDORES",
            subgrupo_custo: isMillena ? "RH" : "VEÍCULOS",
          };
        })
        .filter(Boolean);

      if (novasContas.length > 0) {
        const { error } = await supabase.from("contas_pagar").insert(novasContas);
        if (error) throw error;
      }

      toast({ title: "Contas a pagar regeradas com sucesso", description: `${novasContas.length} novo(s) registro(s) criado(s). ${pagosPorFornecedor.size > 0 ? `${pagosPorFornecedor.size} fornecedor(es) já pago(s) mantido(s).` : ""}` });
      loadContasPagar();
    } catch (err: any) {
      toast({ title: "Erro ao regerar contas a pagar", description: err.message, variant: "destructive" });
    }
  };

  const buildFaturaHTML = async (venda: Venda) => {
    const { data: vendaItems } = await supabase
      .from("venda_items")
      .select("*, agenda_items:agenda_item_id(cot, data, hora, tipo, origem, destino, pax, motorista, veiculo)")
      .eq("venda_id", venda.id);

    const items = vendaItems || [];
    const logoUrl = new URL(logo, window.location.origin).href;

    const { data: extrasData } = await supabase
      .from("venda_extras")
      .select("descricao, valor")
      .eq("venda_id", venda.id);
    const vendaExtras = extrasData || [];

    // Fetch full client data (case-insensitive match)
    let clienteData: any = null;
    const { data: clienteExact } = await supabase
      .from("clientes")
      .select("nome, cnpj_cpf, email, telefone, endereco, cep, cidade, uf")
      .ilike("nome", venda.cliente)
      .maybeSingle();

    if (clienteExact) {
      clienteData = clienteExact;
    } else {
      // Fallback: partial match
      const { data: clientePartial } = await supabase
        .from("clientes")
        .select("nome, cnpj_cpf, email, telefone, endereco, cep, cidade, uf")
        .ilike("nome", `%${venda.cliente}%`)
        .limit(1)
        .maybeSingle();
      clienteData = clientePartial;
    }

    const clienteNomeCompleto = (clienteData?.nome || venda.cliente || "").trim();

    const rows = items.map((item: any, idx: number) => {
      const ai = item.agenda_items;
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${ai?.cot || ""}</td>
        <td>${ai?.data ? formatDate(ai.data) : ""}</td>
        <td>${ai?.tipo || ""}</td>
        <td>${ai?.origem || ""} → ${ai?.destino || ""}</td>
        <td class="c">${ai?.pax || ""}</td>
        <td class="r">${formatCurrency(item.valor)}</td>
      </tr>`;
    }).join("");

    const extrasRows = vendaExtras.map((ex: any, idx: number) => `<tr>
      <td class="c">${items.length + idx + 1}</td>
      <td colspan="5"><em>Extra: ${ex.descricao}</em></td>
      <td class="r">${formatCurrency(Number(ex.valor))}</td>
    </tr>`).join("");

    // Calculate total dynamically from items + extras
    const totalCalculado = items.reduce((sum: number, item: any) => sum + Number(item.valor || 0), 0)
      + vendaExtras.reduce((sum: number, ex: any) => sum + Number(ex.valor || 0), 0);

    return `<!DOCTYPE html><html><head><title>Fatura - ${clienteNomeCompleto}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:12px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #b8860b;padding-bottom:16px}
.header img{height:60px}
.header-info{text-align:right}
.header-info h1{font-size:22px;color:#b8860b;margin-bottom:4px}
.header-info p{font-size:11px;color:#666}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.info-box{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:12px}
.info-box h3{font-size:11px;text-transform:uppercase;color:#888;margin-bottom:6px;letter-spacing:0.5px}
.info-box p{font-size:12px;margin-bottom:2px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
th{background:#2d3748;color:#fff;font-weight:600;font-size:10px;text-transform:uppercase}
.r{text-align:right}.c{text-align:center}
.total-row{background:#f7f7f7;font-weight:bold;font-size:13px}
.footer{margin-top:24px;padding-top:12px;border-top:2px solid #b8860b;text-align:center;font-size:10px;color:#888}
@media print{body{padding:15px}@page{size:A4 portrait;margin:15mm}}
</style></head><body>
<div class="header">
  <img src="${logoUrl}" alt="Executive Service" />
  <div class="header-info">
    <h1>FATURA Nº ${venda.numero_venda}</h1>
    <p>Emitida em: ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</div>
<div class="info-grid">
  <div class="info-box">
    <h3>Cliente</h3>
    <p><strong>${clienteNomeCompleto}</strong></p>
    ${clienteData?.cnpj_cpf ? `<p><strong>CNPJ/CPF:</strong> ${clienteData.cnpj_cpf}</p>` : ""}
    ${clienteData?.telefone ? `<p><strong>Telefone:</strong> ${clienteData.telefone}</p>` : ""}
    ${clienteData?.email ? `<p><strong>Email:</strong> ${clienteData.email}</p>` : ""}
    ${clienteData?.endereco ? `<p><strong>Endereço:</strong> ${clienteData.endereco}</p>` : ""}
    ${clienteData?.cep || clienteData?.cidade || clienteData?.uf ? `<p>${[clienteData.cep, clienteData.cidade, clienteData.uf].filter(Boolean).join(" - ")}</p>` : ""}
  </div>
  <div class="info-box">
    <h3>Detalhes</h3>
    <p><strong>Data da Venda:</strong> ${formatDate(venda.data_venda)}</p>
    ${venda.data_vencimento ? `<p><strong>Vencimento:</strong> ${formatDate(venda.data_vencimento)}</p>` : ""}
    ${venda.forma_pagamento ? `<p><strong>Forma de Pagamento:</strong> ${venda.forma_pagamento}</p>` : ""}
    <p><strong>Status:</strong> ${venda.status.toUpperCase()}</p>
  </div>
</div>
<table>
  <thead><tr>
    <th class="c">#</th><th>O.S.</th><th>Data</th><th>Tipo</th>
    <th>Origem → Destino</th><th class="c">SHT</th><th class="r">Valor</th>
  </tr></thead>
  <tbody>
    ${rows}
    ${extrasRows}
    <tr class="total-row">
      <td colspan="6" class="r">TOTAL</td>
      <td class="r">${formatCurrency(totalCalculado)}</td>
    </tr>
  </tbody>
</table>
${venda.observacoes ? `<div style="margin-top:16px;padding:10px;background:#fffbeb;border:1px solid #f0d68a;border-radius:4px"><strong>Observações:</strong> ${venda.observacoes}</div>` : ""}
<div class="footer">
  <p>Executive Service — Fatura gerada automaticamente</p>
</div>
</body></html>`;
  };

  const markVendaAsFaturado = async (venda: Venda) => {
    await supabase.from("vendas").update({ status: "faturado" }).eq("id", venda.id);

    const { data: vendaItems } = await supabase
      .from("venda_items")
      .select("agenda_item_id")
      .eq("venda_id", venda.id);

    if (vendaItems && vendaItems.length > 0) {
      const ids = vendaItems.map((vi) => vi.agenda_item_id);
      await supabase.from("agenda_items").update({ status_faturamento: "faturado" }).in("id", ids);
    }

    await loadVendas();
  };

  const handleGerarFatura = async (venda: Venda) => {
    const html = await buildFaturaHTML(venda);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
    await markVendaAsFaturado(venda);
  };

  const handleSalvarFatura = async (venda: Venda) => {
    const html = await buildFaturaHTML(venda);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fatura_${venda.numero_venda}_${venda.cliente.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await markVendaAsFaturado(venda);
    toast({ title: "Fatura salva", description: "Arquivo HTML baixado com sucesso" });
  };

  const loadFechamentoClientes = useCallback(async () => {
    const { data } = await supabase
      .from("agenda_items")
      .select("cliente")
      .order("cliente");
    if (data) {
      const unique = [...new Set(data.map((d) => d.cliente))].filter(Boolean).sort();
      setFechamentoAllClientes(unique);
    }
  }, []);

  const loadFechamentoItemsByCliente = useCallback(async (cli: string) => {
    if (!cli) {
      setFechamentoItems([]);
      setFechamentoSelected(new Set());
      setFechamentoExtras([]);
      setFechamentoExtrasSelected(new Set());
      return;
    }

    const { data } = await supabase
      .from("agenda_items")
      .select("id, cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente, receptivo, status_faturamento, deleted_at")
      .eq("cliente", cli)
      .is("deleted_at", null)
      .order("data", { ascending: true });

    // Filtrar status no client: vazio "" não é representável no PostgREST .or()
    const items = (data || []).filter((it: any) => {
      const sf = it.status_faturamento;
      return sf === null || sf === undefined || sf === "";
    });
    setFechamentoItems(items);
    setFechamentoSelected(new Set(items.map((_: any, i: number) => i)));

    const agendaExtras = buildAgendaExtrasFromItems(items);
    setFechamentoExtras(agendaExtras);
    setFechamentoExtrasSelected(new Set(agendaExtras.map((_: any, i: number) => i)));
  }, []);

  const handleRelatorioFechamento = async (venda: Venda) => {
    await loadFechamentoClientes();
    const { data: vendaItems } = await supabase
      .from("venda_items")
      .select("*, agenda_items:agenda_item_id(cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente)")
      .eq("venda_id", venda.id);

    const items = (vendaItems || []).map((vi: any) => vi.agenda_items).filter(Boolean);

    const { data: extrasData } = await supabase
      .from("venda_extras")
      .select("descricao, valor")
      .eq("venda_id", venda.id);

    const agendaExtras = buildAgendaExtrasFromItems(items);
    const vendaExtras = (extrasData || []).map((e: any) => ({ descricao: e.descricao, valor: parseMoneyValue(e.valor) }));
    const extras = [...agendaExtras, ...vendaExtras];

    setFechamentoCliente(venda.cliente);
    setFechamentoItems(items);
    setFechamentoSelected(new Set(items.map((_: any, i: number) => i)));
    setFechamentoExtras(extras);
    setFechamentoExtrasSelected(new Set(extras.map((_: any, i: number) => i)));
    setFechamentoNovoExtra({ descricao: "", valor: "" });
    setFechamentoSearch("");
    setFechamentoDataInicio("");
    setFechamentoDataFim("");
    setFechamentoReceptivo("");
    setFechamentoDialogOpen(true);
  };

  const handleOpenFechamentoAvulso = async () => {
    await loadFechamentoClientes();
    setFechamentoCliente("");
    setFechamentoItems([]);
    setFechamentoSelected(new Set());
    setFechamentoExtras([]);
    setFechamentoExtrasSelected(new Set());
    setFechamentoNovoExtra({ descricao: "", valor: "" });
    setFechamentoSearch("");
    setFechamentoDataInicio("");
    setFechamentoDataFim("");
    setFechamentoReceptivo("");
    setFechamentoDialogOpen(true);
  };

  const handleFechamentoClienteChange = async (cli: string) => {
    setFechamentoCliente(cli);
    setFechamentoExtras([]);
    setFechamentoExtrasSelected(new Set());
    await loadFechamentoItemsByCliente(cli);
  };

  const fechamentoReceptivos = useMemo(() => {
    return [...new Set(fechamentoItems.map((i: any) => i.receptivo).filter(Boolean))].sort();
  }, [fechamentoItems]);

  const fechamentoFilteredItems = useMemo(() => {
    const mapped = fechamentoItems.map((item: any, idx: number) => ({ item, idx }));
    return mapped.filter(({ item }) => {
      if (fechamentoSearch) {
        const s = fechamentoSearch.toLowerCase();
        const matchText = (item.cot || "").toLowerCase().includes(s) ||
          (item.origem || "").toLowerCase().includes(s) ||
          (item.destino || "").toLowerCase().includes(s) ||
          (item.data || "").includes(s) ||
          (item.tipo || "").toLowerCase().includes(s);
        if (!matchText) return false;
      }
      if (fechamentoDataInicio && item.data < fechamentoDataInicio) return false;
      if (fechamentoDataFim && item.data > fechamentoDataFim) return false;
      if (fechamentoReceptivo && (item.receptivo || "") !== fechamentoReceptivo) return false;
      return true;
    });
  }, [fechamentoItems, fechamentoSearch, fechamentoDataInicio, fechamentoDataFim, fechamentoReceptivo]);

  const handleGerarFechamento = async (format: "print" | "excel" = "print") => {
    if (!fechamentoCliente || !session?.user?.id) return;
    // Only include items that are both selected AND visible (filtered)
    const visibleIndices = new Set(fechamentoFilteredItems.map(({ idx }) => idx));
    const selectedItems = fechamentoItems.filter((_: any, i: number) => fechamentoSelected.has(i) && visibleIndices.has(i));
    const selectedExtras = fechamentoExtras.filter((_, i) => fechamentoExtrasSelected.has(i));

    // Update status_faturamento to "enviado" for selected items
    const ids = selectedItems.map((item: any) => item.id).filter(Boolean);
    if (ids.length > 0) {
      await supabase.from("agenda_items").update({ status_faturamento: "enviado" }).in("id", ids);
    }

    // Calculate totals
    const valorTotal = selectedItems.reduce((s: number, i: any) => s + (Number(i.valor) || 0), 0);
    const extrasTotal = selectedExtras.reduce((s, e) => s + (e.valor || 0), 0);

    // Save to DB
    const { data: inserted, error } = await supabase.from("fechamentos").insert({
      user_id: session.user.id,
      cliente: fechamentoCliente,
      valor_total: valorTotal,
      extras_total: extrasTotal,
      quantidade_servicos: selectedItems.length,
      items: selectedItems,
      extras: selectedExtras,
    } as any).select("id, numero_fechamento").single();

    if (error) {
      toast({ title: "Erro ao salvar fechamento", description: error.message, variant: "destructive" });
      return;
    }

    const numero = inserted?.numero_fechamento;

    // Save links
    if (ids.length > 0) {
      await supabase.from("fechamento_items").insert(
        ids.map((aid: string) => ({ fechamento_id: inserted.id, agenda_item_id: aid }))
      );
    }

    const reportArgs = [
      selectedItems,
      `Fechamento Nº ${numero} - ${fechamentoCliente}`,
      fechamentoCliente,
      { cliente: fechamentoCliente, extras: selectedExtras },
      numero
    ] as const;

    if (format === "excel") {
      generateClosingReportExcel(...reportArgs);
    } else {
      generateClosingReport(...reportArgs);
    }
    toast({ title: `Fechamento Nº ${numero} salvo com sucesso!` });
    setFechamentoDialogOpen(false);
  };

  const openEditDialog = (type: "pagar" | "receber", item: any) => {
    setEditForm({
      descritivo: item.descritivo || "",
      valor: String(item.valor),
      data: item.data || "",
      data_vencimento: item.data_vencimento || "",
      data_pagamento: item.data_pagamento || "",
      centro: (type === "pagar" ? item.centro_custo : item.centro_receita) || "",
      subgrupo: (type === "pagar" ? item.subgrupo_custo : item.subgrupo_receita) || "",
      cliente: item.cliente || "",
      fornecedor: item.fornecedor || "",
      placa: item.placa || "",
    });
    setEditDialog({ type, item });
  };

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    const { type, item } = editDialog;
    const table = type === "pagar" ? "contas_pagar" : "contas_receber";
    const updates: any = {
      descritivo: editForm.descritivo,
      valor: parseFloat(editForm.valor) || 0,
      data: editForm.data || null,
      data_vencimento: editForm.data_vencimento || null,
      data_pagamento: editForm.data_pagamento || null,
      status: editForm.data_pagamento ? "pago" : "pendente",
      ...(type === "pagar"
        ? { centro_custo: editForm.centro, subgrupo_custo: editForm.subgrupo, fornecedor: editForm.fornecedor, placa: editForm.placa }
        : { centro_receita: editForm.centro, subgrupo_receita: editForm.subgrupo, cliente: editForm.cliente }),
    };
    
    const { error } = await supabase.from(table).update(updates).eq("id", item.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registro atualizado!" });
      setEditDialog(null);
      if (type === "pagar") loadContasPagar();
      else loadContasReceber();
    }
  };

  const handleBaixa = (type: "pagar" | "receber", item: any) => {
    const saldo = Number(item.valor) - Number(item.valor_pago || 0);
    setBaixaValor(saldo.toFixed(2));
    setBaixaDialog({ type, item });
  };

  const handleConfirmBaixa = async () => {
    if (!baixaDialog) return;
    const { type, item } = baixaDialog;
    const valorBaixa = parseFloat(baixaValor) || 0;
    if (valorBaixa <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    const valorPagoAnterior = Number(item.valor_pago || 0);
    const novoValorPago = valorPagoAnterior + valorBaixa;
    const valorTotal = Number(item.valor);
    const today = new Date().toISOString().split("T")[0];
    const table = type === "pagar" ? "contas_pagar" : "contas_receber";
    const isPartial = novoValorPago < valorTotal;

    if (isPartial) {
      // Fecha o registro atual com o valor efetivamente pago e cria um novo pendente com o saldo
      const valorEfetivoPago = novoValorPago;
      const saldoRestante = valorTotal - valorEfetivoPago;
      await supabase.from(table).update({
        valor: valorEfetivoPago,
        valor_pago: valorEfetivoPago,
        status: "pago",
        data_pagamento: today,
      }).eq("id", item.id);

      const { id, created_at, updated_at, ...rest } = item as any;
      const novaConta = {
        ...rest,
        valor: saldoRestante,
        valor_pago: 0,
        status: "pendente",
        data_pagamento: null,
        descritivo: `${item.descritivo || ""}${item.descritivo ? " " : ""}(saldo)`.trim(),
      };
      await supabase.from(table).insert(novaConta);
    } else {
      await supabase.from(table).update({
        valor_pago: valorTotal,
        status: "pago",
        data_pagamento: today,
      }).eq("id", item.id);
    }
    toast({ title: isPartial ? "Baixa parcial realizada! Saldo lançado em pendentes." : "Baixa total realizada!" });
    setBaixaDialog(null);
    if (type === "pagar") loadContasPagar();
    else loadContasReceber();
  };

  const handleDeleteConta = async (type: "pagar" | "receber", id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const table = type === "pagar" ? "contas_pagar" : "contas_receber";
    await supabase.from(table).delete().eq("id", id);
    toast({ title: "Registro excluído" });
    if (type === "pagar") loadContasPagar();
    else loadContasReceber();
  };

  const handleCancelarConta = async (type: "pagar" | "receber", id: string) => {
    if (!confirm("Cancelar este registro?")) return;
    const table = type === "pagar" ? "contas_pagar" : "contas_receber";
    await supabase.from(table).update({ status: "cancelado" }).eq("id", id);
    toast({ title: "Registro cancelado" });
    if (type === "pagar") loadContasPagar();
    else loadContasReceber();
  };
  const openNovaContaDialog = (type: "pagar" | "receber") => {
    setNovaContaForm({ descritivo: "", valor: "", data: new Date().toISOString().split("T")[0], data_vencimento: "", data_pagamento: "", fornecedor: "", cliente: "", centro_custo: "", centro_receita: "", subgrupo_custo: "", subgrupo_receita: "", placa: "", parcelado: false, num_parcelas: "2" });
    setQuickAddFornecedor(false);
    setQuickAddFornecedorNome("");
    setQuickAddCliente(false);
    setQuickAddClienteNome("");
    setQuickAddCentroCusto(false);
    setQuickAddCentroCustoNome("");
    setQuickAddSubgrupoCusto(false);
    setQuickAddSubgrupoCustoNome("");
    setNovaContaDialog(type);
  };
  const handleQuickAddFornecedor = async () => {
    const nome = quickAddFornecedorNome.trim();
    if (!nome || !session) return;
    const { error } = await supabase.from("fornecedores").insert({
      user_id: session.user.id,
      razao_social: nome,
      cnpj: "",
      contato: "",
      email: "",
      telefone: "",
    });
    if (error) {
      toast({ title: "Erro ao cadastrar fornecedor", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Fornecedor "${nome}" cadastrado!` });
    await loadFornecedores();
    setNovaContaForm({ ...novaContaForm, fornecedor: nome });
    setQuickAddFornecedor(false);
    setQuickAddFornecedorNome("");
  };

  const handleQuickAddCliente = async () => {
    const nome = quickAddClienteNome.trim();
    if (!nome || !session) return;
    const { error } = await supabase.from("clientes").insert({
      user_id: session.user.id,
      nome,
      cnpj_cpf: "",
      email: "",
      telefone: "",
      endereco: "",
    });
    if (error) {
      toast({ title: "Erro ao cadastrar cliente", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Cliente "${nome}" cadastrado!` });
    await loadClientes();
    setNovaContaForm({ ...novaContaForm, cliente: nome });
    setQuickAddCliente(false);
    setQuickAddClienteNome("");
  };

  const handleQuickAddCentroCusto = async () => {
    const nome = quickAddCentroCustoNome.trim();
    if (!nome || !session) return;
    const { error } = await supabase.from("centros_custo").insert({ nome, user_id: session.user.id });
    if (error) {
      toast({ title: "Erro ao cadastrar centro de custo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Centro de custo "${nome}" cadastrado!` });
    await loadCentrosCusto();
    setNovaContaForm({ ...novaContaForm, centro_custo: nome, subgrupo_custo: "" });
    setQuickAddCentroCusto(false);
    setQuickAddCentroCustoNome("");
  };

  const handleQuickAddSubgrupoCusto = async () => {
    const nome = quickAddSubgrupoCustoNome.trim();
    if (!nome || !session || !novaContaForm.centro_custo) return;
    const centroObj = centrosCusto.find((c) => c.nome === novaContaForm.centro_custo);
    if (!centroObj) return;
    const { error } = await supabase.from("subgrupos_custo").insert({ nome, centro_custo_id: centroObj.id, user_id: session.user.id });
    if (error) {
      toast({ title: "Erro ao cadastrar subgrupo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Subgrupo "${nome}" cadastrado!` });
    await loadSubgruposCusto();
    setNovaContaForm({ ...novaContaForm, subgrupo_custo: nome });
    setQuickAddSubgrupoCusto(false);
    setQuickAddSubgrupoCustoNome("");
  };

  const handleSaveNovaConta = async () => {
    if (!novaContaDialog || !session) return;
    const dataLancamento = novaContaForm.data || new Date().toISOString().split("T")[0];

    if (novaContaDialog === "pagar") {
      const valorTotal = parseFloat(novaContaForm.valor) || 0;
      const isParcelado = novaContaForm.parcelado && !novaContaForm.data_pagamento;
      const n = isParcelado ? Math.max(1, parseInt(novaContaForm.num_parcelas) || 1) : 1;

      // Distribuição: arredonda 2 casas, ajusta a última parcela
      const valorBase = Math.floor((valorTotal / n) * 100) / 100;
      const valorUltima = +(valorTotal - valorBase * (n - 1)).toFixed(2);

      // Base do vencimento
      const baseVenc = novaContaForm.data_vencimento || dataLancamento;
      const [yy, mm, dd] = baseVenc.split("-").map(Number);

      const rows = Array.from({ length: n }, (_, i) => {
        // soma i meses preservando o dia (clamp ao último dia do mês)
        const target = new Date(yy, (mm - 1) + i, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(dd, lastDay));
        const venc = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
        const valorParcela = i === n - 1 ? valorUltima : valorBase;
        const descBase = novaContaForm.descritivo || "";
        const descritivo = n > 1 ? `${descBase}${descBase ? " " : ""}(${i + 1}/${n})` : descBase;
        return {
          user_id: session.user.id,
          venda_id: null as any,
          fornecedor: novaContaForm.fornecedor,
          descritivo,
          valor: valorParcela,
          data: dataLancamento,
          data_vencimento: venc,
          data_pagamento: i === 0 ? (novaContaForm.data_pagamento || null) : null,
          status: i === 0 && novaContaForm.data_pagamento ? "pago" : "pendente",
          centro_custo: novaContaForm.centro_custo,
          subgrupo_custo: novaContaForm.subgrupo_custo,
          placa: novaContaForm.placa,
        };
      });

      const { error } = await supabase.from("contas_pagar").insert(rows);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: n > 1 ? `${n} parcelas criadas!` : "Conta a pagar criada!" });
      loadContasPagar();
    } else {
      const { error } = await supabase.from("contas_receber").insert({
        user_id: session.user.id,
        venda_id: null as any,
        cliente: novaContaForm.cliente,
        descritivo: novaContaForm.descritivo,
        valor: parseFloat(novaContaForm.valor) || 0,
        data: dataLancamento,
        data_vencimento: novaContaForm.data_vencimento || null,
        data_pagamento: novaContaForm.data_pagamento || null,
        status: novaContaForm.data_pagamento ? "pago" : "pendente",
        centro_receita: novaContaForm.centro_receita,
        subgrupo_receita: novaContaForm.subgrupo_receita,
      });
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Conta a receber criada!" });
      loadContasReceber();
    }
    setNovaContaDialog(null);
  };

  const openEditVenda = async (venda: Venda) => {
    setEditVendaForm({
      cliente: venda.cliente,
      data_venda: venda.data_venda,
      data_vencimento: venda.data_vencimento || "",
      observacoes: venda.observacoes || "",
      status: venda.status,
      forma_pagamento: venda.forma_pagamento || "",
    });
    setEditVendaSearch("");

    // Load current venda items
    const { data: vendaItems } = await supabase
      .from("venda_items")
      .select("agenda_item_id, valor")
      .eq("venda_id", venda.id);
    const currentIds = new Set((vendaItems || []).map((vi: any) => vi.agenda_item_id));
    setEditVendaSelectedIds(currentIds);

    // Load all agenda items for this client (current + available)
    const { data: allItems } = await supabase
      .from("agenda_items")
      .select("id, cliente, data, hora, tipo, origem, destino, valor, custo, motorista, veiculo, pax, cot, fornecedor, status_faturamento")
      .eq("cliente", venda.cliente)
      .order("data", { ascending: true });

    const items = (allItems || []) as AgendaItem[];
    // Show items that are in the venda OR not yet billed
    const relevant = items.filter((i) => currentIds.has(i.id) || !i.status_faturamento || i.status_faturamento === "");
    setEditVendaAvailableItems(relevant);

    // Load extras
    const { data: extrasData } = await supabase
      .from("venda_extras")
      .select("*")
      .eq("venda_id", venda.id);
    setEditVendaExtras((extrasData || []).map((e: any) => ({ descricao: e.descricao, valor: Number(e.valor) })));

    setEditVendaDialog(venda);
  };

  const editVendaFilteredItems = useMemo(() => {
    if (!editVendaSearch) return editVendaAvailableItems;
    const q = editVendaSearch.toLowerCase();
    return editVendaAvailableItems.filter(
      (i) =>
        i.cot.toLowerCase().includes(q) ||
        i.tipo.toLowerCase().includes(q) ||
        i.origem.toLowerCase().includes(q) ||
        i.destino.toLowerCase().includes(q)
    );
  }, [editVendaAvailableItems, editVendaSearch]);

  const editVendaExtrasTotal = useMemo(() => editVendaExtras.reduce((s, e) => s + e.valor, 0), [editVendaExtras]);

  const editVendaTotal = useMemo(() => {
    const servicos = editVendaAvailableItems
      .filter((i) => editVendaSelectedIds.has(i.id))
      .reduce((sum, i) => sum + i.valor, 0);
    return servicos + editVendaExtrasTotal;
  }, [editVendaAvailableItems, editVendaSelectedIds, editVendaExtrasTotal]);

  const toggleEditVendaItem = (id: string) => {
    setEditVendaSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveEditVenda = async () => {
    if (!editVendaDialog) return;
    if (editVendaSelectedIds.size === 0) {
      toast({ title: "Selecione pelo menos um serviço", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const vendaId = editVendaDialog.id;

      // Get original item ids
      const { data: originalItems } = await supabase
        .from("venda_items")
        .select("agenda_item_id")
        .eq("venda_id", vendaId);
      const originalIds = new Set((originalItems || []).map((oi: any) => oi.agenda_item_id));

      const newIds = editVendaSelectedIds;
      const addedIds = [...newIds].filter((id) => !originalIds.has(id));
      const removedIds = [...originalIds].filter((id) => !newIds.has(id));

      // Remove venda_items for removed services
      if (removedIds.length > 0) {
        await supabase.from("venda_items").delete().eq("venda_id", vendaId).in("agenda_item_id", removedIds);
        // Reset status_faturamento for removed items
        await supabase.from("agenda_items").update({ status_faturamento: "" }).in("id", removedIds);
      }

      // Add venda_items for newly added services
      if (addedIds.length > 0) {
        const newVendaItems = addedIds.map((agenda_item_id) => ({
          venda_id: vendaId,
          agenda_item_id,
          valor: editVendaAvailableItems.find((i) => i.id === agenda_item_id)?.valor || 0,
        }));
        await supabase.from("venda_items").insert(newVendaItems);
        await supabase.from("agenda_items").update({ status_faturamento: "faturado" }).in("id", addedIds);
      }

      // Update venda record
      const newTotal = editVendaTotal;
      const { error } = await supabase.from("vendas").update({
        cliente: editVendaForm.cliente,
        data_venda: editVendaForm.data_venda,
        data_vencimento: editVendaForm.data_vencimento || null,
        observacoes: editVendaForm.observacoes,
        status: editVendaForm.status,
        forma_pagamento: editVendaForm.forma_pagamento,
        valor_total: newTotal,
      }).eq("id", vendaId);
      if (error) throw error;

      // Update conta a receber value
      await supabase.from("contas_receber").update({ valor: newTotal, cliente: editVendaForm.cliente }).eq("venda_id", vendaId).eq("status", "pendente");

      // Replace extras
      await supabase.from("venda_extras").delete().eq("venda_id", vendaId);
      const validExtras = editVendaExtras.filter(e => e.descricao && e.valor > 0);
      if (validExtras.length > 0) {
        await supabase.from("venda_extras").insert(validExtras.map(e => ({
          venda_id: vendaId,
          descricao: e.descricao,
          valor: e.valor,
        })));
      }

      toast({ title: "Venda atualizada com sucesso!" });
      setEditVendaDialog(null);
      loadVendas();
      loadContasPagar();
      loadContasReceber();
      loadVendaOsMap();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pago": return "default";
      case "pendente": return "secondary";
      case "parcial": return "outline";
      case "cancelado": return "destructive";
      default: return "outline";
    }
  };

  const filteredContasPagarList = useMemo(() => {
    let filtered = contasPagarList;
    const osSearch = filtroOsPagar.trim().toLowerCase();
    const fornSearch = filtroFornecedorPagar.trim().toLowerCase();
    if (osSearch) {
      filtered = filtered.filter((cp) => {
        // Search in vendaOsMap cots
        const cots = vendaOsMap[cp.venda_id]?.cots || [];
        if (cots.some((cot) => cot.toLowerCase().includes(osSearch))) return true;
        // Also search in descritivo for manually inserted entries
        if (cp.descritivo?.toLowerCase().includes(osSearch)) return true;
        if (cp.fornecedor?.toLowerCase().includes(osSearch)) return true;
        return false;
      });
    }
    if (fornSearch) {
      filtered = filtered.filter((cp) => cp.fornecedor.toLowerCase().includes(fornSearch));
    }
    if (filtroStatusPagar) {
      filtered = filtered.filter((cp) => cp.status === filtroStatusPagar);
    }
    if (filtroCentroCustoPagar) {
      filtered = filtered.filter((cp) => (cp as any).centro_custo === filtroCentroCustoPagar);
    }
    if (filtroVencimentoInicioPagar) {
      filtered = filtered.filter((cp) => !cp.data_vencimento || cp.data_vencimento >= filtroVencimentoInicioPagar);
    }
    if (filtroVencimentoFimPagar) {
      filtered = filtered.filter((cp) => !cp.data_vencimento || cp.data_vencimento <= filtroVencimentoFimPagar);
    }
    return filtered;
  }, [contasPagarList, filtroOsPagar, filtroFornecedorPagar, filtroStatusPagar, filtroCentroCustoPagar, filtroVencimentoInicioPagar, filtroVencimentoFimPagar, vendaOsMap]);

  const filteredContasReceberList = useMemo(() => {
    let filtered = contasReceberList;
    const osSearch = filtroOsReceber.trim().toLowerCase();
    const clienteSearch = filtroClienteReceber.trim().toLowerCase();
    if (osSearch) {
      filtered = filtered.filter((cr) => {
        const cots = vendaOsMap[cr.venda_id]?.cots || [];
        return cots.some((cot) => cot.toLowerCase().includes(osSearch));
      });
    }
    if (clienteSearch) {
      filtered = filtered.filter((cr) => cr.cliente.toLowerCase().includes(clienteSearch));
    }
    if (filtroStatusReceber) {
      filtered = filtered.filter((cr) => cr.status === filtroStatusReceber);
    }
    if (filtroVencimentoInicioReceber) {
      filtered = filtered.filter((cr) => !cr.data_vencimento || cr.data_vencimento >= filtroVencimentoInicioReceber);
    }
    if (filtroVencimentoFimReceber) {
      filtered = filtered.filter((cr) => !cr.data_vencimento || cr.data_vencimento <= filtroVencimentoFimReceber);
    }
    return filtered;
  }, [contasReceberList, filtroOsReceber, filtroClienteReceber, filtroStatusReceber, filtroVencimentoInicioReceber, filtroVencimentoFimReceber, vendaOsMap]);

  const filteredVendas = useMemo(() => {
    let filtered = vendas;
    const clienteSearch = filtroClienteVendas.trim().toLowerCase();
    const osSearch = filtroOsVendas.trim().toLowerCase();
    if (clienteSearch) {
      filtered = filtered.filter((v) => {
        const cliente = vendaOsMap[v.id]?.cliente || v.cliente || "";
        return cliente.toLowerCase().includes(clienteSearch);
      });
    }
    if (osSearch) {
      filtered = filtered.filter((v) => {
        const cots = vendaOsMap[v.id]?.cots || [];
        return cots.some((c) => c.toLowerCase().includes(osSearch)) || String(v.numero_venda).includes(osSearch);
      });
    }
    if (filtroStatusVendas) {
      filtered = filtered.filter((v) => v.status === filtroStatusVendas);
    }
    if (filtroDataInicioVendas) {
      filtered = filtered.filter((v) => v.data_venda >= filtroDataInicioVendas);
    }
    if (filtroDataFimVendas) {
      filtered = filtered.filter((v) => v.data_venda <= filtroDataFimVendas);
    }
    return filtered;
  }, [vendas, filtroClienteVendas, filtroOsVendas, filtroStatusVendas, filtroDataInicioVendas, filtroDataFimVendas, vendaOsMap]);

  const totalPagarPendente = contasPagarList.filter(c => c.status === "pendente" || c.status === "parcial").reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago || 0)), 0);
  const totalReceberPendente = contasReceberList.filter(c => c.status === "pendente" || c.status === "parcial").reduce((s, c) => s + (Number(c.valor) - Number(c.valor_pago || 0)), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <img src={logo} alt="Executive Service" className="h-10" />
          <div className="flex items-center gap-4">
            <Link to="/">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <ArrowLeft className="h-4 w-4" /> Agenda
              </span>
            </Link>
            <button onClick={signOut} className="text-sm text-primary-foreground/80 hover:text-primary-foreground">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Financeiro
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open('https://querofaturar.com.br', '_blank')} className="gap-2">
              <ExternalLink className="h-4 w-4" /> Quero Faturar
            </Button>
            <Button variant="outline" onClick={handleOpenFechamentoAvulso} className="gap-2">
              <ClipboardList className="h-4 w-4" /> Relatório de Fechamento
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Venda
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="receber" className="gap-1">
              A Receber <Badge variant="secondary" className="ml-1 text-xs">{formatCurrency(totalReceberPendente)}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pagar" className="gap-1">
              A Pagar <Badge variant="secondary" className="ml-1 text-xs">{formatCurrency(totalPagarPendente)}</Badge>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-1">
              Relatório
            </TabsTrigger>
          </TabsList>

          {/* ===== VENDAS TAB ===== */}
          <TabsContent value="vendas">
            {/* Filtros da aba Vendas */}
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">O.S.</span>
                <Input
                  placeholder="Nº da O.S."
                  value={filtroOsVendas}
                  onChange={(e) => setFiltroOsVendas(e.target.value)}
                  className="w-32 h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Cliente</span>
                <Input
                  placeholder="Nome do cliente"
                  value={filtroClienteVendas}
                  onChange={(e) => setFiltroClienteVendas(e.target.value)}
                  className="w-40 h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select value={filtroStatusVendas || "all"} onValueChange={(v) => setFiltroStatusVendas(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Data Início</span>
                <Input
                  type="date"
                  value={filtroDataInicioVendas}
                  onChange={(e) => setFiltroDataInicioVendas(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">Data Fim</span>
                <Input
                  type="date"
                  value={filtroDataFimVendas}
                  onChange={(e) => setFiltroDataFimVendas(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
              </div>
              {(filtroOsVendas || filtroClienteVendas || filtroStatusVendas || filtroDataInicioVendas || filtroDataFimVendas) && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => { setFiltroOsVendas(""); setFiltroClienteVendas(""); setFiltroStatusVendas(""); setFiltroDataInicioVendas(""); setFiltroDataFimVendas(""); }}>
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>O.S.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm font-bold">{v.numero_venda}</TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(v.data_venda)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {v.data_vencimento ? formatDate(v.data_vencimento) : "—"}
                        </TableCell>
                        <TableCell className="font-medium">{vendaOsMap[v.id]?.cliente || v.cliente || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{vendaOsMap[v.id]?.cots?.join(", ") || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(v.valor_total)}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(v.status) as any}>{v.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {v.observacoes}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditVenda(v)} title="Editar Venda">
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleGerarFatura(v)} title="Imprimir Fatura">
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSalvarFatura(v)} title="Salvar Fatura">
                              <Download className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleRelatorioFechamento(v)} title="Relatório de Fechamento">
                              <ClipboardList className="h-4 w-4 text-primary" />
                            </Button>
                            {v.status !== "cancelado" && (
                              <Button variant="ghost" size="icon" onClick={() => handleRegerarContasPagar(v)} title="Regerar Contas a Pagar">
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            {v.status !== "cancelado" && (
                              <Button variant="ghost" size="icon" onClick={() => handleCancelar(v)} title="Cancelar Venda">
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ===== CONTAS A RECEBER TAB ===== */}
          <TabsContent value="receber">
            <div className="flex flex-wrap items-end justify-between mb-2 gap-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">O.S.</span>
                  <Input
                    placeholder="Nº da O.S."
                    value={filtroOsReceber}
                    onChange={(e) => setFiltroOsReceber(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Cliente</span>
                  <Input
                    placeholder="Nome do cliente"
                    value={filtroClienteReceber}
                    onChange={(e) => setFiltroClienteReceber(e.target.value)}
                    className="w-40 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select value={filtroStatusReceber || "all"} onValueChange={(v) => setFiltroStatusReceber(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Vencimento De</span>
                  <Input
                    type="date"
                    value={filtroVencimentoInicioReceber}
                    onChange={(e) => setFiltroVencimentoInicioReceber(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Vencimento Até</span>
                  <Input
                    type="date"
                    value={filtroVencimentoFimReceber}
                    onChange={(e) => setFiltroVencimentoFimReceber(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { const l = new URL(logo, window.location.origin).href; printContasReceber(filteredContasReceberList, vendaOsMap, l); }} className="gap-1">
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => openNovaContaDialog("receber")} className="gap-1">
                  <Plus className="h-4 w-4" /> Nova Conta a Receber
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>O.S.</TableHead>
                    <TableHead>Centro Receita</TableHead>
                    <TableHead>Subgrupo</TableHead>
                     <TableHead>Descritivo</TableHead>
                     <TableHead className="text-right">Valor</TableHead>
                     <TableHead className="text-right">Pago</TableHead>
                     <TableHead className="text-right">Saldo</TableHead>
                     <TableHead>Vencimento</TableHead>
                     <TableHead>Pagamento</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContasReceberList.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a receber
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContasReceberList.map((cr) => (
                      <TableRow key={cr.id}>
                        <TableCell className="font-mono text-xs font-bold">{vendaOsMap[cr.venda_id]?.numero_venda || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(cr.data)}</TableCell>
                        <TableCell className="font-medium text-sm">{cr.cliente}</TableCell>
                        <TableCell className="font-mono text-xs">{vendaOsMap[cr.venda_id]?.cots?.join(", ") || "—"}</TableCell>
                        <TableCell className="text-sm">{cr.centro_receita || "—"}</TableCell>
                        <TableCell className="text-sm">{cr.subgrupo_receita || "—"}</TableCell>
                        <TableCell className="text-sm whitespace-pre-line">{normalizeDescricaoForDisplay(cr.descritivo)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cr.valor)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cr.valor_pago || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(Number(cr.valor) - Number(cr.valor_pago || 0))}</TableCell>
                        <TableCell className="font-mono text-xs">{cr.data_vencimento ? formatDate(cr.data_vencimento) : "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{cr.data_pagamento ? formatDate(cr.data_pagamento) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(cr.status) as any}>{cr.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(cr.status === "pendente" || cr.status === "parcial") && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleBaixa("receber", cr)} title="Dar Baixa">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleCancelarConta("receber", cr.id)} title="Cancelar">
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog("receber", cr)} title="Editar">
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteConta("receber", cr.id)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ===== CONTAS A PAGAR TAB ===== */}
          <TabsContent value="pagar">
            <div
              ref={zoomPagarCallbackRef}
              style={{ transformOrigin: 'top left', transform: `scale(${zoomPagar})`, width: `${100 / zoomPagar}%` }}
            >
              {zoomPagar !== 1 && (
                <div className="flex items-center justify-end mb-1 gap-2">
                  <span className="text-xs text-muted-foreground">Zoom: {Math.round(zoomPagar * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setZoomPagar(1)}>Reset</Button>
                </div>
              )}
            <div className="flex flex-wrap items-end justify-between mb-2 gap-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">O.S.</span>
                  <Input
                    placeholder="Nº da O.S."
                    value={filtroOsPagar}
                    onChange={(e) => setFiltroOsPagar(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Fornecedor</span>
                  <Input
                    placeholder="Nome do fornecedor"
                    value={filtroFornecedorPagar}
                    onChange={(e) => setFiltroFornecedorPagar(e.target.value)}
                    className="w-40 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Select value={filtroStatusPagar || "all"} onValueChange={(v) => setFiltroStatusPagar(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Centro de Custo</span>
                  <Select value={filtroCentroCustoPagar || "all"} onValueChange={(v) => setFiltroCentroCustoPagar(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-44 h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os centros</SelectItem>
                      {centrosCusto.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Vencimento De</span>
                  <Input
                    type="date"
                    value={filtroVencimentoInicioPagar}
                    onChange={(e) => setFiltroVencimentoInicioPagar(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Vencimento Até</span>
                  <Input
                    type="date"
                    value={filtroVencimentoFimPagar}
                    onChange={(e) => setFiltroVencimentoFimPagar(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {selectedContasPagar.size > 0 && (() => {
                  const selectedContas = filteredContasPagarList.filter(cp => selectedContasPagar.has(cp.id));
                  const fornecedores = new Set(selectedContas.map(c => c.fornecedor));
                  if (fornecedores.size === 1) {
                    return (
                      <Button variant="outline" size="sm" onClick={() => setWhatsappPagamento({ conta: selectedContas[0], contas: selectedContas, vendaInfo: null })} className="gap-1">
                        <MessageCircle className="h-4 w-4" /> WhatsApp ({selectedContasPagar.size})
                      </Button>
                    );
                  }
                  return (
                    <Button variant="outline" size="sm" disabled className="gap-1" title="Selecione contas do mesmo fornecedor">
                      <MessageCircle className="h-4 w-4" /> Fornecedores diferentes
                    </Button>
                  );
                })()}
                <Button variant="outline" size="sm" onClick={() => { const l = new URL(logo, window.location.origin).href; printContasPagar(filteredContasPagarList, vendaOsMap, l); }} className="gap-1">
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => openNovaContaDialog("pagar")} className="gap-1">
                  <Plus className="h-4 w-4" /> Nova Conta a Pagar
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={filteredContasPagarList.length > 0 && filteredContasPagarList.every(cp => selectedContasPagar.has(cp.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContasPagar(new Set(filteredContasPagarList.map(cp => cp.id)));
                          } else {
                            setSelectedContasPagar(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>O.S.</TableHead>
                    <TableHead>Centro Custo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Subgrupo</TableHead>
                    <TableHead>Descritivo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContasPagarList.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={17} className="text-center text-muted-foreground py-8">
                        Nenhuma conta a pagar
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContasPagarList.map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContasPagar.has(cp.id)}
                            onCheckedChange={() => {
                              setSelectedContasPagar(prev => {
                                const next = new Set(prev);
                                if (next.has(cp.id)) next.delete(cp.id);
                                else next.add(cp.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{vendaOsMap[cp.venda_id]?.numero_venda || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{formatDate(cp.data)}</TableCell>
                        <TableCell className="font-medium text-sm">
                          <div>{cp.fornecedor}</div>
                          {fornecedoresPixMap[cp.fornecedor] && (
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">PIX: {fornecedoresPixMap[cp.fornecedor]}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{vendaOsMap[cp.venda_id]?.cliente || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{(vendaOsMap[cp.venda_id]?.cotsByFornecedor?.[(cp.fornecedor || "").trim().toLowerCase()] || vendaOsMap[cp.venda_id]?.cots || []).join(", ") || "—"}</TableCell>
                        <TableCell className="text-sm">{cp.centro_custo || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{(cp as any).placa || "—"}</TableCell>
                        <TableCell className="text-sm">{cp.subgrupo_custo || "—"}</TableCell>
                        <TableCell className="text-sm whitespace-pre-line">{normalizeDescricaoForDisplay(cp.descritivo)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cp.valor)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(cp.valor_pago || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(Number(cp.valor) - Number(cp.valor_pago || 0))}</TableCell>
                        <TableCell className="font-mono text-xs">{cp.data_vencimento ? formatDate(cp.data_vencimento) : "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{cp.data_pagamento ? formatDate(cp.data_pagamento) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(cp.status) as any}>{cp.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(cp.status === "pendente" || cp.status === "parcial") && (
                              <Button variant="ghost" size="icon" onClick={() => handleBaixa("pagar", cp)} title="Dar Baixa">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setWhatsappPagamento({ conta: cp, vendaInfo: vendaOsMap[cp.venda_id] || null })} title="Enviar via WhatsApp">
                              <MessageCircle className="h-4 w-4 text-accent" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog("pagar", cp)} title="Editar">
                              <FileText className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteConta("pagar", cp.id)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            </div>
          </TabsContent>

          {/* ===== DASHBOARD TAB ===== */}
          <TabsContent value="dashboard">
            <DashboardFinanceiro />
          </TabsContent>

          {/* ===== RELATÓRIO CONSOLIDADO TAB ===== */}
          <TabsContent value="relatorio">
            <RelatorioContasConsolidado />
          </TabsContent>
        </Tabs>

        {/* ===== NOVA VENDA DIALOG ===== */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={cliente} onValueChange={setCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Selecionado</Label>
                  <Input
                    type="text"
                    value={totalSelectedManual !== null ? String(totalSelectedManual) : String(totalSelectedCalc)}
                    onChange={(e) => {
                      const val = parseMoneyValue(e.target.value);
                      setTotalSelectedManual(val);
                    }}
                    className="font-bold"
                  />
                </div>
              </div>

              {cliente && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Serviços da Agenda</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs whitespace-nowrap">De:</Label>
                        <Input
                          type="date"
                          value={periodoInicio}
                          onChange={(e) => setPeriodoInicio(e.target.value)}
                          className="h-9 w-36"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs whitespace-nowrap">Até:</Label>
                        <Input
                          type="date"
                          value={periodoFim}
                          onChange={(e) => setPeriodoFim(e.target.value)}
                          className="h-9 w-36"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          value={searchAgenda}
                          onChange={(e) => setSearchAgenda(e.target.value)}
                          className="pl-8 h-9 w-48"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        <Check className="h-4 w-4 mr-1" />
                        {selectedItems.size === filteredAgendaItems.length ? "Desmarcar" : "Selecionar"} Todos
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border border-border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]" />
                          <TableHead>O.S.</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Origem → Destino</TableHead>
                          <TableHead>SHT</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgendaItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                              Nenhum serviço encontrado para este cliente
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAgendaItems.map((item) => (
                            <TableRow
                              key={item.id}
                              className={`cursor-pointer ${selectedItems.has(item.id) ? "bg-accent/50" : ""}`}
                              onClick={() => toggleItem(item.id)}
                            >
                              <TableCell>
                                <Checkbox checked={selectedItems.has(item.id)} />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{item.cot}</TableCell>
                              <TableCell className="font-mono text-xs">{formatDate(item.data)}</TableCell>
                              <TableCell className="text-xs">{item.tipo}</TableCell>
                              <TableCell className="text-xs">{item.origem} → {item.destino}</TableCell>
                              <TableCell className="text-center">{item.pax}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{formatCurrency(item.valor)}</TableCell>
                              <TableCell>
                                {item.status_faturamento && (
                                  <Badge variant="outline" className="text-xs">{item.status_faturamento}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedItems.size} serviço(s) selecionado(s)
                  </p>
                </div>
              )}

              {/* Extras da Venda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Extras (somados ao valor total)</Label>
                  <Button variant="outline" size="sm" onClick={addExtra} type="button">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Extra
                  </Button>
                </div>
                {extras.length > 0 && (
                  <div className="space-y-2">
                    {extras.map((ex, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end rounded-md border border-border p-3 bg-muted/30">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Descrição</Label>
                          <Input className="h-9" value={ex.descricao} onChange={(e) => updateExtra(idx, "descricao", e.target.value)} placeholder="Ex: Taxa de pedágio" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor</Label>
                          <Input className="h-9" type="number" step="0.01" value={ex.valor || ""} onChange={(e) => updateExtra(idx, "valor", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-end">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeExtra(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Total extras: {formatCurrency(extrasTotal)}</p>
                  </div>
                )}
              </div>

              {/* Contas a Pagar extras */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Contas a Pagar (adicionais)</Label>
                  <Button variant="outline" size="sm" onClick={addContaPagar} type="button">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  As contas a pagar dos fornecedores dos serviços serão geradas automaticamente. Adicione aqui despesas extras.
                </p>

                {contasPagar.length > 0 && (
                  <div className="space-y-3">
                    {contasPagar.map((cp, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end rounded-md border border-border p-3 bg-muted/30">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Fornecedor</Label>
                          <Select value={cp.fornecedor} onValueChange={(v) => updateContaPagar(idx, "fornecedor", v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {fornecedores.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descritivo</Label>
                          <Textarea className="min-h-[36px] resize-y" value={cp.descritivo} onChange={(e) => updateContaPagar(idx, "descritivo", e.target.value)} placeholder="Descrição" rows={2} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor</Label>
                          <Input className="h-9" type="number" step="0.01" value={cp.valor || ""} onChange={(e) => updateContaPagar(idx, "valor", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Vencimento</Label>
                          <Input className="h-9" type="date" value={cp.data_vencimento} onChange={(e) => updateContaPagar(idx, "data_vencimento", e.target.value)} />
                        </div>
                        <div className="flex items-end">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeContaPagar(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Total extras: {formatCurrency(contasPagar.reduce((s, cp) => s + cp.valor, 0))}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={loading || selectedItems.size === 0}>
                {loading ? "Salvando..." : "Criar Venda"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== EDIT DIALOG ===== */}
        <Dialog open={!!editDialog} onOpenChange={(v) => !v && setEditDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Editar {editDialog?.type === "pagar" ? "Conta a Pagar" : "Conta a Receber"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{editDialog?.type === "receber" ? "Cliente" : "Fornecedor"}</Label>
                <Select
                  value={editDialog?.type === "receber" ? editForm.cliente : editForm.fornecedor}
                  onValueChange={(v) => editDialog?.type === "receber"
                    ? setEditForm({ ...editForm, cliente: v })
                    : setEditForm({ ...editForm, fornecedor: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editDialog?.type === "receber" ? clientes : fornecedores).map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descritivo</Label>
                <Textarea value={editForm.descritivo} onChange={(e) => setEditForm({ ...editForm, descritivo: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data do Lançamento</Label>
                  <Input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={editForm.data_vencimento} onChange={(e) => setEditForm({ ...editForm, data_vencimento: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Pagamento (baixa)</Label>
                <Input type="date" value={editForm.data_pagamento} onChange={(e) => setEditForm({ ...editForm, data_pagamento: e.target.value })} />
                <p className="text-xs text-muted-foreground">Preencher para dar baixa no registro</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{editDialog?.type === "pagar" ? "Centro de Custo" : "Centro de Receita"}</Label>
                  <Select value={editForm.centro} onValueChange={(v) => setEditForm({ ...editForm, centro: v === "none" ? "" : v, subgrupo: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(editDialog?.type === "pagar" ? centrosCusto : centrosReceita).map((c) => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subgrupo</Label>
                  <Select
                    value={editForm.subgrupo}
                    onValueChange={(v) => setEditForm({ ...editForm, subgrupo: v === "none" ? "" : v })}
                    disabled={!editForm.centro}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={editForm.centro ? "Selecione (opcional)" : "Selecione um centro primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(() => {
                        const centroObj = (editDialog?.type === "pagar" ? centrosCusto : centrosReceita).find((c) => c.nome === editForm.centro);
                        if (!centroObj) return null;
                        const subs = editDialog?.type === "pagar"
                          ? subgruposCusto.filter((s) => s.centro_custo_id === centroObj.id)
                          : subgruposReceita.filter((s) => s.centro_receita_id === centroObj.id);
                        return subs.map((s) => (
                          <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editDialog?.type === "pagar" && (
                <div className="space-y-2">
                  <Label>Veículo (Placa)</Label>
                  <Select value={editForm.placa} onValueChange={(v) => setEditForm({ ...editForm, placa: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {veiculosList.map((v) => (
                        <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.modelo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== EDIT VENDA DIALOG ===== */}
        <Dialog open={!!editVendaDialog} onOpenChange={(v) => !v && setEditVendaDialog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Venda {editVendaDialog?.numero_venda ? `Nº ${editVendaDialog.numero_venda}` : ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={editVendaForm.cliente} onValueChange={async (v) => {
                    setEditVendaForm({ ...editVendaForm, cliente: v });
                    // Reload agenda items for new client
                    const { data: allItems } = await supabase
                      .from("agenda_items")
                      .select("id, cliente, data, hora, tipo, origem, destino, valor, custo, motorista, veiculo, pax, cot, fornecedor, status_faturamento")
                      .eq("cliente", v)
                      .order("data", { ascending: true });
                    const items = (allItems || []) as AgendaItem[];
                    const currentIds = editVendaSelectedIds;
                    const relevant = items.filter((i) => currentIds.has(i.id) || !i.status_faturamento || i.status_faturamento === "");
                    setEditVendaAvailableItems(relevant);
                    // Keep only items that still exist in new client's list
                    const validIds = new Set(relevant.map(i => i.id));
                    setEditVendaSelectedIds(new Set([...currentIds].filter(id => validIds.has(id))));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input type="date" value={editVendaForm.data_venda} onChange={(e) => setEditVendaForm({ ...editVendaForm, data_venda: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={editVendaForm.data_vencimento} onChange={(e) => setEditVendaForm({ ...editVendaForm, data_vencimento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={editVendaForm.forma_pagamento} onValueChange={(v) => setEditVendaForm({ ...editVendaForm, forma_pagamento: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total</Label>
                  <div className="h-10 flex items-center rounded-md border border-input bg-muted px-3 font-bold text-foreground">
                    {formatCurrency(editVendaTotal)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editVendaForm.status} onValueChange={(v) => setEditVendaForm({ ...editVendaForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={editVendaForm.observacoes} onChange={(e) => setEditVendaForm({ ...editVendaForm, observacoes: e.target.value })} />
                </div>
              </div>

              {/* Serviços da Agenda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Serviços da Agenda</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={editVendaSearch}
                      onChange={(e) => setEditVendaSearch(e.target.value)}
                      className="pl-8 h-9 w-48"
                    />
                  </div>
                </div>
                <div className="rounded-md border border-border max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]" />
                        <TableHead>O.S.</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Origem → Destino</TableHead>
                        <TableHead>SHT</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editVendaFilteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                            Nenhum serviço encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        editVendaFilteredItems.map((item) => (
                          <TableRow
                            key={item.id}
                            className={`cursor-pointer ${editVendaSelectedIds.has(item.id) ? "bg-accent/50" : ""}`}
                            onClick={() => toggleEditVendaItem(item.id)}
                          >
                            <TableCell>
                              <Checkbox checked={editVendaSelectedIds.has(item.id)} />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.cot}</TableCell>
                            <TableCell className="font-mono text-xs">{formatDate(item.data)}</TableCell>
                            <TableCell className="text-xs">{item.tipo}</TableCell>
                            <TableCell className="text-xs">{item.origem} → {item.destino}</TableCell>
                            <TableCell className="text-center">{item.pax}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatCurrency(item.valor)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {editVendaSelectedIds.size} serviço(s) selecionado(s)
                </p>
              </div>

              {/* Extras */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Extras (somados ao valor total)</Label>
                  <Button variant="outline" size="sm" onClick={addEditVendaExtra} type="button">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Extra
                  </Button>
                </div>
                {editVendaExtras.length > 0 && (
                  <div className="space-y-2">
                    {editVendaExtras.map((ex, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end rounded-md border border-border p-3 bg-muted/30">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Descrição</Label>
                          <Input className="h-9" value={ex.descricao} onChange={(e) => updateEditVendaExtra(idx, "descricao", e.target.value)} placeholder="Ex: Taxa de pedágio" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor</Label>
                          <Input className="h-9" type="number" step="0.01" value={ex.valor || ""} onChange={(e) => updateEditVendaExtra(idx, "valor", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="flex items-end">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeEditVendaExtra(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Total extras: {formatCurrency(editVendaExtrasTotal)}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditVendaDialog(null)}>Cancelar</Button>
              <Button onClick={handleSaveEditVenda} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fechamento Selection Dialog */}
        <Dialog open={fechamentoDialogOpen} onOpenChange={(v) => { if (!v) setFechamentoDialogOpen(false); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório de Fechamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Client selector */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={fechamentoCliente} onValueChange={handleFechamentoClienteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {fechamentoAllClientes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fechamentoCliente && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar O.S., origem, destino..."
                        value={fechamentoSearch}
                        onChange={(e) => setFechamentoSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <Input
                      type="date"
                      value={fechamentoDataInicio}
                      onChange={(e) => setFechamentoDataInicio(e.target.value)}
                      placeholder="Data início"
                      className="h-9 w-[140px]"
                    />
                    <Input
                      type="date"
                      value={fechamentoDataFim}
                      onChange={(e) => setFechamentoDataFim(e.target.value)}
                      placeholder="Data fim"
                      className="h-9 w-[140px]"
                    />
                    {fechamentoReceptivos.length > 0 && (
                      <Select value={fechamentoReceptivo} onValueChange={(v) => setFechamentoReceptivo(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-9 w-[160px]">
                          <SelectValue placeholder="Todos receptivos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos receptivos</SelectItem>
                          {fechamentoReceptivos.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={fechamentoSelected.size === fechamentoItems.length && fechamentoItems.length > 0}
                        onCheckedChange={(checked) => {
                          setFechamentoSelected(checked ? new Set(fechamentoItems.map((_: any, i: number) => i)) : new Set());
                        }}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Todos</span>
                    </div>
                  </div>

                  <div className="border rounded-md divide-y max-h-[35vh] overflow-y-auto">
                    {fechamentoFilteredItems.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum serviço encontrado</div>
                    ) : (
                      fechamentoFilteredItems.map(({ item, idx }: any) => (
                        <label key={idx} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                          <Checkbox
                            checked={fechamentoSelected.has(idx)}
                            onCheckedChange={(checked) => {
                              const next = new Set(fechamentoSelected);
                              checked ? next.add(idx) : next.delete(idx);
                              setFechamentoSelected(next);
                            }}
                          />
                          <div className="flex-1 text-sm">
                            <span className="font-mono text-xs text-muted-foreground mr-2">{item.cot}</span>
                            <span>{item.data ? formatDate(item.data) : ""}</span>
                            <span className="mx-1">—</span>
                            <span>{item.tipo}</span>
                            <span className="mx-1">|</span>
                            <span className="text-muted-foreground">{item.origem} → {item.destino}</span>
                          </div>
                          <span className="text-xs font-mono">{formatCurrency(Number(item.valor) || 0)}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{fechamentoSelected.size} de {fechamentoItems.length} serviços selecionados</p>

                  {/* Extras section */}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Extras</p>
                    {fechamentoExtras.length > 0 && (
                      <div className="border rounded-md divide-y mb-2">
                        {fechamentoExtras.map((extra, idx) => (
                          <label key={idx} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                            <Checkbox
                              checked={fechamentoExtrasSelected.has(idx)}
                              onCheckedChange={(checked) => {
                                const next = new Set(fechamentoExtrasSelected);
                                checked ? next.add(idx) : next.delete(idx);
                                setFechamentoExtrasSelected(next);
                              }}
                            />
                            <span className="flex-1 text-sm">{extra.descricao}</span>
                            <span className="text-xs font-mono">{formatCurrency(extra.valor)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.preventDefault();
                                const next = fechamentoExtras.filter((_, i) => i !== idx);
                                setFechamentoExtras(next);
                                const nextSel = new Set<number>();
                                fechamentoExtrasSelected.forEach((i) => {
                                  if (i < idx) nextSel.add(i);
                                  else if (i > idx) nextSel.add(i - 1);
                                });
                                setFechamentoExtrasSelected(nextSel);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Descrição do extra"
                          value={fechamentoNovoExtra.descricao}
                          onChange={(e) => setFechamentoNovoExtra(prev => ({ ...prev, descricao: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Valor"
                          value={fechamentoNovoExtra.valor}
                          onChange={(e) => setFechamentoNovoExtra(prev => ({ ...prev, valor: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={!fechamentoNovoExtra.descricao.trim() || !fechamentoNovoExtra.valor}
                        onClick={() => {
                          const newIdx = fechamentoExtras.length;
                          setFechamentoExtras(prev => [...prev, { descricao: fechamentoNovoExtra.descricao.trim(), valor: parseMoneyValue(fechamentoNovoExtra.valor) }]);
                          setFechamentoExtrasSelected(prev => new Set([...prev, newIdx]));
                          setFechamentoNovoExtra({ descricao: "", valor: "" });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFechamentoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => handleGerarFechamento("excel")} disabled={fechamentoSelected.size === 0 || !fechamentoCliente} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={() => handleGerarFechamento("print")} disabled={fechamentoSelected.size === 0 || !fechamentoCliente} className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Gerar Relatório
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== NOVA CONTA MANUAL DIALOG ===== */}
        <Dialog open={!!novaContaDialog} onOpenChange={(v) => !v && setNovaContaDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {novaContaDialog === "pagar" ? "Nova Conta a Pagar" : "Nova Conta a Receber"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {novaContaDialog === "pagar" ? (
                <>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    {quickAddFornecedor ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome do novo fornecedor"
                          value={quickAddFornecedorNome}
                          onChange={(e) => setQuickAddFornecedorNome(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleQuickAddFornecedor()}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleQuickAddFornecedor} disabled={!quickAddFornecedorNome.trim()}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setQuickAddFornecedor(false); setQuickAddFornecedorNome(""); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select value={novaContaForm.fornecedor} onValueChange={(v) => setNovaContaForm({ ...novaContaForm, fornecedor: v })}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="outline" onClick={() => setQuickAddFornecedor(true)} title="Cadastrar novo fornecedor">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Veículo (Placa)</Label>
                    <Select value={novaContaForm.placa} onValueChange={(v) => setNovaContaForm({ ...novaContaForm, placa: v === "none" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {veiculosList.map((v) => (
                          <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.modelo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  {quickAddCliente ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome do novo cliente"
                        value={quickAddClienteNome}
                        onChange={(e) => setQuickAddClienteNome(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickAddCliente()}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleQuickAddCliente} disabled={!quickAddClienteNome.trim()}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setQuickAddCliente(false); setQuickAddClienteNome(""); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select value={novaContaForm.cliente} onValueChange={(v) => setNovaContaForm({ ...novaContaForm, cliente: v })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={() => setQuickAddCliente(true)} title="Cadastrar novo cliente">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Descritivo</Label>
                <Textarea value={novaContaForm.descritivo} onChange={(e) => setNovaContaForm({ ...novaContaForm, descritivo: e.target.value })} placeholder="Descrição da conta" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={novaContaForm.valor} onChange={(e) => setNovaContaForm({ ...novaContaForm, valor: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data do Lançamento</Label>
                  <Input type="date" value={novaContaForm.data} onChange={(e) => setNovaContaForm({ ...novaContaForm, data: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" value={novaContaForm.data_vencimento} onChange={(e) => setNovaContaForm({ ...novaContaForm, data_vencimento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Data de {novaContaDialog === "pagar" ? "Pagamento" : "Recebimento"}</Label>
                  <Input type="date" value={novaContaForm.data_pagamento} onChange={(e) => setNovaContaForm({ ...novaContaForm, data_pagamento: e.target.value })} />
                </div>
              </div>
              {novaContaDialog === "pagar" && (
                <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Parcelado?</Label>
                      <p className="text-xs text-muted-foreground">Gera as parcelas automaticamente (mensais).</p>
                    </div>
                    <Switch
                      checked={novaContaForm.parcelado}
                      onCheckedChange={(v) => setNovaContaForm({ ...novaContaForm, parcelado: v })}
                      disabled={!!novaContaForm.data_pagamento}
                    />
                  </div>
                  {novaContaForm.parcelado && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nº de Parcelas</Label>
                        <Input
                          type="number"
                          min={2}
                          max={60}
                          value={novaContaForm.num_parcelas}
                          onChange={(e) => setNovaContaForm({ ...novaContaForm, num_parcelas: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor por Parcela</Label>
                        <Input
                          readOnly
                          value={(() => {
                            const total = parseFloat(novaContaForm.valor) || 0;
                            const n = Math.max(1, parseInt(novaContaForm.num_parcelas) || 1);
                            return (total / n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                          })()}
                        />
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground">
                        1ª parcela vence em <strong>{novaContaForm.data_vencimento || novaContaForm.data || "—"}</strong>. Demais parcelas vencem mensalmente, no mesmo dia.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {novaContaDialog === "pagar" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Centro de Custo</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => setQuickAddCentroCusto(!quickAddCentroCusto)}>
                        <Plus className="h-3 w-3" /> Novo
                      </Button>
                    </div>
                    {quickAddCentroCusto ? (
                      <div className="flex gap-1">
                        <Input placeholder="Nome do centro..." value={quickAddCentroCustoNome} onChange={(e) => setQuickAddCentroCustoNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuickAddCentroCusto()} className="h-9" />
                        <Button size="sm" onClick={handleQuickAddCentroCusto} className="h-9"><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setQuickAddCentroCusto(false); setQuickAddCentroCustoNome(""); }} className="h-9"><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <Select value={novaContaForm.centro_custo} onValueChange={(v) => setNovaContaForm({ ...novaContaForm, centro_custo: v === "none" ? "" : v, subgrupo_custo: "" })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {centrosCusto.map((c) => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subgrupo</Label>
                      {novaContaForm.centro_custo && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => setQuickAddSubgrupoCusto(!quickAddSubgrupoCusto)}>
                          <Plus className="h-3 w-3" /> Novo
                        </Button>
                      )}
                    </div>
                    {quickAddSubgrupoCusto && novaContaForm.centro_custo ? (
                      <div className="flex gap-1">
                        <Input placeholder="Nome do subgrupo..." value={quickAddSubgrupoCustoNome} onChange={(e) => setQuickAddSubgrupoCustoNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuickAddSubgrupoCusto()} className="h-9" />
                        <Button size="sm" onClick={handleQuickAddSubgrupoCusto} className="h-9"><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setQuickAddSubgrupoCusto(false); setQuickAddSubgrupoCustoNome(""); }} className="h-9"><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <Select
                        value={novaContaForm.subgrupo_custo}
                        onValueChange={(v) => setNovaContaForm({ ...novaContaForm, subgrupo_custo: v === "none" ? "" : v })}
                        disabled={!novaContaForm.centro_custo}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={novaContaForm.centro_custo ? "Selecione (opcional)" : "Selecione centro"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {(() => {
                            const centroObj = centrosCusto.find((c) => c.nome === novaContaForm.centro_custo);
                            if (!centroObj) return null;
                            return subgruposCusto.filter((s) => s.centro_custo_id === centroObj.id).map((s) => (
                              <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Centro de Receita</Label>
                    <Select value={novaContaForm.centro_receita} onValueChange={(v) => setNovaContaForm({ ...novaContaForm, centro_receita: v === "none" ? "" : v, subgrupo_receita: "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {centrosReceita.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subgrupo</Label>
                    <Select
                      value={novaContaForm.subgrupo_receita}
                      onValueChange={(v) => setNovaContaForm({ ...novaContaForm, subgrupo_receita: v === "none" ? "" : v })}
                      disabled={!novaContaForm.centro_receita}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={novaContaForm.centro_receita ? "Selecione (opcional)" : "Selecione centro"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(() => {
                          const centroObj = centrosReceita.find((c) => c.nome === novaContaForm.centro_receita);
                          if (!centroObj) return null;
                          return subgruposReceita.filter((s) => s.centro_receita_id === centroObj.id).map((s) => (
                            <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovaContaDialog(null)}>Cancelar</Button>
              <Button onClick={handleSaveNovaConta}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <WhatsAppPagamentoDialog
          open={!!whatsappPagamento}
          onOpenChange={(v) => { if (!v) { setWhatsappPagamento(null); setSelectedContasPagar(new Set()); } }}
          conta={whatsappPagamento?.conta || null}
          contas={whatsappPagamento?.contas}
          vendaInfo={whatsappPagamento?.vendaInfo || null}
        />

        {/* Baixa Parcial Dialog */}
        <Dialog open={!!baixaDialog} onOpenChange={(v) => { if (!v) setBaixaDialog(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dar Baixa</DialogTitle>
            </DialogHeader>
            {baixaDialog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Valor Total</Label>
                    <p className="font-mono font-bold">{formatCurrency(baixaDialog.item.valor)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Já Pago</Label>
                    <p className="font-mono font-bold">{formatCurrency(baixaDialog.item.valor_pago || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Saldo Restante</Label>
                    <p className="font-mono font-bold">{formatCurrency(Number(baixaDialog.item.valor) - Number(baixaDialog.item.valor_pago || 0))}</p>
                  </div>
                </div>
                <div>
                  <Label>Valor desta baixa</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={baixaValor}
                    onChange={(e) => setBaixaValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setBaixaDialog(null)}>Cancelar</Button>
              <Button onClick={handleConfirmBaixa}>Confirmar Baixa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Vendas;
