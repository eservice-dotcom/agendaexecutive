import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, RotateCcw, Search } from "lucide-react";

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

interface AgendaFiltersProps {
  filters: FiltersState;
  onFilterChange: (filters: FiltersState) => void;
  motoristas: string[];
  tipos: string[];
  fornecedores: string[];
}

const AgendaFilters = ({ filters, onFilterChange, motoristas, tipos, fornecedores }: AgendaFiltersProps) => {
  const updateFilter = (key: keyof FiltersState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
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
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Filtros</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7 gap-1 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10">
        <div className="relative xl:col-span-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Busca Geral</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Motorista, origem, destino..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cliente</label>
          <Input
            placeholder="Cliente"
            value={filters.cliente}
            onChange={(e) => updateFilter("cliente", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">O.S.</label>
          <Input
            placeholder="O.S."
            value={filters.os}
            onChange={(e) => updateFilter("os", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Placa</label>
          <Input
            placeholder="Placa"
            value={filters.placa}
            onChange={(e) => updateFilter("placa", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Início</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(e) => updateFilter("dataInicio", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(e) => updateFilter("dataFim", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Passageiro/Voo</label>
          <Input
            placeholder="Passageiro ou Voo"
            value={filters.pax}
            onChange={(e) => updateFilter("pax", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Receptivo</label>
          <Input
            placeholder="Receptivo"
            value={filters.receptivo}
            onChange={(e) => updateFilter("receptivo", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={filters.tipo || "all"} onValueChange={(v) => updateFilter("tipo", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
          <Select value={filters.fornecedor || "all"} onValueChange={(v) => updateFilter("fornecedor", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Motorista</label>
          <Select value={filters.motorista || "all"} onValueChange={(v) => updateFilter("motorista", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {motoristas.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status Faturamento</label>
          <Select value={filters.statusFaturamento || "all"} onValueChange={(v) => updateFilter("statusFaturamento", v === "all" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status Fat." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sem_status">Sem status</SelectItem>
              <SelectItem value="faturado">Faturado</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AgendaFilters;
