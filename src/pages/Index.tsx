import { useState, useMemo, useCallback, useEffect } from "react";
import { CalendarDays, ListChecks, Truck, Building2, Plus, BarChart3, Printer, EyeOff, Eye, ShoppingCart, FileText, Search, Trash2, ClipboardList, Archive } from "lucide-react";
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
import FechamentosConsulta from "@/components/FechamentosConsulta";
import { getAgendaItems } from "@/data/cadastroStorage";
import { printAgenda } from "@/lib/printUtils";
import { generateClosingReport } from "@/lib/closingReport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      return [...despesasExtras, ...outrosExtra];
    });
  };

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

    if (!cli) {
      setFechamentoItems([]);
      setFechamentoSelected(new Set());
      return;
    }

    const { data } = await supabase
      .from("agenda_items")
      .select("id, cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente")
      .eq("cliente", cli)
      .order("data", { ascending: true });

    const items = data || [];
    setFechamentoItems(items);
    setFechamentoSelected(new Set(items.map((_: any, i: number) => i)));

    const agendaExtras = buildAgendaExtrasFromItems(items);
    setFechamentoExtras(agendaExtras);
    setFechamentoExtrasSelected(new Set(agendaExtras.map((_: any, i: number) => i)));
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

  const handleGerarFechamento = async () => {
    if (!fechamentoCliente) return;
    const selectedItems = fechamentoItems.filter((_: any, i: number) => fechamentoSelected.has(i));

    // Update status_faturamento to "enviado" for selected items
    const ids = selectedItems.map((item: any) => item.id).filter(Boolean);
    if (ids.length > 0) {
      await supabase.from("agenda_items").update({ status_faturamento: "enviado" }).in("id", ids);
      await reloadData();
    }

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

        {/* Fechamento Selection Dialog */}
        <Dialog open={fechamentoDialogOpen} onOpenChange={(v) => { if (!v) setFechamentoDialogOpen(false); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Relatório de Fechamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
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
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar O.S., origem, destino, data..."
                        value={fechamentoSearch}
                        onChange={(e) => setFechamentoSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
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
                  <p className="text-sm text-muted-foreground">{fechamentoSelected.size} de {fechamentoItems.length} serviços selecionados</p>

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
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFechamentoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleGerarFechamento} disabled={fechamentoSelected.size === 0 || !fechamentoCliente} className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Gerar Relatório
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
