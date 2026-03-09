import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgendaItem, StatusFaturamento } from "@/data/agendaData";
import { MapPin, Phone, User, Truck, MessageCircle, Pencil, Trash2, Circle, Send, CheckCircle2, Users, Copy } from "lucide-react";
import WhatsAppDialog from "./WhatsAppDialog";
import WhatsAppFornecedorDialog from "./WhatsAppFornecedorDialog";
import EditServicoDialog from "./EditServicoDialog";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAgendaItem, updateAgendaItem, saveAgendaItem } from "@/data/cadastroStorage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgendaTableProps {
  items: AgendaItem[];
  onEdited?: () => void;
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

const tipoRowColor = (tipo: string): string => {
  const colors: Record<string, string> = {
    "Transfer In": "bg-blue-50 dark:bg-blue-950/30",
    "Transfer Out": "bg-emerald-50 dark:bg-emerald-950/30",
    "City Tour": "bg-amber-50 dark:bg-amber-950/30",
    "Translado": "bg-purple-50 dark:bg-purple-950/30",
    "Fretamento": "bg-rose-50 dark:bg-rose-950/30",
    "Coordenação": "bg-cyan-50 dark:bg-cyan-950/30",
    "Diária de 5h": "bg-orange-50 dark:bg-orange-950/30",
    "Diária de 10h": "bg-teal-50 dark:bg-teal-950/30",
    "Viagem": "bg-indigo-50 dark:bg-indigo-950/30",
    "Comissaria": "bg-pink-50 dark:bg-pink-950/30",
  };
  return colors[tipo] || "";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const AgendaTable = ({ items, onEdited }: AgendaTableProps) => {
  const [whatsappItem, setWhatsappItem] = useState<AgendaItem | null>(null);
  const [editItem, setEditItem] = useState<AgendaItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [fornecedorWhatsapp, setFornecedorWhatsapp] = useState<{ nome: string; items: AgendaItem[] } | null>(null);
  const { canViewFinancials } = useAuth();

  const handleDelete = () => {
    if (deleteItemId) {
      deleteAgendaItem(deleteItemId);
      setDeleteItemId(null);
      toast.success("Serviço excluído com sucesso!");
      onEdited?.();
    }
  };

  const handleClone = async (item: AgendaItem) => {
    try {
      const { id, ...rest } = item;
      await saveAgendaItem({ ...rest, cot: rest.cot ? `${rest.cot}-COPIA` : "" });
      toast.success("Serviço clonado! Abrindo para edição...");
      await onEdited?.();
      // Reload to get the new item, then open edit
      const { getAgendaItems } = await import("@/data/cadastroStorage");
      const allItems = await getAgendaItems();
      const cloned = allItems.find(i => i.cot === `${rest.cot}-COPIA` && i.data === rest.data && i.hora === rest.hora);
      if (cloned) setEditItem(cloned);
    } catch {
      toast.error("Erro ao clonar serviço");
    }
  };

  const cycleStatus = (item: AgendaItem) => {
    const order: StatusFaturamento[] = ["", "enviado", "faturado"];
    const current = order.indexOf(item.statusFaturamento || "");
    const next = order[(current + 1) % order.length];
    updateAgendaItem({ ...item, statusFaturamento: next });
    onEdited?.();
  };

  const statusIcon = (status: StatusFaturamento) => {
    switch (status) {
      case "enviado": return <Send className="h-4 w-4 text-amber-500" />;
      case "faturado": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: StatusFaturamento) => {
    switch (status) {
      case "enviado": return "Enviado";
      case "faturado": return "Faturado";
      default: return "Vazio";
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        Nenhum registro encontrado.
      </div>
    );
  }

  return (
    <>
    <WhatsAppDialog open={!!whatsappItem} onOpenChange={(v) => { if (!v) setWhatsappItem(null); }} item={whatsappItem} allItems={items} />
    <WhatsAppFornecedorDialog
      open={!!fornecedorWhatsapp}
      onOpenChange={(v) => { if (!v) setFornecedorWhatsapp(null); }}
      fornecedorNome={fornecedorWhatsapp?.nome || ""}
      items={fornecedorWhatsapp?.items || []}
    />
    <EditServicoDialog open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }} item={editItem} onSaved={() => onEdited?.()} />
    <div className="overflow-auto rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="whitespace-nowrap font-semibold">Data</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Hora</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Cliente</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-center">PAX</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Passageiro</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Voo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">COT</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Tipo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Origem</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Destino</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Placa</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Veículo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Motorista</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Telefone</TableHead>
            {canViewFinancials && (
              <>
                <TableHead className="whitespace-nowrap font-semibold text-right">Valor</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Fornecedor</TableHead>
                <TableHead className="whitespace-nowrap font-semibold text-right">Custo</TableHead>
              </>
            )}
            <TableHead className="whitespace-nowrap font-semibold">Receptivo</TableHead>
            <TableHead className="whitespace-nowrap font-semibold">Observações</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-center">Fat.</TableHead>
            <TableHead className="whitespace-nowrap font-semibold text-center">Ações</TableHead>
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
              <TableCell className="max-w-[180px]">
                {item.passageiros.length > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate text-sm">{item.passageiros[0].nome}</span>
                          {item.passageiros.length > 1 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                              +{item.passageiros.length - 1}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1">
                          {item.passageiros.map((p, idx) => (
                            <div key={idx} className="text-sm">
                              <strong>{p.nome}</strong> - {p.voo}
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {item.passageiros.length > 0 ? item.passageiros[0].voo : "—"}
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
                    onClick={() => setWhatsappItem(item)}
                    title="Enviar mensagem no WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </span>
              </TableCell>
              {canViewFinancials && (
                <>
                  <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold text-foreground">
                    {formatCurrency(item.valor)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="flex items-center gap-1">
                      {item.fornecedor}
                      {item.fornecedor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-accent hover:text-accent/80"
                          onClick={() => {
                            const fornecedorItems = items.filter(
                              (i) => i.fornecedor === item.fornecedor && i.data === item.data
                            );
                            setFornecedorWhatsapp({ nome: item.fornecedor, items: fornecedorItems });
                          }}
                          title="Enviar serviços do dia ao fornecedor via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-sm text-muted-foreground">
                    {formatCurrency(item.custo)}
                  </TableCell>
                </>
              )}
              <TableCell className="whitespace-nowrap text-sm">{item.receptivo || "—"}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={item.observacoes}>
                {item.observacoes || "—"}
              </TableCell>
              <TableCell className="text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => cycleStatus(item)}
                        title={statusLabel(item.statusFaturamento || "")}
                      >
                        {statusIcon(item.statusFaturamento || "")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{statusLabel(item.statusFaturamento || "")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setEditItem(item)}
                    title="Editar serviço"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-accent"
                    onClick={() => handleClone(item)}
                    title="Clonar serviço"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteItemId(item.id)}
                    title="Excluir serviço"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <AlertDialog open={!!deleteItemId} onOpenChange={(v) => { if (!v) setDeleteItemId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default AgendaTable;
