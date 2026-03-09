
CREATE OR REPLACE FUNCTION public.delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.can_view_financials(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
  END IF;
  
  -- Prevent self-deletion
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir seu próprio usuário';
  END IF;
  
  -- Delete user permissions first
  DELETE FROM public.user_permissions WHERE user_id = _user_id;
  
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
