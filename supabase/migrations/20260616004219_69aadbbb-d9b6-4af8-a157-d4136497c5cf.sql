
CREATE TABLE IF NOT EXISTS public.tipos_fornecedor (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_fornecedor TO authenticated;
GRANT ALL ON public.tipos_fornecedor TO service_role;

ALTER TABLE public.tipos_fornecedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tipos_fornecedor"
ON public.tipos_fornecedor FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert tipos_fornecedor"
ON public.tipos_fornecedor FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update tipos_fornecedor"
ON public.tipos_fornecedor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete tipos_fornecedor"
ON public.tipos_fornecedor FOR DELETE TO authenticated USING (true);

INSERT INTO public.tipos_fornecedor (nome) VALUES
  ('Executivo'), ('Motorista'), ('Veículo'), ('RH'), ('Serviços'), ('Outros')
ON CONFLICT (nome) DO NOTHING;
