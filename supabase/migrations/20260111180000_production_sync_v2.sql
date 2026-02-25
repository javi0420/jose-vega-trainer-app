-- PRODUCTION SYNC V2
-- Harmonizes differences between Local (Source of Truth) and Production schemas.

-- 1. Fix 'trainer_clients.status' missing column
-- Risk: Future queries filtering by status would fail.
ALTER TABLE public.trainer_clients 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Fix 'sets' columns type mismatch (Integer -> Numeric)
-- Risk: Saving decimal values (e.g. 12.5 reps) causes crask in Prod.
ALTER TABLE public.sets 
ALTER COLUMN reps TYPE numeric,
ALTER COLUMN rest_seconds TYPE numeric;

-- 3. Fix 'block_exercises.position' type mismatch (Char(1) -> Text)
-- Risk: Positions like 'A1' or 'Superset' would be truncated or fail.
ALTER TABLE public.block_exercises 
ALTER COLUMN position TYPE text,
ALTER COLUMN position SET DEFAULT 'A';

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload config';
