ALTER TABLE public.agenda_items
  ADD COLUMN IF NOT EXISTS valor_km_extra_fornecedor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_hora_extra_fornecedor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estacionamento_fornecedor numeric NOT NULL DEFAULT 0;