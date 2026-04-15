ALTER TABLE public.contratos ADD COLUMN contrato_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.contratos ADD COLUMN contrato_veiculos jsonb DEFAULT '[]'::jsonb;