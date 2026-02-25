-- Migration to fix missing columns on the 'workouts' table
-- production_sync_v1.sql's CREATE TABLE IF NOT EXISTS was silently ignored 
-- by Postgres because remote_schema.sql had already created 'workouts'.
-- This restores the missing columns.

DO $$ 
BEGIN 
    -- 1. Add started_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='started_at') THEN
        ALTER TABLE public.workouts ADD COLUMN started_at timestamptz DEFAULT now();
    END IF;

    -- 2. Add completed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='completed_at') THEN
        ALTER TABLE public.workouts ADD COLUMN completed_at timestamptz;
    END IF;

    -- 3. Add note
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='note') THEN
        ALTER TABLE public.workouts ADD COLUMN note text;
    END IF;

    -- 4. Add client_read_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='client_read_at') THEN
        ALTER TABLE public.workouts ADD COLUMN client_read_at timestamptz;
    END IF;

    -- 5. Add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='updated_at') THEN
        ALTER TABLE public.workouts ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;
