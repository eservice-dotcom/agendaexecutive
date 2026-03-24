import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Smartphone, Copy, Plus, Trash2, QrCode } from "lucide-react";

interface MobileToken {
  id: string;
  token: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const MobileTokenManager = () => {
  const { session } = useAuth();
  const [tokens, setTokens] = useState<MobileToken[]>([]);
  const [newLabel, setNewLabel] = useState("Meu Celular");
  const [loading, setLoading] = useState(true);

  const loadTokens = async () => {
    const { data } = await supabase
      .from("mobile_access_tokens")
      .select("*")
      .order("created_at", { ascending: false });
    setTokens((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const createToken = async () => {
    if (!session?.user.id) return;
    const { error } = await supabase.from("mobile_access_tokens").insert({
      created_by: session.user.id,
      label: newLabel.trim() || "Mobile Access",
    } as any);
    if (error) {
      toast.error("Erro ao criar token");
      return;
    }
    toast.success("Token criado!");
    setNewLabel("Meu Celular");
    loadTokens();
  };

  const deleteToken = async (id: string) => {
    await supabase.from("mobile_access_tokens").delete().eq("id", id);
    toast.success("Token removido");
    loadTokens();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/m?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado! Envie para seu celular.");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Nunca";
    return new Date(d).toLocaleString("pt-BR");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Acesso Mobile (Contas a Pagar)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Gere um link seguro para acessar e gerenciar contas a pagar pelo celular sem precisar fazer login.
        </p>

        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nome do dispositivo"
            className="flex-1"
          />
          <Button onClick={createToken} size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Gerar
          </Button>
        </div>

        {tokens.map((t) => (
          <div key={t.id} className="flex items-center gap-2 p-2 border rounded-md text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t.label}</p>
              <p className="text-muted-foreground">Último uso: {formatDate(t.last_used_at)}</p>
            </div>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => copyLink(t.token)}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteToken(t.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {!loading && tokens.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            Nenhum token criado. Gere um para acessar pelo celular.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileTokenManager;
