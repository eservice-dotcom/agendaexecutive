import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarDays, ListChecks, Truck, Building2, Plus, BarChart3, Printer, EyeOff, Eye, ShoppingCart, FileText, Search, Trash2, ClipboardList, Archive, FileSpreadsheet, X, DollarSign, ChevronDown, MessageCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo-executive-service.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import AgendaFilters from "@/components/AgendaFilters";
import AgendaTable from "@/components/AgendaTable";
import FaturamentoVeiculo from "@/components/FaturamentoVeiculo";
import FaturamentoFornecedor from "@/components/FaturamentoFornecedor";
import DashboardOcupacao from "@/components/DashboardOcupacao";
import NovoServicoDialog from "@/components/NovoServicoDialog";
import FechamentosConsulta from "@/components/FechamentosConsulta";
import { getAgendaItems } from "@/data/cadastroStorage";
import AgendaLixeira from "@/components/AgendaLixeira";
import { printAgenda } from "@/lib/printUtils";
import { generateClosingReport } from "@/lib/closingReport";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FiltersState {
  search: string;
  cliente: string;
  os: string;
  placa: string;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  fornecedor: string;
  motorista: string;
  veiculo: string;
  pax: string;
  sht: string;
  receptivo: string;
  statusFaturamento: string;
}

const initialFilters: FiltersState = {
  search: "",
  cliente: "",
  os: "",
  placa: "",
  dataInicio: "",
  dataFim: "",
  tipo: "",
  fornecedor: "",
  motorista: "",
  veiculo: "",
  pax: "",
  sht: "",
  receptivo: "",
  statusFaturamento: "",
};

