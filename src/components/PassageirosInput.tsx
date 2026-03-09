import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { Passageiro } from "@/data/agendaData";

interface PassageirosInputProps {
  passageiros: Passageiro[];
  onChange: (passageiros: Passageiro[]) => void;
}

const PassageirosInput = ({ passageiros, onChange }: PassageirosInputProps) => {
  const addPassageiro = () => {
    onChange([...passageiros, { nome: "", voo: "", telefone: "" }]);
  };

  const removePassageiro = (index: number) => {
    onChange(passageiros.filter((_, i) => i !== index));
  };

  const updatePassageiro = (index: number, field: "nome" | "voo" | "telefone", value: string) => {
    const updated = [...passageiros];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">Passageiros</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPassageiro}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3 w-3" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {passageiros.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-2">
            Nenhum passageiro adicionado. Clique em "Adicionar" para incluir.
          </p>
        ) : (
          passageiros.map((passageiro, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Nome</Label>}
                <Input
                  placeholder="Nome do passageiro"
                  value={passageiro.nome}
                  onChange={(e) => updatePassageiro(index, "nome", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Voo</Label>}
                <Input
                  placeholder="Nº do voo"
                  value={passageiro.voo}
                  onChange={(e) => updatePassageiro(index, "voo", e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                {index === 0 && <Label className="text-xs">Telefone</Label>}
                <Input
                  placeholder="Telefone"
                  value={passageiro.telefone || ""}
                  onChange={(e) => updatePassageiro(index, "telefone", e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePassageiro(index)}
                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PassageirosInput;
