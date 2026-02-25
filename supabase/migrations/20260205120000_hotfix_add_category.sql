-- =====================================================
-- Hotfix: Ensure 'category' column exists in exercises
-- Reason: Found missing in local dev, likely due to old table schema not being fully updated by IF NOT EXISTS checks.
-- =====================================================

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exercises' AND column_name='category') THEN
        ALTER TABLE public.exercises ADD COLUMN category text;
    END IF;
END $$;
