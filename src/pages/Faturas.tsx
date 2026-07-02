import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Trash2, Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { generateClosingReport } from "@/lib/closingReport";
import { generateClosingReportExcel } from "@/lib/closingReportExcel";

interface Venda {
  id: string;
  numero_venda: number;
  cliente: string;
  data_venda: string;
  data_vencimento: string | null;
  valor_total: number;
  status: string;
  observacoes: string;
}

interface Fatura {
  id: string;
  numero_fatura: number;
  cliente: string;
  periodo_inicio: string;
  periodo_fim: string;
  data_emissao: string;
  data_vencimento: string | null;
  valor_total: number;
  observacoes: string;
  status: string;
  conta_receber_id: string | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export default function Faturas() {
  const { session } = useAuth();
  const [clientes, setClientes] = useState<string[]>([]);
  const [cliente, setCliente] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasJaFaturadas, setVendasJaFaturadas] = useState<Set<string>>(new Set());
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [vencimento, setVencimento] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClientes = useCallback(async () => {
    const [ag, cl] = await Promise.all([
      supabase.from("vendas").select("cliente"),
      supabase.from("clientes").select("nome").order("nome"),
    ]);
    const set = new Set<string>();
    (ag.data || []).forEach((r: any) => r.cliente && set.add(r.cliente));
    (cl.data || []).forEach((r: any) => r.nome && set.add(r.nome));
    setClientes([...set].sort());
  }, []);

  const loadFaturas = useCallback(async () => {
    const { data } = await supabase
      .from("faturas")
      .select("*")
      .order("numero_fatura", { ascending: false });
    if (data) setFaturas(data as Fatura[]);
  }, []);

  useEffect(() => {
    loadClientes();
    loadFaturas();
  }, [loadClientes, loadFaturas]);

  const buscarVendas = async () => {
    if (!cliente) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    setLoading(true);
    let q = supabase
      .from("vendas")
      .select("id, numero_venda, cliente, data_venda, data_vencimento, valor_total, status, observacoes")
      .eq("cliente", cliente)
      .order("data_venda", { ascending: true });
    if (dataInicio) q = q.gte("data_venda", dataInicio);
    if (dataFim) q = q.lte("data_venda", dataFim);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro ao buscar vendas", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (data || []) as Venda[];
    setVendas(list);

    // check which vendas already have fatura
    if (list.length > 0) {
      const { data: fv } = await supabase
        .from("fatura_vendas")
        .select("venda_id")
        .in("venda_id", list.map((v) => v.id));
      setVendasJaFaturadas(new Set((fv || []).map((r: any) => r.venda_id)));
    } else {
      setVendasJaFaturadas(new Set());
    }
    setSelecionadas(new Set());
    setLoading(false);
  };

  const toggleAll = () => {
    const disponiveis = vendas.filter((v) => !vendasJaFaturadas.has(v.id));
    if (selecionadas.size === disponiveis.length) setSelecionadas(new Set());
    else setSelecionadas(new Set(disponiveis.map((v) => v.id)));
  };

  const totalSelecionado = useMemo(() => {
    return vendas
      .filter((v) => selecionadas.has(v.id))
      .reduce((s, v) => s + Number(v.valor_total || 0), 0);
  }, [vendas, selecionadas]);

