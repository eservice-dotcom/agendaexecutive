
CREATE TABLE IF NOT EXISTS public.tipos_motorista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_motorista TO authenticated;
GRANT ALL ON public.tipos_motorista TO service_role;

ALTER TABLE public.tipos_motorista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tipos_motorista" ON public.tipos_motorista FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tipos_motorista" ON public.tipos_motorista FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tipos_motorista" ON public.tipos_motorista FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tipos_motorista" ON public.tipos_motorista FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS tipos text[] NOT NULL DEFAULT '{}'::text[];
