-- FIX: Client Assigned Routines RLS
-- Issue: Clients cannot see routines assigned to them by trainers.
-- Solution: Add policies to routines/blocks/exercises allowing SELECT if exists in assigned_routines.

BEGIN;

-- 1. ROUTINES
DROP POLICY IF EXISTS "Clients can view assigned routines" ON public.routines;
CREATE POLICY "Clients can view assigned routines" ON public.routines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assigned_routines
    WHERE assigned_routines.routine_id = routines.id
    AND assigned_routines.client_id = auth.uid()
  )
);

-- 2. ROUTINE BLOCKS
DROP POLICY IF EXISTS "Clients can view assigned routine blocks" ON public.routine_blocks;
CREATE POLICY "Clients can view assigned routine blocks" ON public.routine_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routines
    JOIN public.assigned_routines ON assigned_routines.routine_id = routines.id
    WHERE routines.id = routine_blocks.routine_id
    AND assigned_routines.client_id = auth.uid()
  )
);

-- 3. ROUTINE EXERCISES
DROP POLICY IF EXISTS "Clients can view assigned routine exercises" ON public.routine_exercises;
CREATE POLICY "Clients can view assigned routine exercises" ON public.routine_exercises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routine_blocks
    JOIN public.routines ON routines.id = routine_blocks.routine_id
    JOIN public.assigned_routines ON assigned_routines.routine_id = routines.id
    WHERE routine_blocks.id = routine_exercises.block_id
    AND assigned_routines.client_id = auth.uid()
  )
);

COMMIT;

NOTIFY pgrst, 'reload config';
