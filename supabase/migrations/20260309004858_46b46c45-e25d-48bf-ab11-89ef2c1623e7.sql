
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios itens da agend" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios veículos" ON public.veiculos;
DROP POLICY IF EXISTS "Usuários podem visualizar apenas seus próprios tipos de servi" ON public.tipos_servico;

-- Create new permissive SELECT policies for all authenticated users
CREATE POLICY "Usuários autenticados podem ver todos os itens da agenda"
  ON public.agenda_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver todos os clientes"
  ON public.clientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver todos os fornecedores"
  ON public.fornecedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver todos os motoristas"
  ON public.motoristas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver todos os veículos"
  ON public.veiculos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver todos os tipos de serviço"
  ON public.tipos_servico FOR SELECT TO authenticated USING (true);
