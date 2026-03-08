
-- Tabela de permissões individuais por usuário
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  can_view_financials BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check financial permission
CREATE OR REPLACE FUNCTION public.can_view_financials(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_view_financials FROM public.user_permissions WHERE user_id = _user_id),
    false
  )
$$;

-- Users can read their own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins (users with can_view_financials) can manage permissions
CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions FOR SELECT
  USING (public.can_view_financials(auth.uid()));

CREATE POLICY "Admins can insert permissions"
  ON public.user_permissions FOR INSERT
  WITH CHECK (public.can_view_financials(auth.uid()));

CREATE POLICY "Admins can update permissions"
  ON public.user_permissions FOR UPDATE
  USING (public.can_view_financials(auth.uid()));

CREATE POLICY "Admins can delete permissions"
  ON public.user_permissions FOR DELETE
  USING (public.can_view_financials(auth.uid()));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
