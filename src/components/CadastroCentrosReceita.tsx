import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Subgrupo {
  id: string;
  nome: string;
  centro_receita_id: string;
}

const CadastroCentrosReceita = () => {
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [novo, setNovo] = useState("");
  const [novoSub, setNovoSub] = useState<Record<string, string>>({});
  const [openCentros, setOpenCentros] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const [{ data: centros }, { data: subs }] = await Promise.all([
      supabase.from("centros_receita").select("id, nome").order("nome"),
      supabase.from("subgrupos_receita").select("id, nome, centro_receita_id").order("nome"),
    ]);
    if (centros) setItems(centros);
    if (subs) setSubgrupos(subs);
  };

  useEffect(() => { refresh(); }, []);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const handleAdd = async () => {
    const nome = novo.trim();
    if (!nome) { toast.error("Digite o nome do centro de receita."); return; }
    if (items.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Esse centro de receita já existe."); return;
    }
    const session = await getSession();
    if (!session) return;
    const { error } = await supabase.from("centros_receita").insert({ nome, user_id: session.user.id });
    if (error) { toast.error("Erro ao adicionar"); return; }
    setNovo("");
    await refresh();
    toast.success("Centro de receita adicionado!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("centros_receita").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    await refresh();
    toast.success("Centro de receita removido!");
  };

  const handleAddSub = async (centroId: string) => {
    const nome = (novoSub[centroId] || "").trim();
    if (!nome) { toast.error("Digite o nome do subgrupo."); return; }
    const existing = subgrupos.filter((s) => s.centro_receita_id === centroId);
    if (existing.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Subgrupo já existe neste centro."); return;
    }
    const session = await getSession();
    if (!session) return;
    const { error } = await supabase.from("subgrupos_receita").insert({ nome, centro_receita_id: centroId, user_id: session.user.id });
    if (error) { toast.error("Erro ao adicionar subgrupo"); return; }
    setNovoSub((prev) => ({ ...prev, [centroId]: "" }));
    await refresh();
    toast.success("Subgrupo adicionado!");
  };

  const handleDeleteSub = async (id: string) => {
    const { error } = await supabase.from("subgrupos_receita").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover subgrupo"); return; }
    await refresh();
    toast.success("Subgrupo removido!");
  };

  const toggleOpen = (id: string) => {
    setOpenCentros((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Centros de Receita</h3>
      <div className="flex gap-2">
        <Input
          placeholder="Novo centro de receita..."
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-xs"
        />
        <Button onClick={handleAdd} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Centro de Receita / Subgrupos</TableHead>
              <TableHead className="w-20 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum centro de receita cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const subs = subgrupos.filter((s) => s.centro_receita_id === item.id);
                const isOpen = openCentros.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleOpen(item.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {item.nome}
                          <span className="text-xs text-muted-foreground">({subs.length} subgrupo{subs.length !== 1 ? "s" : ""})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <>
                        {subs.map((sub) => (
                          <TableRow key={sub.id} className="bg-muted/30">
                            <TableCell className="pl-10 text-sm">{sub.nome}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSub(sub.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={2} className="pl-10">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Novo subgrupo..."
                                value={novoSub[item.id] || ""}
                                onChange={(e) => setNovoSub((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && handleAddSub(item.id)}
                                className="max-w-xs h-8 text-sm"
                              />
                              <Button onClick={() => handleAddSub(item.id)} size="sm" variant="outline" className="h-8 gap-1 text-xs">
                                <Plus className="h-3 w-3" /> Subgrupo
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CadastroCentrosReceita;
