-- FIX: Trainer Workout Data Access
-- Issue: Trainers cannot view workouts of their clients because current RLS only allows "user_id = auth.uid()".
-- Solution: Add policy to allow SELECT/UPDATE if trainer has relationship in 'trainer_clients'.

BEGIN;

-- 1. DROP old restrictive policies if they exist (to avoid conflicts or clutter)
-- We use DO block to be safe if policy names vary, but here we target standard names.
DROP POLICY IF EXISTS "Users can read own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;

-- 2. CREATE NEW COMPREHENSIVE POLICIES

-- READ: Own Workouts OR Workouts of Clients
CREATE POLICY "Users and Trainers can read workouts"
ON public.workouts
FOR SELECT
USING (
  -- User matches
  auth.uid() = user_id
  OR
  -- Trainer matches (Trainer ID = auth.uid and Client ID = workout.user_id)
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
);

-- UPDATE: Own Workouts OR Workouts of Clients (for Feedback)
CREATE POLICY "Users and Trainers can update workouts"
ON public.workouts
FOR UPDATE
USING (
  -- User matches
  auth.uid() = user_id
  OR
  -- Trainer matches
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid()
    AND client_id = workouts.user_id
  )
);

-- INSERT: Only Owners (Trainers usually don't insert workouts for clients directly via this table logic, usually via RPC or impersonation, 
-- but if we want to allow it:)
-- Keeps existing "Users can insert own workouts" logic usually.

COMMIT;

NOTIFY pgrst, 'reload config';
