DROP POLICY IF EXISTS "Public can view contract files" ON storage.objects;
DROP POLICY IF EXISTS "Public read placas receptivo" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;