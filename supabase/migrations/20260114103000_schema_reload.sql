-- Nudge PostgREST to reload schema
CREATE TABLE IF NOT EXISTS public._pgrst_nudge (id int);
DROP TABLE public._pgrst_nudge;

-- Ensure no nulls in is_active
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;
