CREATE SEQUENCE IF NOT EXISTS faturas_numero_seq START 1;

CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  numero_fatura integer NOT NULL DEFAULT nextval('faturas_numero_seq'),
  cliente text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  valor_total numeric NOT NULL DEFAULT 0,
  observacoes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberta',
  conta_receber_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturas TO authenticated;
GRANT ALL ON public.faturas TO service_role;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view faturas" ON public.faturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert faturas" ON public.faturas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated update faturas" ON public.faturas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete faturas" ON public.faturas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER faturas_updated_at BEFORE UPDATE ON public.faturas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fatura_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fatura_id, venda_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fatura_vendas TO authenticated;
GRANT ALL ON public.fatura_vendas TO service_role;
ALTER TABLE public.fatura_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view fatura_vendas" ON public.fatura_vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert fatura_vendas" ON public.fatura_vendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update fatura_vendas" ON public.fatura_vendas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete fatura_vendas" ON public.fatura_vendas FOR DELETE TO authenticated USING (true);

ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS fatura_id uuid REFERENCES public.faturas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_faturas_cliente ON public.faturas(cliente);
CREATE INDEX IF NOT EXISTS idx_faturas_periodo ON public.faturas(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_fatura_vendas_venda ON public.fatura_vendas(venda_id);