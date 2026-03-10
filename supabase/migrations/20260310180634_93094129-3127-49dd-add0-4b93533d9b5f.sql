ALTER TABLE public.agenda_items 
  ADD COLUMN km_in numeric DEFAULT 0,
  ADD COLUMN km_fim numeric DEFAULT 0,
  ADD COLUMN km_extra numeric DEFAULT 0,
  ADD COLUMN hora_in time without time zone DEFAULT NULL,
  ADD COLUMN hora_fim time without time zone DEFAULT NULL,
  ADD COLUMN estacionamento numeric DEFAULT 0,
  ADD COLUMN outros numeric DEFAULT 0;