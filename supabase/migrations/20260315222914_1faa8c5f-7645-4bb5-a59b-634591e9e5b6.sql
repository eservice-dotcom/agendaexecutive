
-- Subgrupos de Centros de Custo
CREATE TABLE public.subgrupos_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_custo_id uuid NOT NULL REFERENCES public.centros_custo(id) ON DELETE CASCADE,
  nome text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subgrupos_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all subgrupos_custo" ON public.subgrupos_custo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subgrupos_custo" ON public.subgrupos_custo
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can delete subgrupos_custo" ON public.subgrupos_custo
  FOR DELETE TO authenticated USING (true);

-- Subgrupos de Centros de Receita
CREATE TABLE public.subgrupos_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_receita_id uuid NOT NULL REFERENCES public.centros_receita(id) ON DELETE CASCADE,
  nome text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subgrupos_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all subgrupos_receita" ON public.subgrupos_receita
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert subgrupos_receita" ON public.subgrupos_receita
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can delete subgrupos_receita" ON public.subgrupos_receita
  FOR DELETE TO authenticated USING (true);

-- Add subgrupo columns to contas tables
ALTER TABLE public.contas_pagar ADD COLUMN subgrupo_custo text DEFAULT '';
ALTER TABLE public.contas_receber ADD COLUMN subgrupo_receita text DEFAULT '';
