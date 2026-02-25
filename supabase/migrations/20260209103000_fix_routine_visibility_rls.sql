-- Fix RLS: Allow clients to view routines assigned to them.
-- Currently, clients might only see routines they own.

-- 1. Policy for `routines`: Clients can select routines that are assigned to them.
-- 1. Policy for `routines`: Clients can select routines that are assigned to them.
DROP POLICY IF EXISTS "Clients can view assigned routines" ON public.routines;

CREATE POLICY "Clients can view assigned routines"
ON public.routines
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT routine_id 
        FROM public.assigned_routines 
        WHERE client_id = auth.uid()
    )
    OR
    user_id = auth.uid() -- Keep existing owner check if needed
);

-- 2. Policy for `assigned_routines`: Clients can view their own assignments.
DROP POLICY IF EXISTS "Clients can view their own assignments" ON public.assigned_routines;

CREATE POLICY "Clients can view their own assignments"
ON public.assigned_routines
FOR SELECT
TO authenticated
USING (
    client_id = auth.uid()
);
