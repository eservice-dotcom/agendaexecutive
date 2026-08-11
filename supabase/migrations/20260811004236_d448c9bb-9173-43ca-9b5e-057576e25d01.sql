ALTER TABLE public.cotacao_items
  ADD COLUMN IF NOT EXISTS valor_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade numeric NOT NULL DEFAULT 1;
UPDATE public.cotacao_items SET valor_unitario = valor WHERE valor_unitario = 0;