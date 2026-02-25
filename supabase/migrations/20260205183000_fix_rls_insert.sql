-- Enable INSERT policies for Workouts and related tables (CORRECTED TABLE NAMES)

-- 1. WORKOUTS
DROP POLICY IF EXISTS "Users can insert their own workouts" ON public.workouts;
CREATE POLICY "Users can insert their own workouts" ON public.workouts
FOR INSERT
WITH CHECK ( auth.uid() = user_id );

-- 2. WORKOUT BLOCKS
DROP POLICY IF EXISTS "Users can insert their own workout blocks" ON public.workout_blocks;
CREATE POLICY "Users can insert their own workout blocks" ON public.workout_blocks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workouts
    WHERE workouts.id = workout_blocks.workout_id
    AND workouts.user_id = auth.uid()
  )
);

-- 3. BLOCK EXERCISES (Corrected from workout_exercises)
DROP POLICY IF EXISTS "Users can insert their own block exercises" ON public.block_exercises;
CREATE POLICY "Users can insert their own block exercises" ON public.block_exercises
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_blocks
    JOIN public.workouts ON workouts.id = workout_blocks.workout_id
    WHERE workout_blocks.id = block_exercises.block_id
    AND workouts.user_id = auth.uid()
  )
);

-- 4. SETS (Corrected from workout_sets)
DROP POLICY IF EXISTS "Users can insert their own sets" ON public.sets;
CREATE POLICY "Users can insert their own sets" ON public.sets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.block_exercises
    JOIN public.workout_blocks ON workout_blocks.id = block_exercises.block_id
    JOIN public.workouts ON workouts.id = workout_blocks.workout_id
    WHERE block_exercises.id = sets.block_exercise_id
    AND workouts.user_id = auth.uid()
  )
);
