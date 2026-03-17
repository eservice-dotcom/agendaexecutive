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
      dataInicio: "",
      dataFim: "",
      tipo: "",
      fornecedor: "",
      motorista: "",
      pax: "",
      receptivo: "",
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, O.S., placa..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dataInicio}
            onChange={(e) => updateFilter("dataInicio", e.target.value)}
            className="pl-9"
            placeholder="Data início"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dataFim}
            onChange={(e) => updateFilter("dataFim", e.target.value)}
            className="pl-9"
            placeholder="Data fim"
          />
        </div>
        <Input
          placeholder="Passageiro ou Voo"
          value={filters.pax}
          onChange={(e) => updateFilter("pax", e.target.value)}
        />
        <Input
          placeholder="Receptivo"
          value={filters.receptivo}
          onChange={(e) => updateFilter("receptivo", e.target.value)}
        />
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
      </div>
    </div>
  );
};

export default AgendaFilters;
