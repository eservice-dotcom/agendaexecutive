
CREATE TABLE public.mobile_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT 'Mobile Access',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

ALTER TABLE public.mobile_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mobile tokens"
ON public.mobile_access_tokens
FOR ALL
TO authenticated
USING (public.can_view_financials(auth.uid()))
WITH CHECK (public.can_view_financials(auth.uid()));
