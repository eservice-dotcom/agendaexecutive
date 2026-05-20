ALTER TABLE public.agenda_items
  ADD COLUMN IF NOT EXISTS km_in_fornecedor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_fim_fornecedor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_extra_fornecedor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hora_in_fornecedor text,
  ADD COLUMN IF NOT EXISTS hora_fim_fornecedor text,
  ADD COLUMN IF NOT EXISTS hora_extra_fornecedor text;