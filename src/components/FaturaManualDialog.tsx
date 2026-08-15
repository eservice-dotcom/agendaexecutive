import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { generateClosingReport } from "@/lib/closingReport";

interface ItemManual {
  descricao: string;
  quantidade: string;
  valor_unitario: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

const emptyItem = (): ItemManual => ({ descricao: "", quantidade: "1", valor_unitario: "" });

export default function FaturaManualDialog({ open, onOpenChange, onCreated }: Props) {
  const { session } = useAuth();
  const [clientes, setClientes] = useState<string[]>([]);
  const [cliente, setCliente] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
  const [vencimento, setVencimento] = useState("");
  const [centroReceita, setCentroReceita] = useState("");
  const [centros, setCentros] = useState<{ id: string; nome: string }[]>([]);
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<ItemManual[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [cl, cr] = await Promise.all([
      supabase.from("clientes").select("nome").order("nome"),
      supabase.from("centros_receita").select("id, nome").order("nome"),
    ]);
    setClientes((cl.data || []).map((c: any) => c.nome).filter(Boolean));
    setCentros((cr.data || []) as any);
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const updateItem = (i: number, patch: Partial<ItemManual>) => {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const itemTotal = (it: ItemManual) =>
    (parseFloat(it.quantidade) || 0) * (parseFloat(it.valor_unitario) || 0);

  const total = itens.reduce((s, it) => s + itemTotal(it), 0);

  const reset = () => {
    setCliente("");
    setDataEmissao(new Date().toISOString().slice(0, 10));
    setVencimento("");
    setCentroReceita("");
    setObs("");
    setItens([emptyItem()]);
  };

  const handleSalvar = async (imprimir: boolean) => {
    if (!session?.user?.id) return;
    if (!cliente) {
      toast({ title: "Selecione o cliente", variant: "destructive" });
      return;
    }
    const validos = itens.filter((it) => it.descricao.trim() && itemTotal(it) > 0);
    if (validos.length === 0) {
      toast({ title: "Inclua ao menos um item com descrição e valor", variant: "destructive" });
      return;
    }
    setSaving(true);

    const valorTotal = validos.reduce((s, it) => s + itemTotal(it), 0);

    const { data: inserted, error } = await supabase
      .from("faturas")
      .insert({
        user_id: session.user.id,
        cliente,
        periodo_inicio: dataEmissao,
        periodo_fim: dataEmissao,
        data_emissao: dataEmissao,
        data_vencimento: vencimento || null,
        valor_total: valorTotal,
        observacoes: obs || "",
      } as any)
      .select("id, numero_fatura")
      .single();

    if (error || !inserted) {
      toast({ title: "Erro ao criar fatura", description: error?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: cr, error: crError } = await supabase
      .from("contas_receber")
      .insert({
        user_id: session.user.id,
        cliente,
        descritivo: `Fatura Avulsa Nº ${inserted.numero_fatura} - ${validos
          .map((it) => `${it.descricao.trim()} (${parseFloat(it.quantidade) || 0}x)`)
          .join(" | ")}`,
        valor: valorTotal,
        data: dataEmissao,
        data_vencimento: vencimento || null,
        centro_receita: centroReceita || null,
        fatura_id: inserted.id,
      } as any)
      .select("id")
      .single();

    if (crError) {
      toast({ title: "Erro ao criar conta a receber", description: crError.message, variant: "destructive" });
    } else if (cr?.id) {
      await supabase.from("faturas").update({ conta_receber_id: cr.id }).eq("id", inserted.id);
    }

    if (imprimir) {
      const extras = validos.map((it) => ({
        descricao: `${it.descricao.trim()} — ${parseFloat(it.quantidade) || 0} x ${formatCurrency(
          parseFloat(it.valor_unitario) || 0
        )}`,
        valor: itemTotal(it),
      }));
      generateClosingReport(
        [],
        `Fatura Nº ${inserted.numero_fatura} - ${cliente}`,
        cliente,
        {
          cliente,
          observacoes: obs,
          valor_total: valorTotal,
          data_vencimento: vencimento || null,
          extras,
        },
        inserted.numero_fatura,
        "FATURA"
      );
    }

    toast({ title: `Fatura Avulsa Nº ${inserted.numero_fatura} criada!`, description: `Vencimento: ${formatDate(vencimento)}` });
    setSaving(false);
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Nova Fatura Avulsa (itens manuais)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Cliente *</Label>
              <Select value={cliente} onValueChange={setCliente}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Emissão</Label>
              <Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Centro de Receita</Label>
            <Select value={centroReceita} onValueChange={setCentroReceita}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {centros.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Qtd</TableHead>
                  <TableHead className="w-32">Valor Unit.</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        value={it.descricao}
                        onChange={(e) => updateItem(i, { descricao: e.target.value })}
                        placeholder="Descrição do serviço/item"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={it.quantidade}
                        onChange={(e) => updateItem(i, { quantidade: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={it.valor_unitario}
                        onChange={(e) => updateItem(i, { valor_unitario: e.target.value })}
                        placeholder="0,00"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(itemTotal(it))}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setItens((prev) => (prev.length === 1 ? [emptyItem()] : prev.filter((_, idx) => idx !== i)))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setItens((p) => [...p, emptyItem()])} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar Item
            </Button>
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="text-primary font-bold text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleSalvar(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
          <Button onClick={() => handleSalvar(true)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Salvar e Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
