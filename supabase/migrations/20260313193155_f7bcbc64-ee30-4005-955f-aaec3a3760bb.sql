
CREATE TABLE public.venda_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.venda_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all venda_extras"
  ON public.venda_extras FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert venda_extras"
  ON public.venda_extras FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update venda_extras"
  ON public.venda_extras FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete venda_extras"
  ON public.venda_extras FOR DELETE TO authenticated USING (true);
