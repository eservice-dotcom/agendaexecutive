
CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  fornecedor text NOT NULL DEFAULT '',
  descritivo text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contas_pagar" ON public.contas_pagar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contas_pagar" ON public.contas_pagar FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update contas_pagar" ON public.contas_pagar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contas_pagar" ON public.contas_pagar FOR DELETE TO authenticated USING (true);
