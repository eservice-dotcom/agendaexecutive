ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS contratante_representante_profissao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contratante_representante_cpf_rg text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contratante_representante_telefone text NOT NULL DEFAULT '';