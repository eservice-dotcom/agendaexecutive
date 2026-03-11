import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Shield, Trash2, Plus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserPermission {
  user_id: string;
  can_view_financials: boolean;
}

const CadastroUsuarios = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingPerm, setTogglingPerm] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", name: "" });
  const [creating, setCreating] = useState(false);
  const { canViewFinancials, user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_users");
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast.error(error.message || "Erro ao buscar usuários");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    const { data } = await supabase.from("user_permissions").select("user_id, can_view_financials");
    const map = new Map<string, boolean>();
    (data || []).forEach((p: UserPermission) => map.set(p.user_id, p.can_view_financials));
    setPermissions(map);
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    try {
      const { error } = await supabase.rpc("delete_user", { _user_id: userId });
      if (error) throw error;
      toast.success("Usuário excluído com sucesso");
      fetchUsers();
      fetchPermissions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePermission = async (userId: string, currentValue: boolean) => {
    setTogglingPerm(userId);
    try {
      const existing = permissions.has(userId);
      if (existing) {
        const { error } = await supabase
          .from("user_permissions")
          .update({ can_view_financials: !currentValue })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_permissions")
          .insert({ user_id: userId, can_view_financials: true });
        if (error) throw error;
      }
      toast.success(`Permissão ${!currentValue ? "concedida" : "removida"}`);
      fetchPermissions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar permissão");
    } finally {
      setTogglingPerm(null);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password) {
      toast.error("Usuário e senha são obrigatórios");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          username: createForm.username,
          password: createForm.password,
          name: createForm.name || createForm.username,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado com sucesso!");
      setShowCreateDialog(false);
      setCreateForm({ username: "", password: "", name: "" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);

  if (!canViewFinancials) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Shield className="mx-auto mb-2 h-8 w-8" />
            <p>Acesso restrito a administradores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários Cadastrados
              </CardTitle>
              <CardDescription>
                {users.length} usuário(s) registrado(s) no sistema
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhum usuário cadastrado
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Email / Usuário</TableHead>
                    <TableHead className="font-semibold">Data de Cadastro</TableHead>
                    <TableHead className="font-semibold">Último Acesso</TableHead>
                    <TableHead className="font-semibold text-center">Admin / Financeiro</TableHead>
                    <TableHead className="font-semibold w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isAdmin = permissions.get(user.id) ?? false;
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(user.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.last_sign_in_at
                            ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm")
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={isAdmin}
                              onCheckedChange={() => handleTogglePermission(user.id, isAdmin)}
                              disabled={isSelf || togglingPerm === user.id}
                            />
                            <span className="text-xs text-muted-foreground">
                              {isAdmin ? "Sim" : "Não"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {!isSelf ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deleting === user.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O usuário{" "}
                                    <strong>{user.email}</strong> será permanentemente removido.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-xs text-muted-foreground">Você</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar usuário */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-name" className="font-bold">Nome</Label>
              <Input
                id="new-name"
                placeholder="Nome do usuário"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-username" className="font-bold">Usuário</Label>
              <Input
                id="new-username"
                placeholder="Ex: joao (ou email)"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use apenas letras e números. Será convertido para login do sistema.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="font-bold">Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CadastroUsuarios;
