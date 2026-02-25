-- Hotfix: Add created_at to block_exercises if missing
-- This is required for the 'Copy Last' feature optimization
ALTER TABLE public.block_exercises 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
