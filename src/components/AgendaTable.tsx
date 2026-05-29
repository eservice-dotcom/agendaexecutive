import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgendaItem, StatusFaturamento } from "@/data/agendaData";
import { MapPin, Phone, User, Truck, MessageCircle, Pencil, Trash2, Circle, Send, CheckCircle2, Users, Copy, Palette, X, Lock, FileText, AlertTriangle, Paperclip } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import WhatsAppDialog from "./WhatsAppDialog";
import WhatsAppFornecedorDialog from "./WhatsAppFornecedorDialog";
import EditServicoDialog from "./EditServicoDialog";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAgendaItem, updateAgendaItem } from "@/data/cadastroStorage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateClosingReport } from "@/lib/closingReport";

interface AgendaTableProps {
  items: AgendaItem[];
  onEdited?: () => void;
  hideFinancials?: boolean;
  onClone?: (item: AgendaItem) => void;
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
  { value: "#3b82f6", label: "Azul" },
  { value: "#22c55e", label: "Verde" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#f43f5e", label: "Magenta" },
  { value: "#84cc16", label: "Lima" },
  { value: "#0ea5e9", label: "Celeste" },
  { value: "#d946ef", label: "Fúcsia" },
  { value: "#facc15", label: "Dourado" },
  { value: "#fb923c", label: "Pêssego" },
  { value: "#2dd4bf", label: "Menta" },
  { value: "#818cf8", label: "Índigo" },
  { value: "#f472b6", label: "Pink" },
  { value: "#94a3b8", label: "Cinza" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const getStatusFaturamento = (item: AgendaItem): StatusFaturamento =>
  (item.statusFaturamento || (item as any).status_faturamento || "") as StatusFaturamento;

const mapAgendaRow = (row: any): AgendaItem => ({
  id: row.id,
  data: row.data,
  hora: row.hora,
  cliente: row.cliente,
  pax: row.pax,
  passageiros: row.passageiros || [],
  cot: row.cot,
  tipo: row.tipo,
  origem: row.origem,
  destino: row.destino,
  placa: row.placa,
  veiculo: row.veiculo,
  motorista: row.motorista,
  telefone: row.telefone,
  valor: Number(row.valor) || 0,
  fornecedor: row.fornecedor,
  custo: Number(row.custo) || 0,
  observacoes: row.observacoes || "",
  receptivo: row.receptivo || "",
  statusFaturamento: (row.status_faturamento || "") as StatusFaturamento,
  corManual: row.cor_manual || undefined,
  kmIn: Number(row.km_in) || 0,
  kmFim: Number(row.km_fim) || 0,
  kmExtra: Number(row.km_extra) || 0,
  horaIn: row.hora_in || "",
  horaFim: row.hora_fim || "",
  estacionamento: Number(row.estacionamento) || 0,
  horaExtra: row.hora_extra || "",
  outrosDespesas: row.outros_despesas || [],
  formaContratacao: row.forma_contratacao || "",
});

const MESSAGED_STORAGE_KEY = "whatsapp_messaged_driver_v1";

const loadMessagedMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(MESSAGED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const AgendaTable = ({ items, onEdited, hideFinancials, onClone }: AgendaTableProps) => {
  const [whatsappItem, setWhatsappItem] = useState<AgendaItem | null>(null);
  const [editItem, setEditItem] = useState<AgendaItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [fornecedorWhatsapp, setFornecedorWhatsapp] = useState<{ nome: string; items: AgendaItem[] } | null>(null);
  const [messagedMap, setMessagedMap] = useState<Record<string, string>>(() => loadMessagedMap());
  const { canViewFinancials: hasFinancialPermission, session } = useAuth();
  const canViewFinancials = hasFinancialPermission && !hideFinancials;

  const markMessaged = useCallback((item: AgendaItem, consolidated?: AgendaItem[]) => {
    setMessagedMap((prev) => {
      const next = { ...prev };
      const list = consolidated && consolidated.length > 0 ? consolidated : [item];
      list.forEach((i) => {
        next[i.id] = i.motorista || "";
      });
      try { localStorage.setItem(MESSAGED_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isMessagedToCurrentDriver = useCallback((item: AgendaItem) => {
    const stored = messagedMap[item.id];
    return !!stored && stored === (item.motorista || "");
  }, [messagedMap]);

  const tryEditItem = useCallback(async (item: AgendaItem) => {
    if (!session?.user) return;
    // Clean stale locks (>5min)
    await supabase.from("editing_locks").delete().lt("locked_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
    // Check existing lock
    const { data: existing } = await supabase.from("editing_locks").select("*").eq("item_id", item.id).maybeSingle();
    if (existing && existing.user_id !== session.user.id) {
      toast.error(`Este serviço está sendo editado por ${existing.user_email || "outro usuário"}.`);
      return;
    }
    // Acquire lock
    if (!existing) {
      const { error } = await supabase.from("editing_locks").insert({
        item_id: item.id,
        user_id: session.user.id,
        user_email: session.user.email || "",
      });
      if (error) {
        toast.error("Este serviço está sendo editado por outro usuário.");
        return;
      }
    }
    setEditItem(item);
  }, [session]);

  const releaseLock = useCallback(async (itemId: string) => {
    if (!session?.user) return;
    await supabase.from("editing_locks").delete().eq("item_id", itemId).eq("user_id", session.user.id);
  }, [session]);

  const handleDelete = async () => {
    if (!deleteItemId) return;

    try {
      const itemId = deleteItemId;
      await deleteAgendaItem(itemId);
      setDeleteItemId(null);
      toast.success("Serviço excluído com sucesso!");
      await onEdited?.();
    } catch (e: any) {
      console.error("Erro ao excluir serviço:", e);
      toast.error("Erro ao excluir serviço: " + (e?.message || "tente novamente"));
    }
  };

  const handleClone = async (item: AgendaItem) => {
    if (!session?.user) return;
    try {
      const statusFaturamento = getStatusFaturamento(item);
      const { data: inserted, error } = await supabase
        .from("agenda_items")
        .insert({
          user_id: session.user.id,
          data: item.data,
          hora: item.hora,
          cliente: item.cliente,
          pax: item.pax,
          passageiros: item.passageiros as any,
          cot: item.cot,
          tipo: item.tipo,
          origem: item.origem,
          destino: item.destino,
          placa: item.placa,
          veiculo: item.veiculo,
          motorista: item.motorista,
          telefone: item.telefone,
          valor: item.valor,
          fornecedor: item.fornecedor,
          custo: item.custo,
          observacoes: item.observacoes,
          receptivo: item.receptivo || "",
          status_faturamento: statusFaturamento,
          cor_manual: item.corManual || null,
          km_in: item.kmIn || 0,
          km_fim: item.kmFim || 0,
          km_extra: item.kmExtra || 0,
          hora_in: item.horaIn || null,
          hora_fim: item.horaFim || null,
          estacionamento: item.estacionamento || 0,
          hora_extra: item.horaExtra || "",
          outros_despesas: item.outrosDespesas || [],
          forma_contratacao: item.formaContratacao || "",
        } as any)
        .select()
        .single();
      if (error) throw error;
      const newItem = mapAgendaRow(inserted);
      toast.success("Serviço clonado! Abrindo para edição...");
      await tryEditItem(newItem);
      onEdited?.();
    } catch (e: any) {
      console.error("Erro ao clonar:", e);
      toast.error("Erro ao clonar serviço: " + (e?.message || ""));
    }
  };

  const cycleStatus = (item: AgendaItem) => {
    const order: StatusFaturamento[] = ["", "enviado", "faturado"];
    const current = order.indexOf(getStatusFaturamento(item));
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
    <TooltipProvider delayDuration={200}>
    <>
    <WhatsAppDialog open={!!whatsappItem} onOpenChange={(v) => { if (!v) setWhatsappItem(null); }} item={whatsappItem} allItems={items} onSent={markMessaged} />
    <WhatsAppFornecedorDialog
      open={!!fornecedorWhatsapp}
      onOpenChange={(v) => { if (!v) setFornecedorWhatsapp(null); }}
      fornecedorNome={fornecedorWhatsapp?.nome || ""}
      items={fornecedorWhatsapp?.items || []}
    />
    <EditServicoDialog open={!!editItem} onOpenChange={(v) => { if (!v) { if (editItem) releaseLock(editItem.id); setEditItem(null); } }} item={editItem} onSaved={() => { if (editItem) releaseLock(editItem.id); onEdited?.(); }} />
    <div className="overflow-x-auto overflow-y-auto rounded-lg border border-border bg-card shadow-sm max-h-[70vh]">
      <table className="w-full caption-bottom text-[9px]" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '58px' }} />  {/* Data */}
          <col style={{ width: '34px' }} />  {/* Hora */}
          <col style={{ width: '72px' }} />  {/* Cliente */}
          <col style={{ width: '36px' }} />  {/* SHT */}
          <col style={{ width: '80px' }} /> {/* Passageiro */}
          <col style={{ width: '38px' }} />  {/* Voo */}
          <col style={{ width: '42px' }} />  {/* O.S. */}
          <col style={{ width: '58px' }} />  {/* Tipo */}
          <col style={{ width: '72px' }} />  {/* Origem */}
          <col style={{ width: '72px' }} />  {/* Destino */}
          <col style={{ width: '50px' }} />  {/* Placa */}
          <col style={{ width: '64px' }} />  {/* Veículo */}
          <col style={{ width: '90px' }} />  {/* Motorista */}
          <col style={{ width: '82px' }} /> {/* Telefone */}
          {canViewFinancials && (
            <col style={{ width: '58px' }} />
          )}
          <col style={{ width: '64px' }} />  {/* Fornecedor */}
          {canViewFinancials && (
            <col style={{ width: '58px' }} />
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
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">SHT</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Passageiro</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Voo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">O.S.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Tipo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Origem</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Destino</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Placa</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Veículo</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Motorista</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Telefone</TableHead>
            {canViewFinancials && (
              <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-right">Valor</TableHead>
            )}
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Fornec.</TableHead>
            {canViewFinancials && (
              <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-right">Custo</TableHead>
            )}
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Recept.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px]">Obs.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">Fat.</TableHead>
            <TableHead className="font-semibold px-0.5 py-0.5 text-[9px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => {
            const statusFaturamento = getStatusFaturamento(item);
            const kmDiff = (Number(item.kmFim) || 0) - (Number(item.kmIn) || 0);
            const horasTrab = (() => {
              if (!item.horaIn || !item.horaFim) return 0;
              const [h1, m1] = item.horaIn.split(":").map(Number);
              const [h2, m2] = item.horaFim.split(":").map(Number);
              if ([h1, m1, h2, m2].some((n) => isNaN(n))) return 0;
              let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
              if (diff < 0) diff += 24 * 60;
              return diff / 60;
            })();
            const warnKm = kmDiff > 100;
            const warnHoras = horasTrab > 10;
            const hasWarn = warnKm || warnHoras;
            const messaged = isMessagedToCurrentDriver(item);
            const messagedBg = '#bbf7d0'; // emerald-200
            const rowInlineBg = item.corManual || (messaged ? messagedBg : undefined);
            return (
            <TableRow key={item.id} className={`transition-colors hover:bg-primary/10 ${!rowInlineBg ? (idx % 2 === 1 ? 'bg-yellow-50/60 dark:bg-yellow-900/10' : tipoRowColor(item.tipo)) : ''}`} style={rowInlineBg ? { backgroundColor: rowInlineBg } : undefined} title={messaged ? `Mensagem enviada para ${item.motorista}` : undefined}>
              <TableCell className={`px-0.5 py-0 font-mono text-[9px] truncate sticky left-0 z-10`} style={rowInlineBg ? { backgroundColor: rowInlineBg } : undefined} >{formatDate(item.data)}</TableCell>
              <TableCell className={`px-0.5 py-0 font-mono text-[9px] font-medium truncate sticky left-[58px] z-10`} style={rowInlineBg ? { backgroundColor: rowInlineBg } : undefined}>{item.hora}</TableCell>
              <TableCell className="px-0.5 py-0 font-medium text-[9px] truncate">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate cursor-default inline-flex items-center gap-0.5">
                      {hasWarn && (
                        <AlertTriangle className="h-2.5 w-2.5 text-orange-500 shrink-0" />
                      )}
                      {item.cliente}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {item.cliente}
                    {warnKm && <div className="text-orange-500">⚠ {kmDiff.toFixed(0)} km rodados (acima de 100)</div>}
                    {warnHoras && <div className="text-orange-500">⚠ {horasTrab.toFixed(1)}h trabalhadas (acima de 10h)</div>}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0 text-center">
                <span className="inline-flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-black">
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
                <Tooltip>
                  <TooltipTrigger asChild><span className="truncate cursor-default">{item.passageiros.length > 0 ? item.passageiros[0].voo : "—"}</span></TooltipTrigger>
                  {item.passageiros.length > 0 && item.passageiros[0].voo && <TooltipContent side="top" className="text-xs">{item.passageiros[0].voo}</TooltipContent>}
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0 font-mono text-[8px] text-muted-foreground truncate">
                <Tooltip>
                  <TooltipTrigger asChild><span className="truncate cursor-default">{item.cot}</span></TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.cot}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0">
                <Badge variant={tipoBadgeVariant(item.tipo) as any} className="text-[7px] px-0.5 py-0">
                  {item.tipo}
                </Badge>
              </TableCell>
              <TableCell className="px-0.5 py-0 truncate text-[9px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
                      <MapPin className="h-2 w-2 shrink-0 text-accent" />
                      <span className="truncate">{item.origem}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.origem}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0 truncate text-[9px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
                      <MapPin className="h-2 w-2 shrink-0 text-destructive" />
                      <span className="truncate">{item.destino}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.destino}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0 font-mono text-[8px] truncate">
                <Tooltip>
                  <TooltipTrigger asChild><span className="truncate cursor-default">{item.placa}</span></TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.placa}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="px-0.5 py-0 text-[9px] truncate">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
                      <Truck className="h-2 w-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{item.veiculo}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.veiculo}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className={`px-0.5 py-0 text-[9px] ${!item.motorista ? 'bg-blue-200 dark:bg-blue-900/40' : ''}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
                      <User className="h-2 w-2 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[80px]">{item.motorista}</span>
                    </span>
                  </TooltipTrigger>
                  {item.motorista && (
                    <TooltipContent side="top" className="text-xs font-medium">
                      {item.motorista}
                    </TooltipContent>
                  )}
                </Tooltip>
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
                <TableCell className={`px-0.5 py-0 text-right font-mono text-[9px] font-semibold text-foreground truncate ${!item.valor ? 'bg-orange-200 dark:bg-orange-900/40' : ''}`}>
                  {formatCurrency(
                    item.valor +
                    (item.estacionamento || 0) +
                    (item.outrosDespesas || []).reduce((sum, d) => sum + (d.valor || 0), 0)
                  )}
                </TableCell>
              )}
              <TableCell className="px-0.5 py-0 text-[9px] truncate">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 cursor-default">
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
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{item.fornecedor}</TooltipContent>
                </Tooltip>
              </TableCell>
              {canViewFinancials && (
                <TableCell className={`px-0.5 py-0 text-right font-mono text-[9px] text-muted-foreground truncate ${!item.custo && !item.fornecedor.toLowerCase().includes("executive") && !(item.motorista && items.some(other => other.motorista === item.motorista && other.data === item.data && (other as any).formaContratacao === 'diaria')) ? 'bg-orange-200 dark:bg-orange-900/40' : ''}`}>
                  {formatCurrency(item.custo)}
                </TableCell>
              )}
              <TableCell className="px-0.5 py-0 text-[9px] truncate">
                {(() => {
                  const anexos = [
                    ...(item.placaReceptivoUrl ? [item.placaReceptivoUrl] : []),
                    ...((item.placaReceptivoUrls || []) as string[]),
                  ];
                  const unicos = [...new Set(anexos)];
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate cursor-default inline-flex items-center gap-0.5">
                          {unicos.length > 0 && (
                            <a href={unicos[0]} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary shrink-0" title={`${unicos.length} anexo(s)`}>
                              <Paperclip className="h-2.5 w-2.5" />
                              {unicos.length > 1 && <span className="text-[7px] font-bold ml-0.5">{unicos.length}</span>}
                            </a>
                          )}
                          <span className="truncate">{item.receptivo || (unicos.length > 0 ? "" : "—")}</span>
                        </span>
                      </TooltipTrigger>
                      {(item.receptivo || unicos.length > 0) && (
                        <TooltipContent side="top" className="text-xs">
                          {item.receptivo}
                          {unicos.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {unicos.map((u, i) => (
                                <div key={u + i}>
                                  <a href={u} target="_blank" rel="noreferrer" className="underline">Anexo {i + 1}</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })()}
              </TableCell>

              <TableCell className="px-0.5 py-0 truncate text-[9px] text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild><span className="truncate cursor-default">{item.observacoes || "—"}</span></TooltipTrigger>
                  {item.observacoes && <TooltipContent side="top" className="text-xs max-w-sm whitespace-pre-wrap">{item.observacoes}</TooltipContent>}
                </Tooltip>
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
                        title={statusLabel(statusFaturamento)}
                      >
                        {statusIcon(statusFaturamento)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{statusLabel(statusFaturamento)}</TooltipContent>
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
                      <div className="grid grid-cols-5 gap-1.5">
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
                    onClick={() => tryEditItem(item)}
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
                    className="h-4 w-4 p-0 text-muted-foreground hover:text-primary"
                    onClick={async () => {
                      await supabase.from("agenda_items").update({ status_faturamento: "enviado" }).eq("id", item.id);
                      const osLabel = item.cot ? `O.S. ${item.cot}` : "Serviço";
                      const despesasExtras = ((item.outrosDespesas || []) as any[])
                        .map((d) => ({
                          descricao: (d?.descricao || "").trim() || `Outros ${osLabel}`,
                          valor: Number(d?.valor) || 0,
                        }))
                        .filter((d) => d.valor > 0);
                      const estacValor = Number(item.estacionamento) || 0;
                      const reportExtras = [
                        ...(estacValor > 0 ? [{ descricao: `Estacionamento ${osLabel}`, valor: estacValor }] : []),
                        ...despesasExtras,
                      ];
                      generateClosingReport(
                        [{
                          cot: item.cot, data: item.data, hora: item.hora, tipo: item.tipo,
                          origem: item.origem, destino: item.destino, pax: item.pax,
                          motorista: item.motorista, veiculo: item.veiculo, placa: item.placa,
                          fornecedor: item.fornecedor, valor: item.valor, custo: item.custo,
                          km_in: item.kmIn, km_fim: item.kmFim, km_extra: item.kmExtra,
                          hora_in: item.horaIn, hora_fim: item.horaFim, hora_extra: item.horaExtra,
                          estacionamento: item.estacionamento,
                          outros_despesas: item.outrosDespesas, cliente: item.cliente,
                        }],
                        `Fechamento - ${item.cot}`,
                        `O.S. ${item.cot} — ${item.cliente}`,
                        { cliente: item.cliente, extras: reportExtras }
                      );
                      ((item.comprovanteEstacionamentoUrls || []) as string[]).forEach((u) => window.open(u, "_blank"));
                      onEdited();
                    }}
                    title="Relatório de Fechamento"
                  >
                    <FileText className="h-2.5 w-2.5" />
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
          )})}
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
    </TooltipProvider>
  );
};

export default AgendaTable;
