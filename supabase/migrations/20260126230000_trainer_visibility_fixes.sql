-- Migration: Trainer Visibility Fixes
-- Allow trainers to see routines and blocks they created for clients or assigned to them

-- 1. ROUTINES: Allow trainers to see routines where they are the 'created_by_trainer' 
-- or they are linked via 'trainer_clients' to the routine owner.
DROP POLICY IF EXISTS "Trainers can view routines they created or managed" ON public.routines;
CREATE POLICY "Trainers can view routines they created or managed"
ON public.routines FOR SELECT
USING (
    auth.uid() = created_by_trainer 
    OR 
    EXISTS (
        SELECT 1 FROM trainer_clients
        WHERE trainer_id = auth.uid() AND client_id = routines.user_id
    )
);

-- 2. ROUTINE BLOCKS: Allow trainers to see blocks for routines they can see
DROP POLICY IF EXISTS "Trainers can view blocks for managed routines" ON public.routine_blocks;
CREATE POLICY "Trainers can view blocks for managed routines"
ON public.routine_blocks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.routines
        WHERE routines.id = routine_blocks.routine_id
        AND (
            routines.created_by_trainer = auth.uid()
            OR 
            EXISTS (
                SELECT 1 FROM trainer_clients
                WHERE trainer_id = auth.uid() AND client_id = routines.user_id
            )
        )
    )
);

-- 3. ROUTINE EXERCISES: Allow trainers to see exercises for blocks they can see
DROP POLICY IF EXISTS "Trainers can view exercises for managed routine blocks" ON public.routine_exercises;
CREATE POLICY "Trainers can view exercises for managed routine blocks"
ON public.routine_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.routine_blocks
        JOIN public.routines ON routines.id = routine_blocks.routine_id
        WHERE routine_blocks.id = routine_exercises.block_id
        AND (
            routines.created_by_trainer = auth.uid()
            OR 
            EXISTS (
                SELECT 1 FROM trainer_clients
                WHERE trainer_id = auth.uid() AND client_id = routines.user_id
            )
        )
    )
);
