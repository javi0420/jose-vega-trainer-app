-- FIX: Allow Trainers to INSERT into assigned_routines
-- Problem: The previous policy "Trainers can manage client assignments" might be implicitly checking for select or failing on insert due to visibility of trainer_clients.
-- Solution: Explicitly define policies for INSERT/UPDATE/DELETE/SELECT or ensure the generic one works.
-- We will refine the policy to be absolutely clear.

BEGIN;

-- 1. Ensure trainer_clients is readable by the trainer (prerequisite)
DROP POLICY IF EXISTS "Trainers can view their client relationships" ON public.trainer_clients;
CREATE POLICY "Trainers can view their client relationships" ON public.trainer_clients
FOR SELECT
TO authenticated
USING (trainer_id = auth.uid());

-- 2. Refine assigned_routines policy
DROP POLICY IF EXISTS "Trainers can manage client assignments" ON public.assigned_routines;

CREATE POLICY "Trainers can manage client assignments" ON public.assigned_routines
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid() AND client_id = assigned_routines.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid() AND client_id = assigned_routines.client_id
  )
);

COMMIT;

NOTIFY pgrst, 'reload config';
