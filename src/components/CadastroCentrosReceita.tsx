import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CadastroCentrosReceita = () => {
  const [items, setItems] = useState<{ id: string; nome: string }[]>([]);
  const [novo, setNovo] = useState("");

  const refresh = async () => {
    const { data } = await supabase
      .from("centros_receita")
      .select("id, nome")
      .order("nome");
    if (data) setItems(data);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    const nome = novo.trim();
    if (!nome) { toast.error("Digite o nome do centro de receita."); return; }
    if (items.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Esse centro de receita já existe."); return;
    }
    const { data: { session } } = await supabase.auth.getSession();
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
              <TableHead>Centro de Receita</TableHead>
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
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CadastroCentrosReceita;
