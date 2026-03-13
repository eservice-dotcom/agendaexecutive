
-- Tabela de vendas
CREATE TABLE public.vendas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente text NOT NULL,
  data_venda date NOT NULL DEFAULT CURRENT_DATE,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Itens da venda (ligação com agenda_items)
CREATE TABLE public.venda_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  agenda_item_id uuid NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_items ENABLE ROW LEVEL SECURITY;

-- Vendas policies
CREATE POLICY "Authenticated users can view all vendas" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendas" ON public.vendas FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update vendas" ON public.vendas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vendas" ON public.vendas FOR DELETE TO authenticated USING (true);

-- Venda items policies
CREATE POLICY "Authenticated users can view all venda_items" ON public.venda_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert venda_items" ON public.venda_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update venda_items" ON public.venda_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete venda_items" ON public.venda_items FOR DELETE TO authenticated USING (true);
