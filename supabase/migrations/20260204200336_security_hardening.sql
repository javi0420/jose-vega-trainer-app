-- 1. Fix Mutable Search Path in Functions (Security)
-- Setting explicit search_path prevents hijacking attacks

ALTER FUNCTION public.create_routine_from_workout(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.notify_trainer_on_feedback() SET search_path = public;
ALTER FUNCTION public.save_full_workout(uuid, text, timestamp with time zone, integer, text, jsonb, text) SET search_path = public;
ALTER FUNCTION public.get_trainer_activity(uuid, integer) SET search_path = public;
ALTER FUNCTION public.mark_feedback_as_viewed(uuid) SET search_path = public;
ALTER FUNCTION public.duplicate_routine(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_trainer_stats_workouts(uuid, timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.get_last_exercise_session(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_client_as_trainer(text, text) SET search_path = public;
ALTER FUNCTION public.get_exercise_history(uuid, uuid) SET search_path = public;


-- 2. Tighten RLS on Exercises (Prevent "Always True" policies)

-- DROP ALL possible policy names to avoid "already exists" errors
DROP POLICY IF EXISTS "Allow authenticated users to insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Allow authenticated users to update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Allow authenticated users to delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can create their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;

-- RE-CREATE with stricter checks

-- INSERT: Authenticated users can create exercises
-- We don't over-complicate here, just ensure they are logged in. 
-- The 'created_by' field is handled by table defaults or triggers.
CREATE POLICY "Authenticated users can create exercises"
ON public.exercises
FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- UPDATE: Users can ONLY update exercises they created
CREATE POLICY "Users can update their own exercises"
ON public.exercises
FOR UPDATE
USING ( auth.uid() = created_by );

-- DELETE: Users can ONLY delete exercises they created
-- (Prevents deleting system exercises)
CREATE POLICY "Users can delete their own exercises"
ON public.exercises
FOR DELETE
USING ( auth.uid() = created_by );
