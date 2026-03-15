
-- Centros de Custo (for contas a pagar)
CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all centros_custo" ON public.centros_custo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert centros_custo" ON public.centros_custo
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete centros_custo" ON public.centros_custo
  FOR DELETE TO authenticated USING (true);

-- Centros de Receita (for contas a receber)
CREATE TABLE public.centros_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.centros_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all centros_receita" ON public.centros_receita
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert centros_receita" ON public.centros_receita
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete centros_receita" ON public.centros_receita
  FOR DELETE TO authenticated USING (true);

-- Add centro columns to contas tables
ALTER TABLE public.contas_pagar ADD COLUMN centro_custo text DEFAULT '';
ALTER TABLE public.contas_receber ADD COLUMN centro_receita text DEFAULT '';
