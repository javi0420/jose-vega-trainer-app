-- Add is_active column to exercises for soft delete support
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing exercises to be active
UPDATE public.exercises SET is_active = true WHERE is_active IS NULL;

-- Update search_exercises RPC to filter by is_active (if desired in catalog)
-- For now, let's just make sure the column exists so frontend doesn't break
