import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgendaItem, StatusFaturamento } from "@/data/agendaData";
import { MapPin, Phone, User, Truck, MessageCircle, Pencil, Trash2, Circle, Send, CheckCircle2, Users, Copy, Palette, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    "Transfer In": "bg-sky-100/60 dark:bg-sky-900/20",
    "Transfer Out": "bg-lime-100/60 dark:bg-lime-900/20",
    "City Tour": "bg-yellow-100/60 dark:bg-yellow-900/20",
    "Translado": "bg-violet-100/60 dark:bg-violet-900/20",
    "Fretamento": "bg-rose-100/60 dark:bg-rose-900/20",
    "Coordenação": "bg-teal-100/60 dark:bg-teal-900/20",
    "Diária de 5h": "bg-amber-100/60 dark:bg-amber-900/20",
    "Diária de 10h": "bg-orange-100/60 dark:bg-orange-900/20",
    "Viagem": "bg-indigo-100/60 dark:bg-indigo-900/20",
    "Comissaria": "bg-pink-100/60 dark:bg-pink-900/20",
  };
  return colors[tipo] || "bg-gray-100/40 dark:bg-gray-900/20";
};

const manualColorOptions = [
  { value: "#dbeafe", label: "Azul" },
  { value: "#dcfce7", label: "Verde" },
  { value: "#fef9c3", label: "Amarelo" },
  { value: "#fce7f3", label: "Rosa" },
  { value: "#f3e8ff", label: "Lilás" },
  { value: "#ffedd5", label: "Laranja" },
  { value: "#e0f2fe", label: "Ciano" },
  { value: "#f1f5f9", label: "Cinza" },
  { value: "#fecaca", label: "Vermelho" },
  { value: "#d1fae5", label: "Menta" },
];

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
      const baseCot = rest.cot ? rest.cot.replace(/-COPIA.*$/, "") : "";
      await saveAgendaItem({ ...rest, cot: baseCot });
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

  const handleColorChange = (item: AgendaItem, color: string | undefined) => {
    updateAgendaItem({ ...item, corManual: color });
    onEdited?.();
  };

  const getRowBg = (item: AgendaItem): string | undefined => {
    return item.corManual || undefined;
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
    <div className="overflow-x-auto overflow-y-auto rounded-lg border border-border bg-card shadow-sm max-h-[70vh]">
      <table className="w-full caption-bottom text-[9px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '58px' }} />  {/* Data */}
          <col style={{ width: '34px' }} />  {/* Hora */}
          <col style={{ width: '72px' }} />  {/* Cliente */}
          <col style={{ width: '24px' }} />  {/* PAX */}
          <col style={{ width: '80px' }} /> {/* Passageiro */}
          <col style={{ width: '38px' }} />  {/* Voo */}
          <col style={{ width: '42px' }} />  {/* COT */}
          <col style={{ width: '58px' }} />  {/* Tipo */}
          <col style={{ width: '72px' }} />  {/* Origem */}
          <col style={{ width: '72px' }} />  {/* Destino */}
          <col style={{ width: '50px' }} />  {/* Placa */}
          <col style={{ width: '64px' }} />  {/* Veículo */}
          <col style={{ width: '64px' }} />  {/* Motorista */}
          <col style={{ width: '82px' }} /> {/* Telefone */}
          {canViewFinancials && (
            <>
              <col style={{ width: '58px' }} />  {/* Valor */}
              <col style={{ width: '64px' }} />  {/* Fornecedor */}
              <col style={{ width: '58px' }} />  {/* Custo */}
            </>
          )}
          <col style={{ width: '52px' }} />  {/* Receptivo */}
          <col style={{ width: '70px' }} />  {/* Observações */}
          <col style={{ width: '24px' }} />  {/* Fat. */}
          <col style={{ width: '68px' }} />  {/* Ações */}
        </colgroup>
        <TableHeader className="sticky top-0 z-30 bg-muted">
          <TableRow className="hover:bg-muted/50">
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] sticky left-0 z-20 bg-muted/95 backdrop-blur-sm">Data</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] sticky left-[58px] z-20 bg-muted/95 backdrop-blur-sm">Hora</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Cliente</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">PAX</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Passageiro</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Voo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">COT</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Tipo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Origem</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Destino</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Placa</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Veículo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Motorista</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Telefone</TableHead>
            {canViewFinancials && (
              <>
                <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-right">Valor</TableHead>
                <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Fornec.</TableHead>
                <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-right">Custo</TableHead>
              </>
            )}
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Recept.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Obs.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">Fat.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={item.id} className={`transition-colors hover:bg-primary/10 ${!item.corManual ? (!item.motorista ? 'bg-blue-200 dark:bg-blue-900/40' : idx % 2 === 1 ? 'bg-yellow-50/60 dark:bg-yellow-900/10' : tipoRowColor(item.tipo)) : ''}`} style={item.corManual ? { backgroundColor: item.corManual } : undefined}>
              <TableCell className={`px-0.5 py-0 font-mono text-[9px] truncate sticky left-0 z-10`} style={item.corManual ? { backgroundColor: item.corManual } : undefined} >{formatDate(item.data)}</TableCell>
              <TableCell className={`px-0.5 py-0 font-mono text-[9px] font-medium truncate sticky left-[58px] z-10`} style={item.corManual ? { backgroundColor: item.corManual } : undefined}>{item.hora}</TableCell>
              <TableCell className="px-0.5 py-0 font-medium text-[9px] truncate">{item.cliente}</TableCell>
              <TableCell className="px-0.5 py-0 text-center">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
                  {item.pax}
                </span>
              </TableCell>
              <TableCell className="px-0.5 py-0 truncate">
                {item.passageiros.length > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 cursor-help">
                          <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-[9px]">{item.passageiros[0].nome}</span>
                          {item.passageiros.length > 1 && (
                            <Badge variant="secondary" className="ml-0.5 h-3.5 px-0.5 text-[7px]">
                              +{item.passageiros.length - 1}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1">
                          {item.passageiros.map((p, idx) => (
                            <div key={idx} className="text-sm">
                              <strong>{p.nome}</strong> - {p.voo}{p.telefone ? ` | ${p.telefone}` : ""}
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="text-muted-foreground text-[9px]">—</span>
                )}
              </TableCell>
              <TableCell className="px-0.5 py-0 font-mono text-[8px] text-muted-foreground truncate">
                {item.passageiros.length > 0 ? item.passageiros[0].voo : "—"}
              </TableCell>
              <TableCell className="px-0.5 py-0 font-mono text-[8px] text-muted-foreground truncate">{item.cot}</TableCell>
              <TableCell className="px-0.5 py-0">
                <Badge variant={tipoBadgeVariant(item.tipo) as any} className="text-[7px] px-0.5 py-0">
                  {item.tipo}
                </Badge>
              </TableCell>
              <TableCell className="px-0.5 py-0 truncate text-[9px]" title={item.origem}>
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2 w-2 shrink-0 text-accent" />
                  <span className="truncate">{item.origem}</span>
                </span>
              </TableCell>
              <TableCell className="px-0.5 py-0 truncate text-[9px]" title={item.destino}>
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-2 w-2 shrink-0 text-destructive" />
                  <span className="truncate">{item.destino}</span>
                </span>
              </TableCell>
              <TableCell className="px-0.5 py-0 font-mono text-[8px] truncate">{item.placa}</TableCell>
              <TableCell className="px-0.5 py-0 text-[9px] truncate">
                <span className="flex items-center gap-0.5">
                  <Truck className="h-2 w-2 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.veiculo}</span>
                </span>
              </TableCell>
              <TableCell className="px-0.5 py-0 text-[9px] truncate">
                <span className="flex items-center gap-0.5">
                  <User className="h-2 w-2 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.motorista}</span>
                </span>
              </TableCell>
              <TableCell className="px-0.5 py-0 text-[9px]">
                <span className="flex items-center gap-0.5">
                  <Phone className="h-2 w-2 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.telefone}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-accent hover:text-accent/80 shrink-0"
                    onClick={() => setWhatsappItem(item)}
                    title="Enviar mensagem no WhatsApp"
                  >
                    <MessageCircle className="h-2.5 w-2.5" />
                  </Button>
                </span>
              </TableCell>
              {canViewFinancials && (
                <>
                  <TableCell className="px-0.5 py-0 text-right font-mono text-[9px] font-semibold text-foreground truncate">
                    {formatCurrency(item.valor)}
                  </TableCell>
                  <TableCell className="px-0.5 py-0 text-[9px] truncate">
                    <span className="flex items-center gap-0.5">
                      <span className="truncate">{item.fornecedor}</span>
                      {item.fornecedor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-accent hover:text-accent/80 shrink-0"
                          onClick={() => {
                            const fornecedorItems = items.filter(
                              (i) => i.fornecedor === item.fornecedor && i.data === item.data
                            );
                            setFornecedorWhatsapp({ nome: item.fornecedor, items: fornecedorItems });
                          }}
                          title="Enviar serviços do dia ao fornecedor via WhatsApp"
                        >
                          <MessageCircle className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-0.5 py-0 text-right font-mono text-[9px] text-muted-foreground truncate">
                    {formatCurrency(item.custo)}
                  </TableCell>
                </>
              )}
              <TableCell className="px-0.5 py-0 text-[9px] truncate">{item.receptivo || "—"}</TableCell>
              <TableCell className="px-0.5 py-0 truncate text-[9px] text-muted-foreground" title={item.observacoes}>
                {item.observacoes || "—"}
              </TableCell>
              <TableCell className="px-0.5 py-0 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
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
              <TableCell className="px-0.5 py-0 text-center">
                <span className="flex items-center justify-center gap-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        title="Mudar cor da linha"
                      >
                        <Palette className="h-2.5 w-2.5" style={item.corManual ? { color: item.corManual } : undefined} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="left">
                      <div className="grid grid-cols-5 gap-1">
                        {manualColorOptions.map((c) => (
                          <button
                            key={c.value}
                            className="h-5 w-5 rounded border border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                            onClick={() => handleColorChange(item, c.value)}
                          />
                        ))}
                      </div>
                      {item.corManual && (
                        <Button variant="ghost" size="sm" className="w-full mt-1 h-5 text-[9px]" onClick={() => handleColorChange(item, undefined)}>
                          <X className="h-2.5 w-2.5 mr-1" /> Remover cor
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setEditItem(item)}
                    title="Editar serviço"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-accent"
                    onClick={() => handleClone(item)}
                    title="Clonar serviço"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteItemId(item.id)}
                    title="Excluir serviço"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </table>
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
