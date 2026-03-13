
-- Add auto-incrementing numero_venda to vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS numero_venda serial;

-- Set existing rows based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.vendas
)
UPDATE public.vendas SET numero_venda = numbered.rn
FROM numbered WHERE vendas.id = numbered.id;
