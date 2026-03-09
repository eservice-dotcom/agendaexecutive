-- Create a function to get all registered users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users with financial viewing permissions (admins) to see this
  IF NOT public.can_view_financials(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver usuários';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;