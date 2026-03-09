import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-executive-service.png";
import { LogIn } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Gera um email fictício para o Supabase usando o nome de usuário
    const email = `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@sistema.local`;

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { name: username.trim() } 
        },
      });
      if (error) {
        toast.error("Erro ao criar conta. Verifique se o nome já está em uso.");
      } else {
        toast.success("Conta criada com sucesso!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Nome de usuário ou senha inválidos.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Executive Service" className="h-12" />
          <h1 className="text-lg font-bold text-foreground">
            {isSignUp ? "Criar Conta" : "Entrar"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {isSignUp ? "Criar Conta" : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Já tem uma conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {isSignUp ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
