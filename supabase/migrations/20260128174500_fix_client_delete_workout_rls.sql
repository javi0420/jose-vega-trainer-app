-- Migration: fix_client_delete_workout_rls.sql
-- Goal: Ensure robust workout deletion for clients and clean up old policies.

BEGIN;

-- 1. Cleanup old or conflicting policies on public.workouts
-- Dropping based on common patterns and previous migration history
DROP POLICY IF EXISTS "Users can manage their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users and Trainers can read workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users and Trainers can update workouts" ON public.workouts;
DROP POLICY IF EXISTS "enable_delete_for_owners" ON public.workouts;
DROP POLICY IF EXISTS "policy_workouts_delete" ON public.workouts;

-- 2. Create Unified Permissions for Owners
-- Individual can manage everything on their own record
CREATE POLICY "Individuals can manage their own workouts" 
ON public.workouts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Explicit DELETE policy as requested for extra clarity and robustness
DROP POLICY IF EXISTS "Individuals can delete their own workouts" ON public.workouts;
CREATE POLICY "Individuals can delete their own workouts" 
ON public.workouts 
FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Restore Trainer Read/Update access (since we dropped them above)
-- Trainers need to see and give feedback, but per current instruction, they don't delete.
CREATE POLICY "Trainers can read workouts of their clients"
ON public.workouts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
);

CREATE POLICY "Trainers can update feedback on client workouts"
ON public.workouts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
);

-- Ensure RLS is active
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

COMMIT;
