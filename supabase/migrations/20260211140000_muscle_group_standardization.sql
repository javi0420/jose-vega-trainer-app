-- Migration: Standardize muscle group names
-- Merge 'pierna' and 'perinas' typo into 'piernas' plural.

UPDATE public.exercises
SET muscle_group = 'piernas'
WHERE LOWER(muscle_group) IN ('pierna', 'perinas');

-- Note: No action needed for workouts or routines as they join with exercises via ID.
-- If there are ad-hoc exercises with these names in custom_exercise_name, 
-- they don't have a muscle_group column in block_exercises/routine_exercises.
