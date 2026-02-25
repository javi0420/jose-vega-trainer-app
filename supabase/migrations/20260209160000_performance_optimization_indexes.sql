-- Composite index for personal record queries
CREATE INDEX IF NOT EXISTS idx_sets_pr_lookup 
ON public.sets (block_exercise_id, completed, weight DESC, reps DESC)
WHERE completed = true AND weight > 0;

-- FK index for exercise history
CREATE INDEX IF NOT EXISTS idx_block_exercises_exercise_id 
ON public.block_exercises (exercise_id);

-- Composite index for per-user history ordering
CREATE INDEX IF NOT EXISTS idx_workouts_user_date 
ON public.workouts (user_id, date DESC);
