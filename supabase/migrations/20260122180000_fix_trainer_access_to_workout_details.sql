-- FIX: Trainer access to workout details (blocks, exercises, sets)
-- Issue: Trainers can see the 'workout' record but not the contents because child tables only check user_id = auth.uid()

BEGIN;

-- 1. WORKOUT BLOCKS
DROP POLICY IF EXISTS "Users can view their own workout blocks" ON public.workout_blocks;
DROP POLICY IF EXISTS "Users and Trainers can view workout blocks" ON public.workout_blocks;
CREATE POLICY "Users and Trainers can view workout blocks"
ON public.workout_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_blocks.workout_id
    AND (
      w.user_id = auth.uid() -- Owner
      OR
      EXISTS ( -- Trainer of the owner
        SELECT 1 FROM public.trainer_clients tc
        WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = w.user_id
      )
    )
  )
);

-- 2. BLOCK EXERCISES
DROP POLICY IF EXISTS "Users can view their own block exercises" ON public.block_exercises;
DROP POLICY IF EXISTS "Users and Trainers can view block exercises" ON public.block_exercises;
CREATE POLICY "Users and Trainers can view block exercises"
ON public.block_exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workout_blocks wb
    JOIN public.workouts w ON w.id = wb.workout_id
    WHERE wb.id = block_exercises.block_id
    AND (
      w.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.trainer_clients tc
        WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = w.user_id
      )
    )
  )
);

-- 3. SETS
DROP POLICY IF EXISTS "Users can view their own sets" ON public.sets;
DROP POLICY IF EXISTS "Users and Trainers can view sets" ON public.sets;
CREATE POLICY "Users and Trainers can view sets"
ON public.sets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.block_exercises be
    JOIN public.workout_blocks wb ON wb.id = be.block_id
    JOIN public.workouts w ON w.id = wb.workout_id
    WHERE be.id = sets.block_exercise_id
    AND (
      w.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.trainer_clients tc
        WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = w.user_id
      )
    )
  )
);

COMMIT;

NOTIFY pgrst, 'reload config';
