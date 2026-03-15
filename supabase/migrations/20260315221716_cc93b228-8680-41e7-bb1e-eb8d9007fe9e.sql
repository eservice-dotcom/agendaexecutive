
-- Make venda_id nullable on contas_pagar
ALTER TABLE public.contas_pagar ALTER COLUMN venda_id DROP NOT NULL;

-- Make venda_id nullable on contas_receber  
ALTER TABLE public.contas_receber ALTER COLUMN venda_id DROP NOT NULL;
