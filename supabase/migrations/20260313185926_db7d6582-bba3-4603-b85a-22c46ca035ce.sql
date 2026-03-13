
-- Add data_pagamento to contas_pagar
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS data_pagamento date DEFAULT NULL;

-- Create contas_receber table  
CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cliente text NOT NULL DEFAULT '',
  descritivo text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contas_receber" ON public.contas_receber FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contas_receber" ON public.contas_receber FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update contas_receber" ON public.contas_receber FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contas_receber" ON public.contas_receber FOR DELETE TO authenticated USING (true);
