
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS placa_receptivo_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('placas-receptivo', 'placas-receptivo', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read placas receptivo"
ON storage.objects FOR SELECT
USING (bucket_id = 'placas-receptivo');

CREATE POLICY "Authenticated upload placas receptivo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'placas-receptivo');

CREATE POLICY "Authenticated update placas receptivo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'placas-receptivo');

CREATE POLICY "Authenticated delete placas receptivo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'placas-receptivo');
