
ALTER TABLE public.contas_pagar ADD COLUMN valor_pago numeric NOT NULL DEFAULT 0;
ALTER TABLE public.contas_receber ADD COLUMN valor_pago numeric NOT NULL DEFAULT 0;

-- Update existing "pago" records to have valor_pago = valor
UPDATE public.contas_pagar SET valor_pago = valor WHERE status = 'pago';
UPDATE public.contas_receber SET valor_pago = valor WHERE status = 'pago';