const Index = () => {
  const navigate = useNavigate();
  const { canViewFinancials: hasPermission, signOut, session } = useAuth();
  const [showFinancials, setShowFinancials] = useState(true);
  const canViewFinancials = hasPermission && showFinancials;
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [cloneData, setCloneData] = useState<any | null>(null);
  const [agendaData, setAgendaData] = useState<any[]>([]);
  const [printWithFinancials, setPrintWithFinancials] = useState(true);
  const [activeTab, setActiveTab] = useState("agenda");

  // Fechamento dialog state
  const [fechamentoDialogOpen, setFechamentoDialogOpen] = useState(false);
  const [fechamentoCliente, setFechamentoCliente] = useState("");
  const [fechamentoAllClientes, setFechamentoAllClientes] = useState<string[]>([]);
  const [fechamentoItems, setFechamentoItems] = useState<any[]>([]);
  const [fechamentoSelected, setFechamentoSelected] = useState<Set<number>>(new Set());
  const [fechamentoExtras, setFechamentoExtras] = useState<{ descricao: string; valor: number; auto?: boolean; sourceId?: string }[]>([]);
  const [fechamentoExtrasSelected, setFechamentoExtrasSelected] = useState<Set<number>>(new Set());
  const [fechamentoNovoExtra, setFechamentoNovoExtra] = useState({ descricao: "", valor: "" });
  const [fechamentoSearch, setFechamentoSearch] = useState("");
  const [fechamentoDataInicio, setFechamentoDataInicio] = useState("");
  const [fechamentoDataFim, setFechamentoDataFim] = useState("");
  const [fechamentoReceptivo, setFechamentoReceptivo] = useState("");

  const reloadData = useCallback(async () => {
    const data = await getAgendaItems();
    setAgendaData(data);
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const motoristas = useMemo(
    () => [...new Set(agendaData.map((i) => i.motorista))].filter(Boolean).sort() as string[],
    [agendaData]
  );

  const tipos = useMemo(
    () => [...new Set(agendaData.map((i) => i.tipo))].filter(Boolean).sort() as string[],
    [agendaData]
  );

  const fornecedoresList = useMemo(
    () => [...new Set(agendaData.map((i) => i.fornecedor))].filter(Boolean).sort() as string[],
    [agendaData]
  );

  const veiculosList = useMemo(
    () => [...new Set(agendaData.map((i) => i.veiculo))].filter(Boolean).sort() as string[],
    [agendaData]
  );

  const filteredData = useMemo(() => {
    return agendaData
      .filter((item) => {
        const search = filters.search.toLowerCase();
        if (
          search &&
          !item.motorista.toLowerCase().includes(search) &&
          !item.origem.toLowerCase().includes(search) &&
          !item.destino.toLowerCase().includes(search)
        ) {
          return false;
        }
        if (filters.cliente && !item.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) return false;
        if (filters.os && item.cot.toLowerCase() !== filters.os.toLowerCase()) return false;
        if (filters.placa && !item.placa.toLowerCase().includes(filters.placa.toLowerCase())) return false;
        if (filters.dataInicio && item.data < filters.dataInicio) return false;
        if (filters.dataFim && item.data > filters.dataFim) return false;
        if (filters.tipo && item.tipo !== filters.tipo) return false;
        if (filters.fornecedor && item.fornecedor !== filters.fornecedor) return false;
        if (filters.motorista && item.motorista !== filters.motorista) return false;
        if (filters.veiculo && item.veiculo !== filters.veiculo) return false;
        if (filters.pax) {
          const paxSearch = filters.pax.toLowerCase();
          const hasMatch = item.passageiros.some(p => 
            p.nome.toLowerCase().includes(paxSearch) || 
            p.voo.toLowerCase().includes(paxSearch)
          );
          if (!hasMatch) return false;
        }
        if (filters.sht && !String(item.pax ?? "").includes(filters.sht.trim())) return false;
        if (filters.receptivo && !(item.receptivo || "").toLowerCase().includes(filters.receptivo.toLowerCase())) return false;
        if (filters.statusFaturamento) {
          const sf = item.statusFaturamento || item.status_faturamento || "";
          if (filters.statusFaturamento === "sem_status" && sf !== "") return false;
          if (filters.statusFaturamento !== "sem_status" && sf !== filters.statusFaturamento) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        return a.hora.localeCompare(b.hora);
      });
  }, [filters, agendaData]);

  const formatCurrencyLocal = (v: number) =>
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

  const buildAgendaExtrasFromItems = (items: any[]): { descricao: string; valor: number; auto?: boolean; sourceId?: string }[] => {
    return items.flatMap((item: any) => {
      const osLabel = item?.cot ? `O.S. ${item.cot}` : "Serviço";
      const sourceId = item?.id || item?.cot || osLabel;
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
        .map((d: any, i: number) => ({
          descricao: (d?.descricao || "").trim() || `Outros ${osLabel}`,
          valor: parseMoneyValue(d?.valor),
          auto: true,
          sourceId: `${sourceId}::despesa::${i}`,
        }))
        .filter((d) => d.valor > 0);

      const outrosValor = parseMoneyValue(item?.outros);
      const outrosExtra = outrosValor > 0 ? [{ descricao: `Outros ${osLabel}`, valor: outrosValor, auto: true, sourceId: `${sourceId}::outros` }] : [];

      const estacValor = parseMoneyValue(item?.estacionamento);
      const estacExtra = estacValor > 0 ? [{ descricao: `Estacionamento ${osLabel}`, valor: estacValor, auto: true, sourceId: `${sourceId}::estac` }] : [];

      return [...estacExtra, ...despesasExtras, ...outrosExtra];
    });
  };

  const formatDateLocal = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const handleOpenFechamento = async () => {
    if (fechamentoDialogOpen) {
      setFechamentoDialogOpen(false);
      return;
    }
    const { data } = await supabase.from("agenda_items").select("cliente").is("deleted_at", null).order("cliente");
    if (data) {
      setFechamentoAllClientes([...new Set(data.map((d) => d.cliente))].filter(Boolean).sort());
    }
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
    setActiveTab("fechamentos");
  };

  const handleFechamentoClienteChange = async (cli: string) => {
    setFechamentoCliente(cli);
    setFechamentoExtras([]);
    setFechamentoExtrasSelected(new Set());

    if (!cli) {
      setFechamentoItems([]);
      setFechamentoSelected(new Set());
      return;
    }

    const { data } = await supabase
      .from("agenda_items")
      .select("id, cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente, receptivo, status_faturamento")
      .eq("cliente", cli)
      .is("deleted_at", null)
      .order("data", { ascending: true });

    const items = (data || []).filter((item: any) => {
      const sf = item.status_faturamento;
      return sf === null || sf === undefined || sf === "";
    });
    setFechamentoItems(items);
    setFechamentoSelected(new Set(items.map((_: any, i: number) => i)));

    const agendaExtras = buildAgendaExtrasFromItems(items);
    setFechamentoExtras(agendaExtras);
    setFechamentoExtrasSelected(new Set(agendaExtras.map((_: any, i: number) => i)));
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

  // Recompute auto extras based on items currently visible AND selected (preserve manual extras + user deselections)
  useEffect(() => {
    const visibleIdxs = new Set(fechamentoFilteredItems.map(({ idx }: any) => idx));
    const activeItems = fechamentoItems.filter((_: any, i: number) => visibleIdxs.has(i) && fechamentoSelected.has(i));
    const newAutoExtras = buildAgendaExtrasFromItems(activeItems);

    setFechamentoExtras((prev) => {
      const manuais = prev.filter((e) => !e.auto);
      setFechamentoExtrasSelected((prevSel) => {
        const prevAutoExistedIds = new Set(prev.filter((e) => e.auto).map((e) => e.sourceId));
        const prevAutoSelectedIds = new Set(
          prev.map((e, i) => ({ e, i })).filter(({ e, i }) => e.auto && prevSel.has(i)).map(({ e }) => e.sourceId)
        );
        const prevManuaisIdxs = prev.map((_e, i) => i).filter((i) => !prev[i].auto);
        const next = new Set<number>();
        newAutoExtras.forEach((e, i) => {
          const wasDeselected = prevAutoExistedIds.has(e.sourceId) && !prevAutoSelectedIds.has(e.sourceId);
          if (!wasDeselected) next.add(i);
        });
        prevManuaisIdxs.forEach((origIdx, manualOrder) => {
          if (prevSel.has(origIdx)) next.add(newAutoExtras.length + manualOrder);
        });
        return next;
      });
      return [...newAutoExtras, ...manuais];
    });
  }, [fechamentoItems, fechamentoSelected, fechamentoFilteredItems]);

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
      await reloadData();
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
      toast.error("Erro ao salvar fechamento: " + error.message);
      return;
    }

    const numero = inserted?.numero_fechamento;

    // Save links
    if (ids.length > 0) {
      await supabase.from("fechamento_items").insert(
        ids.map((aid: string) => ({ fechamento_id: inserted.id || "", agenda_item_id: aid }))
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
    toast.success(`Fechamento Nº ${numero} salvo com sucesso!`);
    setFechamentoDialogOpen(false);
  };

  // Serviços sem status de faturamento, agrupados por receptivo.
  // Só alerta quando TODOS os serviços da última data (do receptivo) estão finalizados (horaFim preenchida).
  const finalizadosSemFechamento = useMemo(() => {
    const isFinalizado = (i: any) => {
      const hf = i.horaFim || i.hora_fim || "";
      return Boolean(hf && String(hf).trim());
    };
    const pending = agendaData.filter((i: any) => {
      const sf = i.statusFaturamento || i.status_faturamento || "";
      return !sf;
    });
    const byRecep = new Map<string, any[]>();
    pending.forEach((i: any) => {
      const r = (i.receptivo || "").trim() || "—";
      if (!byRecep.has(r)) byRecep.set(r, []);
      byRecep.get(r)!.push(i);
    });
    const result: any[] = [];
    byRecep.forEach((items) => {
      const maxDate = items.reduce((m, i) => (i.data > m ? i.data : m), items[0].data);
      const lastDateItems = items.filter((i) => i.data === maxDate);
      if (lastDateItems.every(isFinalizado)) {
        result.push(...items);
      }
    });
    return result;
  }, [agendaData]);

  const finalizadosPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    finalizadosSemFechamento.forEach((i: any) => {
      map.set(i.cliente, (map.get(i.cliente) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [finalizadosSemFechamento]);

  // Serviços do dia seguinte cujo motorista ainda não recebeu mensagem (WhatsApp).
  const motoristasSemMensagemAmanha = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowStr = `${yyyy}-${mm}-${dd}`;
    let messagedMap: Record<string, string> = {};
    try {
      const raw = localStorage.getItem("whatsapp_messaged_driver_v1");
      messagedMap = raw ? JSON.parse(raw) : {};
    } catch {}
    const pendentes = agendaData.filter((i: any) => {
      if (i.data !== tomorrowStr) return false;
      const motorista = (i.motorista || "").trim();
      if (!motorista) return false;
      const stored = messagedMap[i.id];
      return !(stored && stored === i.motorista);
    });
    const map = new Map<string, number>();
    pendentes.forEach((i: any) => {
      map.set(i.motorista, (map.get(i.motorista) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [agendaData]);

  const totalValor = filteredData.reduce((s, i) => s + i.valor, 0);
  const totalCusto = filteredData.reduce((s, i) => s + i.custo, 0);
  const totalExtras = filteredData.reduce((s, i) => {
    const estac = Number(i.estacionamento) || 0;
    const outros = (i.outrosDespesas || []).reduce((a, o) => a + (Number(o.valor) || 0), 0);
    return s + estac + outros;
  }, 0);
  const totalReceitaGeral = totalValor + totalExtras;

  return (
    <div className="min-h-screen bg-background">
       <header className="border-b border-primary/20 bg-foreground px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="Executive Service - Transportes e Eventos" className="h-10" />
          </Link>

          {/* Menu agrupado */}
          <nav className="flex flex-1 items-center gap-1 flex-wrap justify-end">
            {/* Operacional */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-primary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors outline-none">
                <CalendarDays className="h-4 w-4" /> Operacional <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => setActiveTab("agenda")} className="gap-2 cursor-pointer">
                  <CalendarDays className="h-4 w-4" /> Agenda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("fechamentos")} className="gap-2 cursor-pointer">
                  <Archive className="h-4 w-4" /> Fechamentos
                </DropdownMenuItem>
                {canViewFinancials && (
                  <DropdownMenuItem onClick={() => setActiveTab("ocupacao")} className="gap-2 cursor-pointer">
                    <BarChart3 className="h-4 w-4" /> Ocupação
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setActiveTab("lixeira")} className="gap-2 cursor-pointer">
                  <Trash2 className="h-4 w-4" /> Lixeira
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Comercial */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-primary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors outline-none">
                <FileText className="h-4 w-4" /> Comercial <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/cotacoes" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" /> Cotações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contratos" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" /> Contratos
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Financeiro */}
            {hasPermission && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-primary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors outline-none">
                  <DollarSign className="h-4 w-4" /> Financeiro <ChevronDown className="h-3 w-3 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/vendas" className="flex items-center gap-2 cursor-pointer">
                      <ShoppingCart className="h-4 w-4" /> Vendas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=receber" className="flex items-center gap-2 cursor-pointer">
                      <DollarSign className="h-4 w-4" /> Contas a Receber
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=pagar" className="flex items-center gap-2 cursor-pointer">
                      <DollarSign className="h-4 w-4" /> Contas a Pagar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=dashboard" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {canViewFinancials && (
                    <>
                      <DropdownMenuItem onClick={() => setActiveTab("fat-veiculo")} className="gap-2 cursor-pointer">
                        <Truck className="h-4 w-4" /> Fat. Veículo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setActiveTab("fat-fornecedor")} className="gap-2 cursor-pointer">
                        <Building2 className="h-4 w-4" /> Fat. Fornecedor
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Cadastros */}
            <Link
              to="/cadastros"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-primary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <ClipboardList className="h-4 w-4" /> Cadastros
            </Link>
          </nav>

          {/* Ações à direita */}
          <div className="flex items-center gap-2">
            {hasPermission && (
              <button
                onClick={() => setShowFinancials(!showFinancials)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-primary-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
                title={showFinancials ? "Ocultar financeiro" : "Mostrar financeiro"}
              >
                {showFinancials ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showFinancials ? "Ocultar $" : "Mostrar $"}
              </button>
            )}
            <div className="hidden sm:block h-6 w-px bg-primary-foreground/20" />
            <button
              onClick={signOut}
              className="px-3 py-1.5 rounded-md text-sm text-primary-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsContent value="agenda" className="space-y-4">
            {finalizadosSemFechamento.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {finalizadosSemFechamento.length} serviço(s) finalizado(s) aguardando envio do fechamento
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {finalizadosPorCliente.map(([cli, count]) => (
                      <button
                        key={cli}
                        onClick={async () => { setFechamentoDialogOpen(true); setActiveTab("fechamentos"); await handleFechamentoClienteChange(cli); }}
                        className="text-xs px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700 transition-colors"
                        title="Abrir fechamento deste cliente"
                      >
                        {cli} <span className="font-bold">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleOpenFechamento} className="shrink-0 gap-1.5 border-amber-400 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                  <FileText className="h-3.5 w-3.5" />
                  Fechamento
                </Button>
              </div>
            )}
            <div className={`grid gap-3 ${canViewFinancials ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-1'}`}>
              <StatCard label="Registros" value={filteredData.length.toString()} />
              {canViewFinancials && (
                <>
                  <StatCard label="Receita" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor)} accent />
                  <StatCard label="Extras" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalExtras)} />
                  <StatCard label="Total" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalReceitaGeral)} accent />
                  <StatCard label="Fornecedores" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCusto)} />
                  <StatCard label="Margem" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalReceitaGeral - totalCusto)} />
                </>
              )}
            </div>
            <AgendaFilters filters={filters} onFilterChange={setFilters} motoristas={motoristas} tipos={tipos} fornecedores={fornecedoresList} veiculos={veiculosList} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListChecks className="h-4 w-4" />
                <span>{filteredData.length} de {agendaData.length} registros</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={printWithFinancials} onChange={e => setPrintWithFinancials(e.target.checked)} className="rounded" />
                  Incluir financeiro
                </label>
                <Button variant="outline" size="sm" onClick={() => printAgenda(filteredData, printWithFinancials)} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("fechamentos")} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Fechamentos
                </Button>
                <Button onClick={() => setNovoDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Serviço
                </Button>
              </div>
            </div>
            <AgendaTable items={filteredData} onEdited={reloadData} hideFinancials={!showFinancials} onClone={(item) => { setCloneData(item); setNovoDialogOpen(true); }} />
            <NovoServicoDialog open={novoDialogOpen} onOpenChange={(v) => { setNovoDialogOpen(v); if (!v) setCloneData(null); }} onSaved={reloadData} initialData={cloneData} />
          </TabsContent>

          <TabsContent value="lixeira" className="space-y-4">
            <AgendaLixeira onRestored={reloadData} />
          </TabsContent>

          <TabsContent value="fechamentos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleOpenFechamento} variant={fechamentoDialogOpen ? "secondary" : "default"} className="gap-2">
                {fechamentoDialogOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {fechamentoDialogOpen ? "Fechar" : "Novo Fechamento"}
              </Button>
            </div>

            {fechamentoDialogOpen && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-semibold">Novo Relatório de Fechamento</h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Select value={fechamentoCliente} onValueChange={handleFechamentoClienteChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {fechamentoAllClientes.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
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
                    className="h-9"
                  />
                  <Input
                    type="date"
                    value={fechamentoDataFim}
                    onChange={(e) => setFechamentoDataFim(e.target.value)}
                    placeholder="Data fim"
                    className="h-9"
                  />
                  {fechamentoReceptivos.length > 0 && (
                    <Select value={fechamentoReceptivo} onValueChange={(v) => setFechamentoReceptivo(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9">
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
                </div>

                {fechamentoCliente && (
                  <>
                    {(() => {
                      const visibleIdxs = fechamentoFilteredItems.map(({ idx }: any) => idx);
                      const visibleSelectedCount = visibleIdxs.filter((i: number) => fechamentoSelected.has(i)).length;
                      const allVisibleSelected = visibleIdxs.length > 0 && visibleIdxs.every((i: number) => fechamentoSelected.has(i));
                      return (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{visibleSelectedCount} de {visibleIdxs.length} serviços selecionados</p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(checked) => {
                            const next = new Set(fechamentoSelected);
                            if (checked) visibleIdxs.forEach((i: number) => next.add(i));
                            else visibleIdxs.forEach((i: number) => next.delete(i));
                            setFechamentoSelected(next);
                          }}
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Selecionar todos</span>
                      </div>
                    </div>
                      );
                    })()}

                    <div className="border rounded-md divide-y max-h-[40vh] overflow-y-auto">
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
                              <span>{item.data ? formatDateLocal(item.data) : ""}</span>
                              <span className="mx-1">—</span>
                              <span>{item.tipo}</span>
                              <span className="mx-1">|</span>
                              <span className="text-muted-foreground">{item.origem} → {item.destino}</span>
                            </div>
                            <span className="text-xs font-mono">{formatCurrencyLocal(Number(item.valor) || 0)}</span>
                          </label>
                        ))
                      )}
                    </div>

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
                              <span className="text-xs font-mono">{formatCurrencyLocal(extra.valor)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFechamentoExtras(prev => prev.filter((_, i) => i !== idx));
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
                            setFechamentoExtras(prev => [...prev, { descricao: fechamentoNovoExtra.descricao.trim(), valor: parseMoneyValue(fechamentoNovoExtra.valor), auto: false }]);
                            setFechamentoExtrasSelected(prev => new Set([...prev, newIdx]));
                            setFechamentoNovoExtra({ descricao: "", valor: "" });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button onClick={() => handleGerarFechamento("excel")} disabled={fechamentoSelected.size === 0 || !fechamentoCliente} variant="outline" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                      <Button onClick={() => handleGerarFechamento("print")} disabled={fechamentoSelected.size === 0 || !fechamentoCliente} className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Gerar Relatório
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <FechamentosConsulta />
          </TabsContent>

          {canViewFinancials && (
            <>
              <TabsContent value="fat-veiculo">
                <FaturamentoVeiculo />
              </TabsContent>
              <TabsContent value="fat-fornecedor">
                <FaturamentoFornecedor />
              </TabsContent>
              <TabsContent value="ocupacao">
                <DashboardOcupacao />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={`mt-1 text-lg font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
  </div>
);

export default Index;
