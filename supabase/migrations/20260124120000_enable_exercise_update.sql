-- Enable authenticated users to update exercises for Soft Delete
-- Without this, UPDATE exercises SET is_active = false returns 403 Forbidden

CREATE POLICY "Authenticated users can update their own exercises"
  ON public.exercises FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update system exercises"
  ON public.exercises FOR UPDATE
  TO authenticated
  USING (created_by IS NULL)
  WITH CHECK (created_by IS NULL);
