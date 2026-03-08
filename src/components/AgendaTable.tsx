import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgendaItem } from "@/data/agendaData";
import { MapPin, Phone, User, Truck, MessageCircle } from "lucide-react";
import WhatsAppDialog from "./WhatsAppDialog";

interface AgendaTableProps {
  items: AgendaItem[];
}

const tipoBadgeVariant = (tipo: string) => {
  switch (tipo) {
    case "Transfer In": return "default";
    case "Transfer Out": return "secondary";
    case "City Tour": return "outline";
    case "Fretamento": return "destructive";
    default: return "secondary";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const AgendaTable = ({ items }: AgendaTableProps) => {
  const [whatsappItem, setWhatsappItem] = useState<AgendaItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        Nenhum registro encontrado.
      </div>
    );
  }

  return (
    <>
    <WhatsAppDialog open={!!whatsappItem} onOpenChange={(v) => { if (!v) setWhatsappItem(null); }} item={whatsappItem} />
    <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="whitespace-nowrap font-semibold">Data</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Hora</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Cliente</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-center">PAX</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">COT</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Tipo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Origem</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Destino</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Placa</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Veículo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Motorista</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Telefone</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-right">Valor</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Fornecedor</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-right">Custo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="transition-colors hover:bg-primary/5">
              <TableCell className="whitespace-nowrap font-mono text-sm">{formatDate(item.data)}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-sm font-medium">{item.hora}</TableCell>
              <TableCell className="whitespace-nowrap font-medium">{item.cliente}</TableCell>
              <TableCell className="text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.pax}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{item.cot}</TableCell>
              <TableCell>
                <Badge variant={tipoBadgeVariant(item.tipo) as any} className="whitespace-nowrap text-xs">
                  {item.tipo}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[160px] truncate text-sm" title={item.origem}>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 text-accent" />
                  {item.origem}
                </span>
              </TableCell>
              <TableCell className="max-w-[160px] truncate text-sm" title={item.destino}>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0 text-destructive" />
                  {item.destino}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{item.placa}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  {item.veiculo}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {item.motorista}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                <span className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {item.telefone}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-accent hover:text-accent/80"
                    onClick={() => {
                      const phone = item.telefone.replace(/\D/g, "");
                      const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
                      window.open(`https://wa.me/${phoneWithCountry}`, "_blank");
                    }}
                    title="Enviar mensagem no WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold text-foreground">
                {formatCurrency(item.valor)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">{item.fornecedor}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono text-sm text-muted-foreground">
                {formatCurrency(item.custo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AgendaTable;
