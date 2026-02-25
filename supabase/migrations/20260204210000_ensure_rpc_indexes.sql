-- Ensure all Foreign Keys in the PR query chain are indexed for maximum speed
-- Chain: sets -> block_exercises -> workout_blocks -> workouts

-- 1. Index sets.block_exercise_id (Often largest table)
CREATE INDEX IF NOT EXISTS idx_sets_block_exercise_id ON public.sets(block_exercise_id);

-- 2. Index sets.weight (for sorting/filtering > 0)
CREATE INDEX IF NOT EXISTS idx_sets_weight ON public.sets(weight);

-- 3. Composite index for sets lookup (optional but good for specific query)
CREATE INDEX IF NOT EXISTS idx_sets_lookup_pr ON public.sets(block_exercise_id, weight DESC) WHERE completed = true;

-- 4. Index block_exercises.block_id
CREATE INDEX IF NOT EXISTS idx_block_exercises_block_id ON public.block_exercises(block_id);

-- 5. Index block_exercises.exercise_id (Crucial filter)
CREATE INDEX IF NOT EXISTS idx_block_exercises_exercise_id ON public.block_exercises(exercise_id);

-- 6. Index workout_blocks.workout_id
CREATE INDEX IF NOT EXISTS idx_workout_blocks_workout_id ON public.workout_blocks(workout_id);

-- 7. Index workouts.user_id (Crucial filter)
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