  const gerarFatura = async (format: "print" | "excel" | "ambos") => {
    if (!session?.user?.id) return;
    if (selecionadas.size === 0) {
      toast({ title: "Selecione ao menos uma venda", variant: "destructive" });
      return;
    }
    const vendasSel = vendas.filter((v) => selecionadas.has(v.id));
    const vendaIds = vendasSel.map((v) => v.id);
    const periodoIni = dataInicio || vendasSel.reduce((m, v) => (v.data_venda < m ? v.data_venda : m), vendasSel[0].data_venda);
    const periodoFim = dataFim || vendasSel.reduce((m, v) => (v.data_venda > m ? v.data_venda : m), vendasSel[0].data_venda);
    const valorTotal = vendasSel.reduce((s, v) => s + Number(v.valor_total || 0), 0);

    // fetch agenda items
    const { data: vi } = await supabase
      .from("venda_items")
      .select("venda_id, agenda_items:agenda_item_id(cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente)")
      .in("venda_id", vendaIds);
    const agendaItems = (vi || []).map((r: any) => r.agenda_items).filter(Boolean);

    // fetch extras
    const { data: ex } = await supabase
      .from("venda_extras")
      .select("venda_id, descricao, valor")
      .in("venda_id", vendaIds);
    const extras = (ex || []).map((e: any) => ({ descricao: e.descricao, valor: Number(e.valor) || 0 }));

    // insert fatura
    const { data: inserted, error } = await supabase
      .from("faturas")
      .insert({
        user_id: session.user.id,
        cliente,
        periodo_inicio: periodoIni,
        periodo_fim: periodoFim,
        data_vencimento: vencimento || null,
        valor_total: valorTotal,
        observacoes: obs || "",
      })
      .select("id, numero_fatura")
      .single();

    if (error || !inserted) {
      toast({ title: "Erro ao criar fatura", description: error?.message, variant: "destructive" });
      return;
    }

    const numero = inserted.numero_fatura;

    // link vendas
    await supabase.from("fatura_vendas").insert(
      vendaIds.map((vid) => ({ fatura_id: inserted.id, venda_id: vid }))
    );

    // Remove any existing CRs linked to these vendas — they get replaced by the consolidated fatura CR
    await supabase.from("contas_receber").delete().in("venda_id", vendaIds);

    // create consolidated CR
    const { data: cr } = await supabase
      .from("contas_receber")
      .insert({
        user_id: session.user.id,
        cliente,
        descritivo: `Fatura Nº ${numero} - ${formatDate(periodoIni)} a ${formatDate(periodoFim)}`,
        valor: valorTotal,
        data: new Date().toISOString().slice(0, 10),
        data_vencimento: vencimento || null,
        fatura_id: inserted.id,
      } as any)
      .select("id")
      .single();

    if (cr?.id) {
      await supabase.from("faturas").update({ conta_receber_id: cr.id }).eq("id", inserted.id);
    }

    const title = `Fatura Nº ${numero} - ${cliente}`;
    const args = [
      agendaItems,
      title,
      cliente,
      { cliente, observacoes: obs, valor_total: valorTotal, extras },
      numero,
    ] as const;

    if (format === "excel" || format === "ambos") generateClosingReportExcel(...args);
    if (format === "print" || format === "ambos") generateClosingReport(...args);

    toast({ title: `Fatura Nº ${numero} gerada com sucesso!` });
    setObs("");
    setVencimento("");
    setSelecionadas(new Set());
    await Promise.all([buscarVendas(), loadFaturas()]);
  };

  const excluirFatura = async (f: Fatura) => {
    if (!confirm(`Excluir Fatura Nº ${f.numero_fatura}? A Conta a Receber vinculada também será removida.`)) return;
    if (f.conta_receber_id) {
      await supabase.from("contas_receber").delete().eq("id", f.conta_receber_id);
    }
    await supabase.from("faturas").delete().eq("id", f.id);
    toast({ title: "Fatura excluída" });
    await Promise.all([loadFaturas(), buscarVendas()]);
  };

