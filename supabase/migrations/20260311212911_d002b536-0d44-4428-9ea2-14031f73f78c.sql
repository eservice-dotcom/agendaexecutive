
CREATE TABLE public.editing_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_email text NOT NULL DEFAULT '',
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(item_id)
);

ALTER TABLE public.editing_locks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see locks
CREATE POLICY "Authenticated users can view locks"
  ON public.editing_locks FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own locks
CREATE POLICY "Users can create locks"
  ON public.editing_locks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own locks
CREATE POLICY "Users can delete own locks"
  ON public.editing_locks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow deleting stale locks (older than 5 minutes) by anyone
CREATE POLICY "Anyone can delete stale locks"
  ON public.editing_locks FOR DELETE
  TO authenticated
  USING (locked_at < now() - interval '5 minutes');
