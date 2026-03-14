
-- Sequence for auto-numbering
CREATE SEQUENCE IF NOT EXISTS fechamentos_numero_seq START WITH 1 INCREMENT BY 1;

-- Main table for closing reports
CREATE TABLE public.fechamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_fechamento integer NOT NULL DEFAULT nextval('fechamentos_numero_seq'),
  user_id uuid NOT NULL,
  cliente text NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  valor_total numeric NOT NULL DEFAULT 0,
  extras_total numeric NOT NULL DEFAULT 0,
  quantidade_servicos integer NOT NULL DEFAULT 0,
  observacoes text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all fechamentos"
  ON public.fechamentos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fechamentos"
  ON public.fechamentos FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update fechamentos"
  ON public.fechamentos FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete fechamentos"
  ON public.fechamentos FOR DELETE TO authenticated
  USING (true);

-- Link table: fechamento <-> agenda_items
CREATE TABLE public.fechamento_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id uuid NOT NULL REFERENCES public.fechamentos(id) ON DELETE CASCADE,
  agenda_item_id uuid NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fechamento_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all fechamento_items"
  ON public.fechamento_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fechamento_items"
  ON public.fechamento_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fechamento_items"
  ON public.fechamento_items FOR DELETE TO authenticated
  USING (true);
