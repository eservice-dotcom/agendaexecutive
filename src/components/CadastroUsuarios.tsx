import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, Trash2 } from "lucide-react";
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

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const CadastroUsuarios = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { canViewFinancials, user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_users');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast.error(error.message || "Erro ao buscar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    try {
      const { error } = await supabase.rpc('delete_user', { _user_id: userId });
      
      if (error) throw error;
      
      toast.success("Usuário excluído com sucesso");
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchUsers();
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Cadastrados
          </CardTitle>
          <CardDescription>
            {users.length} usuário(s) registrado(s) no sistema
          </CardDescription>
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
                    <TableHead className="font-semibold">Email / Usuário (Sistema)</TableHead>
                    <TableHead className="font-semibold">Data de Cadastro</TableHead>
                    <TableHead className="font-semibold">Último Acesso</TableHead>
                    <TableHead className="font-semibold w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(user.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.last_sign_in_at 
                          ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm")
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUser?.id ? (
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
                                  Esta ação não pode ser desfeita. O usuário <strong>{user.email}</strong> será permanentemente removido do sistema.
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroUsuarios;
