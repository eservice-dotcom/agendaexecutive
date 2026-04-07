import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeletedItem {
  id: string;
  data: string;
  hora: string;
  cliente: string;
  cot: string;
  tipo: string;
  origem: string;
  destino: string;
  motorista: string;
  deleted_at: string;
}

interface AgendaLixeiraProps {
  onRestored?: () => void;
}

const AgendaLixeira = ({ onRestored }: AgendaLixeiraProps) => {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("agenda_items")
      .select("id, data, hora, cliente, cot, tipo, origem, destino, motorista, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar lixeira:", error);
      return;
    }
    setItems((data as any) || []);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from("agenda_items")
      .update({ deleted_at: null } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao restaurar item");
      return;
    }
    toast.success("Item restaurado com sucesso!");
    await loadItems();
    onRestored?.();
  };

  const handlePermanentDelete = async (id: string) => {
    const { error } = await supabase.from("agenda_items").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir permanentemente");
      return;
    }
    toast.success("Item excluído permanentemente!");
    setConfirmDeleteId(null);
    await loadItems();
  };

  const handleEmptyTrash = async () => {
    const ids = items.map(i => i.id);
    if (ids.length === 0) return;

    const { error } = await supabase
      .from("agenda_items")
      .delete()
      .not("deleted_at", "is", null);
    if (error) {
      toast.error("Erro ao esvaziar lixeira");
      return;
    }
    toast.success("Lixeira esvaziada!");
    setConfirmDeleteAll(false);
    await loadItems();
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatDateTime = (dt: string) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString("pt-BR");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "itens"} na lixeira
        </p>
        {items.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteAll(true)} className="gap-1">
            <Trash2 className="h-4 w-4" /> Esvaziar Lixeira
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>O.S.</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem → Destino</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Excluído em</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  A lixeira está vazia.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.data)}</TableCell>
                  <TableCell>{item.hora}</TableCell>
                  <TableCell>{item.cot}</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.tipo}</TableCell>
                  <TableCell>{item.origem} → {item.destino}</TableCell>
                  <TableCell>{item.motorista}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(item.deleted_at)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" title="Restaurar" onClick={() => handleRestore(item.id)}>
                        <RotateCcw className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir permanentemente" onClick={() => setConfirmDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O item será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esvaziar lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {items.length} itens serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmptyTrash}>
              Esvaziar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendaLixeira;
