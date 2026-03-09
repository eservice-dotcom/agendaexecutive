-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_all_users();

-- Recreate with the new signature including name field
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_financials(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver usuários';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    (au.raw_user_meta_data->>'name')::text as name,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;