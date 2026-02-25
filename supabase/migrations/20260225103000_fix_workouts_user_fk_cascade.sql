-- Migration: Fix workouts_user_id_fkey_profiles constraint to ON DELETE CASCADE
-- Purpose: Allow a trainer to delete a client profile without foreign key violations by cascading deletions to workouts.

DO $$ 
BEGIN 
    -- 1. Drop the existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='workouts_user_id_fkey_profiles') THEN
        ALTER TABLE public.workouts DROP CONSTRAINT workouts_user_id_fkey_profiles;
    END IF;

    -- 2. Add the constraint back with ON DELETE CASCADE
    ALTER TABLE public.workouts 
        ADD CONSTRAINT workouts_user_id_fkey_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE;
END $$;
