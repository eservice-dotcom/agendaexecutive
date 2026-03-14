import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarDays, ListChecks, Truck, Building2, Plus, BarChart3, Printer, EyeOff, Eye, ShoppingCart, FileText, Search, Trash2, ClipboardList } from "lucide-react";
import logo from "@/assets/logo-executive-service.png";
import { Link } from "react-router-dom";
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
import { getAgendaItems } from "@/data/cadastroStorage";
import { printAgenda } from "@/lib/printUtils";
import { generateClosingReport } from "@/lib/closingReport";
import { supabase } from "@/integrations/supabase/client";


interface FiltersState {
  search: string;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  fornecedor: string;
  motorista: string;
  pax: string;
  receptivo: string;
}

const initialFilters: FiltersState = {
  search: "",
  dataInicio: "",
  dataFim: "",
  tipo: "",
  fornecedor: "",
  motorista: "",
  pax: "",
  receptivo: "",
};

const Index = () => {
  const { canViewFinancials: hasPermission, signOut } = useAuth();
  const [showFinancials, setShowFinancials] = useState(true);
  const canViewFinancials = hasPermission && showFinancials;
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [cloneData, setCloneData] = useState<any | null>(null);
  const [agendaData, setAgendaData] = useState<any[]>([]);
  const [printWithFinancials, setPrintWithFinancials] = useState(true);

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
          !item.cliente.toLowerCase().includes(search) &&
          !item.cot.toLowerCase().includes(search) &&
          !item.placa.toLowerCase().includes(search) &&
          !item.motorista.toLowerCase().includes(search) &&
          !item.origem.toLowerCase().includes(search) &&
          !item.destino.toLowerCase().includes(search)
        ) {
          return false;
        }
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
  const formatDateLocal = (d: string) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const handleOpenFechamento = async () => {
    const { data } = await supabase.from("agenda_items").select("cliente").order("cliente");
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
    setFechamentoDialogOpen(true);
  };

  const handleFechamentoClienteChange = async (cli: string) => {
    setFechamentoCliente(cli);
    setFechamentoExtras([]);
    setFechamentoExtrasSelected(new Set());
    if (!cli) { setFechamentoItems([]); setFechamentoSelected(new Set()); return; }
    const { data } = await supabase
      .from("agenda_items")
      .select("cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente")
      .eq("cliente", cli)
      .order("data", { ascending: true });
    const items = data || [];
    setFechamentoItems(items);
    setFechamentoSelected(new Set(items.map((_: any, i: number) => i)));
  };

  const fechamentoFilteredItems = useMemo(() => {
    const mapped = fechamentoItems.map((item: any, idx: number) => ({ item, idx }));
    if (!fechamentoSearch) return mapped;
    const s = fechamentoSearch.toLowerCase();
    return mapped.filter(({ item }) =>
      (item.cot || "").toLowerCase().includes(s) ||
      (item.origem || "").toLowerCase().includes(s) ||
      (item.destino || "").toLowerCase().includes(s) ||
      (item.data || "").includes(s) ||
      (item.tipo || "").toLowerCase().includes(s)
    );
  }, [fechamentoItems, fechamentoSearch]);

  const handleGerarFechamento = () => {
    if (!fechamentoCliente) return;
    const selectedItems = fechamentoItems.filter((_: any, i: number) => fechamentoSelected.has(i));
    generateClosingReport(
      selectedItems,
      `Fechamento - ${fechamentoCliente}`,
      fechamentoCliente,
      {
        cliente: fechamentoCliente,
        extras: fechamentoExtras.filter((_, i) => fechamentoExtrasSelected.has(i)),
      }
    );
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
              <Link to="/vendas">
                <span className="flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground">
                  <ShoppingCart className="h-4 w-4" /> Vendas
                </span>
              </Link>
            )}
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
        <Tabs defaultValue="agenda" className="space-y-4">
          <TabsList className={`grid w-full sm:w-auto sm:inline-grid ${canViewFinancials ? 'grid-cols-4' : 'grid-cols-1'}`}>
            <TabsTrigger value="agenda" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Agenda
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
                <Button variant="outline" size="sm" onClick={handleOpenFechamento} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Fechamento
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
