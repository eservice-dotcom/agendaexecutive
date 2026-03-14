ALTER TABLE public.clientes
  ADD COLUMN cep text NOT NULL DEFAULT '',
  ADD COLUMN cidade text NOT NULL DEFAULT '',
  ADD COLUMN uf text NOT NULL DEFAULT '';