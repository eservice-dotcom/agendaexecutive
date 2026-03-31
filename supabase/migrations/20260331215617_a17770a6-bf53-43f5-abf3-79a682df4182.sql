
-- Add column for signed contract file URL
ALTER TABLE public.contratos ADD COLUMN arquivo_assinado_url text DEFAULT '';

-- Create storage bucket for signed contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('contratos-assinados', 'contratos-assinados', true);

-- RLS policies for storage bucket
CREATE POLICY "Authenticated users can upload contract files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos-assinados');

CREATE POLICY "Authenticated users can view contract files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contratos-assinados');

CREATE POLICY "Authenticated users can delete contract files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos-assinados');

CREATE POLICY "Authenticated users can update contract files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contratos-assinados');

CREATE POLICY "Public can view contract files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'contratos-assinados');
