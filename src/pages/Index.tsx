import { useState, useMemo } from "react";
import { CalendarDays, ListChecks, Truck, Building2 } from "lucide-react";
import logo from "@/assets/logo-executive-service.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgendaFilters from "@/components/AgendaFilters";
import AgendaTable from "@/components/AgendaTable";
import FaturamentoVeiculo from "@/components/FaturamentoVeiculo";
import FaturamentoFornecedor from "@/components/FaturamentoFornecedor";
import { mockData } from "@/data/agendaData";

interface FiltersState {
  search: string;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  fornecedor: string;
  motorista: string;
}

const initialFilters: FiltersState = {
  search: "",
  dataInicio: "",
  dataFim: "",
  tipo: "",
  fornecedor: "",
  motorista: "",
};

const Index = () => {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const motoristas = useMemo(
    () => [...new Set(mockData.map((i) => i.motorista))],
    []
  );

  const filteredData = useMemo(() => {
    return mockData.filter((item) => {
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
      return true;
    });
  }, [filters]);

  const totalValor = filteredData.reduce((s, i) => s + i.valor, 0);
  const totalCusto = filteredData.reduce((s, i) => s + i.custo, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Agenda de Transportes</h1>
            <p className="text-sm text-muted-foreground">Gestão e acompanhamento de serviços</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="agenda" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="agenda" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="fat-veiculo" className="gap-2">
              <Truck className="h-4 w-4" />
              Fat. Veículo
            </TabsTrigger>
            <TabsTrigger value="fat-fornecedor" className="gap-2">
              <Building2 className="h-4 w-4" />
              Fat. Fornecedor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Registros" value={filteredData.length.toString()} />
              <StatCard label="Total PAX" value={filteredData.reduce((s, i) => s + i.pax, 0).toString()} />
              <StatCard label="Receita" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor)} accent />
              <StatCard label="Margem" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValor - totalCusto)} />
            </div>
            <AgendaFilters filters={filters} onFilterChange={setFilters} motoristas={motoristas} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              <span>{filteredData.length} de {mockData.length} registros</span>
            </div>
            <AgendaTable items={filteredData} />
          </TabsContent>

          <TabsContent value="fat-veiculo">
            <FaturamentoVeiculo />
          </TabsContent>

          <TabsContent value="fat-fornecedor">
            <FaturamentoFornecedor />
          </TabsContent>
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