  const reimprimirFatura = async (f: Fatura, format: "print" | "excel") => {
    const { data: fv } = await supabase
      .from("fatura_vendas")
      .select("venda_id")
      .eq("fatura_id", f.id);
    const vendaIds = (fv || []).map((r: any) => r.venda_id);
    if (vendaIds.length === 0) {
      toast({ title: "Fatura sem vendas vinculadas", variant: "destructive" });
      return;
    }
    const { data: vi } = await supabase
      .from("venda_items")
      .select("agenda_items:agenda_item_id(cot, data, hora, tipo, origem, destino, pax, motorista, veiculo, placa, fornecedor, valor, custo, km_in, km_fim, km_extra, hora_in, hora_fim, hora_extra, estacionamento, outros, outros_despesas, cliente)")
      .in("venda_id", vendaIds);
    const agendaItems = (vi || []).map((r: any) => r.agenda_items).filter(Boolean);
    const { data: ex } = await supabase
      .from("venda_extras")
      .select("descricao, valor")
      .in("venda_id", vendaIds);
    const extras = (ex || []).map((e: any) => ({ descricao: e.descricao, valor: Number(e.valor) || 0 }));
    const args = [
      agendaItems,
      `Fatura Nº ${f.numero_fatura} - ${f.cliente}`,
      f.cliente,
      { cliente: f.cliente, observacoes: f.observacoes, valor_total: Number(f.valor_total), extras },
      f.numero_fatura,
    ] as const;
    if (format === "excel") generateClosingReportExcel(...args);
    else generateClosingReport(...args);
  };

  const disponiveis = vendas.filter((v) => !vendasJaFaturadas.has(v.id));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Faturas
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gerar Nova Fatura Agrupada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Cliente</Label>
                <Select value={cliente} onValueChange={setCliente}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={buscarVendas} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Buscar Vendas
                </Button>
              </div>
            </div>

            {vendas.length > 0 && (
              <>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={disponiveis.length > 0 && selecionadas.size === disponiveis.length}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Nº Venda</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendas.map((v) => {
                        const jaFaturada = vendasJaFaturadas.has(v.id);
                        return (
                          <TableRow key={v.id} className={jaFaturada ? "opacity-50" : ""}>
                            <TableCell>
                              <Checkbox
                                disabled={jaFaturada}
                                checked={selecionadas.has(v.id)}
                                onCheckedChange={(c) => {
                                  const next = new Set(selecionadas);
                                  if (c) next.add(v.id); else next.delete(v.id);
                                  setSelecionadas(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">#{v.numero_venda}</TableCell>
                            <TableCell>{formatDate(v.data_venda)}</TableCell>
                            <TableCell>{formatDate(v.data_vencimento)}</TableCell>
                            <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(Number(v.valor_total))}</TableCell>
                            <TableCell>
                              {jaFaturada
                                ? <Badge className="bg-amber-100 text-amber-900 border-amber-300">Já faturada</Badge>
                                : <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300">Disponível</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Vencimento da Fatura</Label>
                    <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Selecionadas:</span>{" "}
                    <strong>{selecionadas.size}</strong> venda(s) —{" "}
                    <span className="text-primary font-bold text-lg">{formatCurrency(totalSelecionado)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => gerarFatura("excel")} disabled={selecionadas.size === 0}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                    </Button>
                    <Button variant="outline" onClick={() => gerarFatura("print")} disabled={selecionadas.size === 0}>
                      <Printer className="h-4 w-4 mr-2" /> PDF
                    </Button>
                    <Button onClick={() => gerarFatura("ambos")} disabled={selecionadas.size === 0}>
                      <FileText className="h-4 w-4 mr-2" /> Gerar Fatura (PDF + Excel)
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturas Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            {faturas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura emitida ainda.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">#{f.numero_fatura}</TableCell>
                        <TableCell>{f.cliente}</TableCell>
                        <TableCell>{formatDate(f.periodo_inicio)} → {formatDate(f.periodo_fim)}</TableCell>
                        <TableCell>{formatDate(f.data_emissao)}</TableCell>
                        <TableCell>{formatDate(f.data_vencimento)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(Number(f.valor_total))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => reimprimirFatura(f, "print")} title="Reimprimir PDF">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => reimprimirFatura(f, "excel")} title="Baixar Excel">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => excluirFatura(f)} title="Excluir" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
