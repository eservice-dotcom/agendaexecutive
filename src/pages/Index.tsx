import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarDays, ListChecks, Truck, Building2, Plus, BarChart3, Printer, EyeOff, Eye, ShoppingCart, FileText, Search, Trash2, ClipboardList, Archive, FileSpreadsheet, X, DollarSign, ChevronDown } from "lucide-react";
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
  pax: string;
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
  pax: "",
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
  const [fechamentoExtras, setFechamentoExtras] = useState<{ descricao: string; valor: number }[]>([]);
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
        if (filters.pax) {
          const paxSearch = filters.pax.toLowerCase();
          const hasMatch = item.passageiros.some(p => 
            p.nome.toLowerCase().includes(paxSearch) || 
            p.voo.toLowerCase().includes(paxSearch)
          );
          if (!hasMatch) return false;
        }
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

      const estacValor = parseMoneyValue(item?.estacionamento);
      const estacExtra = estacValor > 0 ? [{ descricao: `Estacionamento ${osLabel}`, valor: estacValor }] : [];

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
      .select("id, cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente, receptivo")
      .eq("cliente", cli)
      .eq("status_faturamento", "enviado")
      .is("deleted_at", null)
      .order("data", { ascending: true });

    const items = data || [];
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

  const totalValor = filteredData.reduce((s, i) => s + i.valor, 0);
  const totalCusto = filteredData.reduce((s, i) => s + i.custo, 0);

  return (
    <div className="min-h-screen bg-background">
       <header className="border-b border-border bg-foreground px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <img src={logo} alt="Executive Service - Transportes e Eventos" className="h-10" />
          <div className="flex items-center gap-4">
            
            {hasPermission && (
              <button
                onClick={() => setShowFinancials(!showFinancials)}
                className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground"
                title={showFinancials ? "Ocultar financeiro" : "Mostrar financeiro"}
              >
                {showFinancials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showFinancials ? "Ocultar $" : "Mostrar $"}
              </button>
            )}
            {hasPermission && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground outline-none">
                  <DollarSign className="h-4 w-4" /> Financeiro <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=receber" className="flex items-center gap-2 cursor-pointer">
                      Contas a Receber
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=pagar" className="flex items-center gap-2 cursor-pointer">
                      Contas a Pagar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/vendas?tab=dashboard" className="flex items-center gap-2 cursor-pointer">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            <Link to="/contratos">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <FileText className="h-4 w-4" /> Contratos
              </span>
            </Link>
            <Link to="/cadastros">
              <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                <ClipboardList className="h-4 w-4" /> Cadastros
              </span>
            </Link>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full sm:w-auto sm:inline-grid ${canViewFinancials ? 'grid-cols-6' : 'grid-cols-3'}`}>
            <TabsTrigger value="agenda" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="fechamentos" className="gap-2">
              <Archive className="h-4 w-4" />
              Fechamentos
            </TabsTrigger>
            <TabsTrigger value="lixeira" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Lixeira
            </TabsTrigger>
            {canViewFinancials && (
              <>
                <TabsTrigger value="fat-veiculo" className="gap-2">
                  <Truck className="h-4 w-4" />
                  Fat. Veículo
                </TabsTrigger>
                <TabsTrigger value="fat-fornecedor" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Fat. Fornecedor
                </TabsTrigger>
                <TabsTrigger value="ocupacao" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Ocupação
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="agenda" className="space-y-4">
            <div className={`grid gap-3 ${canViewFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
              <StatCard label="Registros" value={filteredData.length.toString()} />
              <StatCard label="Total PAX" value={filteredData.reduce((s, i) => s + i.pax, 0).toString()} />
              {canViewFinancials && (
                <>
                  <StatCard label="Receita" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor)} accent />
                  <StatCard label="Margem" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor - totalCusto)} />
                </>
              )}
            </div>
            <AgendaFilters filters={filters} onFilterChange={setFilters} motoristas={motoristas} tipos={tipos} fornecedores={fornecedoresList} />
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
                            setFechamentoExtras(prev => [...prev, { descricao: fechamentoNovoExtra.descricao.trim(), valor: parseMoneyValue(fechamentoNovoExtra.valor) }]);
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
