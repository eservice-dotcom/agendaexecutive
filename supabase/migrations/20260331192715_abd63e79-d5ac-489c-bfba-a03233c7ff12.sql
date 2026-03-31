ALTER TABLE public.cotacoes ADD COLUMN empresa text NOT NULL DEFAULT '';
ALTER TABLE public.cotacoes ADD COLUMN destinatario text NOT NULL DEFAULT '';
UPDATE public.cotacoes SET empresa = nome WHERE empresa = '';
