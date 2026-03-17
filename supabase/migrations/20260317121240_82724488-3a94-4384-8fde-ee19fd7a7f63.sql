
-- Tabela principal de cotações
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero_cotacao SERIAL,
  nome TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT NOT NULL DEFAULT '',
  validade_proposta DATE,
  observacoes TEXT DEFAULT '',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens da cotação
CREATE TABLE public.cotacao_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  descritivo TEXT NOT NULL DEFAULT '',
  valor NUMERIC NOT NULL DEFAULT 0,
  hora_extra TEXT DEFAULT '',
  km_extra NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS cotacoes
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all cotacoes" ON public.cotacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cotacoes" ON public.cotacoes FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update cotacoes" ON public.cotacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cotacoes" ON public.cotacoes FOR DELETE TO authenticated USING (true);

-- RLS cotacao_items
ALTER TABLE public.cotacao_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all cotacao_items" ON public.cotacao_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cotacao_items" ON public.cotacao_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cotacao_items" ON public.cotacao_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cotacao_items" ON public.cotacao_items FOR DELETE TO authenticated USING (true);
