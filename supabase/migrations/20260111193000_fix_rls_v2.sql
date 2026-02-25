-- FIX RLS V2: Unified Production Fix
-- 1. Fix 500 Cascade Error (Trainer Clients Access)
-- 2. Fix Missing Assigned Routine Exercises (Optimize Nested RLS)

BEGIN;

-- ==========================================
-- 1. TRAINER CLIENTS (Fix 500 Error)
-- ==========================================
-- Issue: 'workouts' table checks 'trainer_clients'. If 'trainer_clients' has no policies, access is denied (empty), or causes recursion issues.
-- Cause: Trainer cannot verify they are a trainer if they cannot read this table.
-- Solution: Allow Trainers/Clients to view their own relationships.

DROP POLICY IF EXISTS "Trainers and Clients can view their relationships" ON public.trainer_clients;
CREATE POLICY "Trainers and Clients can view their relationships" ON public.trainer_clients
FOR SELECT USING (
  trainer_id = auth.uid() OR client_id = auth.uid()
);

-- ==========================================
-- 2. ASSIGNED ROUTINES OPTIMIZATION
-- ==========================================
-- Issue: Deeply nested JOINs (Exercises -> Blocks -> Routines -> Assigned -> Clients) can time out or fail.
-- Solution: Simplify JOINs by referencing IDs directly where possible and skipping redundant tables.

-- 2.1 Routine Blocks (Optimized)
DROP POLICY IF EXISTS "Clients can view assigned routine blocks" ON public.routine_blocks;
CREATE POLICY "Clients can view assigned routine blocks" ON public.routine_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assigned_routines
    WHERE assigned_routines.routine_id = routine_blocks.routine_id -- Direct Link!
    AND assigned_routines.client_id = auth.uid()
  )
);

-- 2.2 Routine Exercises (Optimized)
-- Skip joining 'routines' table entirely. Use block -> routine link.
DROP POLICY IF EXISTS "Clients can view assigned routine exercises" ON public.routine_exercises;
CREATE POLICY "Clients can view assigned routine exercises" ON public.routine_exercises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routine_blocks
    JOIN public.assigned_routines ON assigned_routines.routine_id = routine_blocks.routine_id
    WHERE routine_blocks.id = routine_exercises.block_id
    AND assigned_routines.client_id = auth.uid()
  )
);

-- ==========================================
-- 3. SAFETY NETS (Types)
-- ==========================================
-- Ensure columns are correct types just inside case
ALTER TABLE public.sets ALTER COLUMN reps TYPE numeric USING reps::numeric;
ALTER TABLE public.sets ALTER COLUMN rest_seconds TYPE numeric USING rest_seconds::numeric;
ALTER TABLE public.block_exercises ALTER COLUMN position TYPE text;


COMMIT;

NOTIFY pgrst, 'reload config';
