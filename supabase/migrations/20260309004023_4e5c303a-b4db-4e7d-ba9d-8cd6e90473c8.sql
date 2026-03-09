-- Corrigir políticas RLS para isolar dados por usuário

-- CLIENTES: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar clientes" ON public.clientes;
CREATE POLICY "Usuários podem visualizar apenas seus próprios clientes"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

-- VEÍCULOS: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar veículos" ON public.veiculos;
CREATE POLICY "Usuários podem visualizar apenas seus próprios veículos"
  ON public.veiculos FOR SELECT
  USING (auth.uid() = user_id);

-- MOTORISTAS: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar motoristas" ON public.motoristas;
CREATE POLICY "Usuários podem visualizar apenas seus próprios motoristas"
  ON public.motoristas FOR SELECT
  USING (auth.uid() = user_id);

-- FORNECEDORES: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar fornecedores" ON public.fornecedores;
CREATE POLICY "Usuários podem visualizar apenas seus próprios fornecedores"
  ON public.fornecedores FOR SELECT
  USING (auth.uid() = user_id);

-- TIPOS DE SERVIÇO: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar tipos de serviço" ON public.tipos_servico;
CREATE POLICY "Usuários podem visualizar apenas seus próprios tipos de serviço"
  ON public.tipos_servico FOR SELECT
  USING (auth.uid() = user_id);

-- AGENDA: apenas dados do próprio usuário
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar agenda" ON public.agenda_items;
CREATE POLICY "Usuários podem visualizar apenas seus próprios itens da agenda"
  ON public.agenda_items FOR SELECT
  USING (auth.uid() = user_id);