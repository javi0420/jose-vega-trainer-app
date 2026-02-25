-- Fix search_path to include 'extensions' for pgcrypto functions (crypt, gen_salt, gen_random_uuid)
-- This fixes the regression where create_client_as_trainer failed silently or errored.

ALTER FUNCTION public.create_client_as_trainer(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.create_routine_from_workout(uuid, text, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.save_full_workout(uuid, text, timestamp with time zone, integer, text, jsonb, text) SET search_path = public, extensions;
ALTER FUNCTION public.duplicate_routine(uuid, text) SET search_path = public, extensions;

-- Others might not strictly need it if they don't use extensions, but good practice for consistency if they use UUIDs
ALTER FUNCTION public.notify_trainer_on_feedback() SET search_path = public, extensions;
ALTER FUNCTION public.get_trainer_activity(uuid, integer) SET search_path = public, extensions;
ALTER FUNCTION public.mark_feedback_as_viewed(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_trainer_stats_workouts(uuid, timestamp with time zone) SET search_path = public, extensions;
ALTER FUNCTION public.get_last_exercise_session(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_exercise_history(uuid, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.get_exercise_pr(uuid) SET search_path = public, extensions;
