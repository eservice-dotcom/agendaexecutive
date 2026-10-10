CREATE TABLE public.fechamento_notificacoes_dispensadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cot text NOT NULL UNIQUE,
  dismissed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.fechamento_notificacoes_dispensadas TO authenticated;
GRANT ALL ON public.fechamento_notificacoes_dispensadas TO service_role;
ALTER TABLE public.fechamento_notificacoes_dispensadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.fechamento_notificacoes_dispensadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert" ON public.fechamento_notificacoes_dispensadas FOR INSERT TO authenticated WITH CHECK (dismissed_by = auth.uid());
CREATE POLICY "auth delete" ON public.fechamento_notificacoes_dispensadas FOR DELETE TO authenticated USING (true);