import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-executive-service.png";
import { LogIn } from "lucide-react";

const normalizeUsername = (value: string) => {
  // remove acentos + tudo que não for letra/número
  const withoutDiacritics = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return withoutDiacritics.replace(/[^a-z0-9]/g, "");
};

const Login = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, não faz sentido ficar na tela de login
  if (session) {
    return <Navigate to="/" replace />;
  }

  const resolveEmail = (raw: string) => {
    const trimmed = raw.trim();

    // Permite login por email (contas antigas) OU por usuário (novo fluxo)
    if (trimmed.includes("@")) return trimmed.toLowerCase();

    const normalized = normalizeUsername(trimmed);
    if (!normalized) return null;

    return `${normalized}@sistema.local`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const email = resolveEmail(username);
    if (!email) {
      toast.error("Nome de usuário inválido. Use letras e números.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: username.trim() },
          },
        });

        if (error) {
          toast.error(
            "Erro ao criar conta. Verifique se o nome já está em uso ou tente outro."
          );
          return;
        }

        toast.success("Conta criada com sucesso!");
        // Em alguns cenários pode não logar automaticamente (dependendo da config)
        if (data.session) navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error("Usuário/e-mail ou senha inválidos.");
          return;
        }
        toast.success("Login realizado!");
        navigate("/", { replace: true });
      }
    } finally {
      setLoading(false);
    }
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
            <Label htmlFor="username" className="font-bold">Usuário (ou e-mail)</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ex: ADMIN (ou seu e-mail)"
              autoComplete="username"
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
              autoComplete={isSignUp ? "new-password" : "current-password"}
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
