import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast, Toaster } from "sonner";
import { Plus, CheckCircle, DollarSign, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mobile-contas`;

interface ContaPagar {
  id: string;
  fornecedor: string;
  descritivo: string;
  valor: number;
  valor_pago: number;
  data: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  placa: string;
  centro_custo: string | null;
  subgrupo_custo: string | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const MobileContas = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [view, setView] = useState<"list" | "new">("list");
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<{ id: string; nome: string }[]>([]);
  const [subgrupos, setSubgrupos] = useState<{ id: string; nome: string; centro_custo_id: string }[]>([]);
  const [veiculos, setVeiculos] = useState<{ placa: string; modelo: string }[]>([]);

  const [fornecedor, setFornecedor] = useState("");
  const [descritivo, setDescritivo] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [centroCusto, setCentroCusto] = useState("");
  const [subgrupoCusto, setSubgrupoCusto] = useState("");
  const [placa, setPlaca] = useState("");

  // Baixa dialog
  const [baixaDialog, setBaixaDialog] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [valorBaixa, setValorBaixa] = useState("");
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().split("T")[0]);

  const [authError, setAuthError] = useState(false);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${API_BASE}${path}${sep}token=${token}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    if (res.status === 401) {
      setAuthError(true);
      throw new Error("Token inválido");
    }
    return res.json();
  }, [token]);

  const loadContas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("");
      setContas(data);
    } catch {
      // handled
    }
    setLoading(false);
  }, [apiFetch]);

  const loadSelects = useCallback(async () => {
    try {
      const [f, c, s, v] = await Promise.all([
        apiFetch("?action=fornecedores"),
        apiFetch("?action=centros_custo"),
        apiFetch("?action=subgrupos_custo"),
        apiFetch("?action=veiculos"),
      ]);
      setFornecedores(f.map((x: any) => x.razao_social));
      setCentrosCusto(c);
      setSubgrupos(s);
      setVeiculos(v);
    } catch {
      // handled
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    loadContas();
    loadSelects();
  }, [token, loadContas, loadSelects]);

  const handleCreate = async () => {
    if (!fornecedor || !valor) {
      toast.error("Fornecedor e valor são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          fornecedor,
          descritivo,
          valor: parseFloat(valor),
          data_vencimento: dataVencimento || null,
          centro_custo: centroCusto,
          subgrupo_custo: subgrupoCusto,
          placa,
        }),
      });
      toast.success("Conta criada com sucesso!");
      setFornecedor(""); setDescritivo(""); setValor(""); setDataVencimento("");
      setCentroCusto(""); setSubgrupoCusto(""); setPlaca("");
      setView("list");
      loadContas();
    } catch {
      toast.error("Erro ao criar conta");
    }
    setSaving(false);
  };

  const handleBaixa = async () => {
    if (!selectedConta) return;
    setSaving(true);
    try {
      await apiFetch("", {
        method: "POST",
        body: JSON.stringify({
          action: "baixa",
          id: selectedConta.id,
          valor_pago: parseFloat(valorBaixa) || selectedConta.valor - selectedConta.valor_pago,
          data_pagamento: dataBaixa,
        }),
      });
      toast.success("Baixa realizada com sucesso!");
      setBaixaDialog(false);
      setSelectedConta(null);
      loadContas();
    } catch {
      toast.error("Erro ao dar baixa");
    }
    setSaving(false);
  };

  const openBaixa = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setValorBaixa(String(conta.valor - conta.valor_pago));
    setDataBaixa(new Date().toISOString().split("T")[0]);
    setBaixaDialog(true);
  };

  const filteredSubgrupos = subgrupos.filter((s) => {
    if (!centroCusto) return true;
    const centro = centrosCusto.find((c) => c.nome === centroCusto);
    return centro ? s.centro_custo_id === centro.id : true;
  });

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Toaster richColors position="top-center" />
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-3">
            <DollarSign className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-bold">Acesso Negado</h2>
            <p className="text-sm text-muted-foreground">
              Token inválido ou expirado. Solicite um novo link de acesso ao administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {view === "new" && (
            <Button variant="ghost" size="icon" onClick={() => setView("list")} className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <DollarSign className="h-5 w-5" />
          <span className="font-semibold text-sm">Contas a Pagar</span>
        </div>
        <div className="flex gap-2">
          {view === "list" && (
            <>
              <Button variant="ghost" size="icon" onClick={loadContas} className="text-primary-foreground">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setView("new")} className="gap-1">
                <Plus className="h-4 w-4" /> Nova
              </Button>
            </>
          )}
        </div>
      </div>

      {/* List view */}
      {view === "list" && (
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : contas.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                Nenhuma conta pendente encontrada.
              </CardContent>
            </Card>
          ) : (
            contas.map((conta) => (
              <Card key={conta.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{conta.fornecedor}</p>
                      {conta.descritivo && (
                        <p className="text-xs text-muted-foreground truncate">{conta.descritivo}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      conta.status === "pendente" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {conta.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Valor: <strong className="text-foreground">{formatCurrency(conta.valor)}</strong></span>
                    {conta.valor_pago > 0 && (
                      <span>Pago: {formatCurrency(conta.valor_pago)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Venc: {formatDate(conta.data_vencimento)}</span>
                    {conta.placa && <span>🚗 {conta.placa}</span>}
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2 gap-1"
                    variant="outline"
                    onClick={() => openBaixa(conta)}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Dar Baixa
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New conta view */}
      {view === "new" && (
        <div className="p-3 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nova Conta a Pagar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Fornecedor *</Label>
                <Select value={fornecedor} onValueChange={setFornecedor}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Descritivo</Label>
                <Textarea
                  value={descritivo}
                  onChange={(e) => setDescritivo(e.target.value)}
                  rows={2}
                  placeholder="Descrição do gasto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Veículo (Placa)</Label>
                <Select value={placa} onValueChange={setPlaca}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v) => (
                      <SelectItem key={v.placa} value={v.placa}>{v.placa} - {v.modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Centro de Custo</Label>
                  <Select value={centroCusto} onValueChange={(v) => { setCentroCusto(v); setSubgrupoCusto(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {centrosCusto.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subgrupo</Label>
                  <Select value={subgrupoCusto} onValueChange={setSubgrupoCusto}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {filteredSubgrupos.map((s) => (
                        <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreate} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Baixa Dialog */}
      <Dialog open={baixaDialog} onOpenChange={setBaixaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Dar Baixa</DialogTitle>
          </DialogHeader>
          {selectedConta && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>{selectedConta.fornecedor}</strong></p>
                {selectedConta.descritivo && <p className="text-xs text-muted-foreground">{selectedConta.descritivo}</p>}
                <p>Valor: {formatCurrency(selectedConta.valor)}</p>
                {selectedConta.valor_pago > 0 && (
                  <p>Já pago: {formatCurrency(selectedConta.valor_pago)}</p>
                )}
                <p className="font-semibold">Saldo: {formatCurrency(selectedConta.valor - selectedConta.valor_pago)}</p>
              </div>
              <div>
                <Label className="text-xs">Valor a Pagar</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorBaixa}
                  onChange={(e) => setValorBaixa(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Data Pagamento</Label>
                <Input
                  type="date"
                  value={dataBaixa}
                  onChange={(e) => setDataBaixa(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleBaixa} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileContas;
