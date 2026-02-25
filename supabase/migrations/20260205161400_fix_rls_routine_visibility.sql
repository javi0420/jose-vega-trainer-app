-- Force fix for Routine Visibility via Assigned Routines
-- Re-applying policy to ensure it exists and is correct.

DROP POLICY IF EXISTS "Clients can view assigned routines" ON public.routines;

CREATE POLICY "Clients can view assigned routines" ON public.routines
FOR SELECT USING (
  auth.uid() = user_id -- Own routines
  OR
  EXISTS (
    SELECT 1 FROM public.assigned_routines
    WHERE assigned_routines.routine_id = routines.id
    AND assigned_routines.client_id = auth.uid()
  )
);

-- Ensure assigned_routines is visible
DROP POLICY IF EXISTS "Clients can view assigned routines" ON public.assigned_routines;

CREATE POLICY "Clients can view assigned routines" ON public.assigned_routines
FOR SELECT USING (
  auth.uid() = client_id
);
