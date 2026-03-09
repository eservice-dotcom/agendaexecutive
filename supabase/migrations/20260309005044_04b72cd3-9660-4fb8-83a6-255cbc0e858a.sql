
-- Drop existing restrictive UPDATE policies
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios itens da agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios veículos" ON public.veiculos;

-- Drop existing restrictive DELETE policies
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios itens da agenda" ON public.agenda_items;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios clientes" ON public.clientes;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios veículos" ON public.veiculos;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios tipos de serviço" ON public.tipos_servico;

-- Create new permissive UPDATE policies for all authenticated users
CREATE POLICY "Usuários autenticados podem atualizar todos os itens da agenda"
  ON public.agenda_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar todos os clientes"
  ON public.clientes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar todos os fornecedores"
  ON public.fornecedores FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar todos os motoristas"
  ON public.motoristas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem atualizar todos os veículos"
  ON public.veiculos FOR UPDATE TO authenticated USING (true);

-- Create new permissive DELETE policies for all authenticated users
CREATE POLICY "Usuários autenticados podem deletar todos os itens da agenda"
  ON public.agenda_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar todos os clientes"
  ON public.clientes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar todos os fornecedores"
  ON public.fornecedores FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar todos os motoristas"
  ON public.motoristas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar todos os veículos"
  ON public.veiculos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar todos os tipos de serviço"
  ON public.tipos_servico FOR DELETE TO authenticated USING (true);
