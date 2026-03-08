import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Truck, User, Building2, ListChecks } from "lucide-react";
import CadastroClientes from "@/components/CadastroClientes";
import CadastroVeiculos from "@/components/CadastroVeiculos";
import CadastroMotoristas from "@/components/CadastroMotoristas";
import CadastroFornecedores from "@/components/CadastroFornecedores";
import CadastroTiposServico from "@/components/CadastroTiposServico";
import logo from "@/assets/logo-executive-service.png";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

const Cadastros = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-foreground px-4 py-3 shadow-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <Link to="/">
            <img src={logo} alt="Executive Service" className="h-10" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Cadastros</h1>
          <Link to="/">
            <span className="flex items-center gap-1 text-sm text-primary hover:underline">
              <CalendarDays className="h-4 w-4" /> Voltar à Agenda
            </span>
          </Link>
        </div>

        <Tabs defaultValue="clientes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="veiculos" className="gap-2">
              <Truck className="h-4 w-4" />
              Veículos
            </TabsTrigger>
            <TabsTrigger value="motoristas" className="gap-2">
              <User className="h-4 w-4" />
              Motoristas
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes"><CadastroClientes /></TabsContent>
          <TabsContent value="veiculos"><CadastroVeiculos /></TabsContent>
          <TabsContent value="motoristas"><CadastroMotoristas /></TabsContent>
          <TabsContent value="fornecedores"><CadastroFornecedores /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Cadastros;
