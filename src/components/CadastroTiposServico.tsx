import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { getTiposServico, saveTipoServico, deleteTipoServico } from "@/data/cadastroStorage";

const CadastroTiposServico = () => {
  const [tipos, setTipos] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState("");

  const refresh = () => setTipos(getTiposServico());

  useEffect(() => { refresh(); }, []);

  const handleAdd = () => {
    const nome = novoTipo.trim();
    if (!nome) {
      toast.error("Digite o nome do tipo de serviço.");
      return;
    }
    if (tipos.some((t) => t.toLowerCase() === nome.toLowerCase())) {
      toast.error("Esse tipo de serviço já existe.");
      return;
    }
    saveTipoServico(nome);
    setNovoTipo("");
    refresh();
    toast.success("Tipo de serviço adicionado!");
  };

  const handleDelete = (tipo: string) => {
    deleteTipoServico(tipo);
    refresh();
    toast.success("Tipo de serviço removido!");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Novo tipo de serviço..."
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
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
              <TableHead>Tipo de Serviço</TableHead>
              <TableHead className="w-20 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum tipo cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              tipos.map((tipo) => (
                <TableRow key={tipo}>
                  <TableCell>{tipo}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo)}>
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

export default CadastroTiposServico;
