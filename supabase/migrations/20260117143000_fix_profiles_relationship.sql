-- Add explicit FK to allow PostgREST to embed profiles from workouts
-- This resolves the "Could not find a relationship" error when doing select=*,profiles:user_id(...)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='workouts_user_id_fkey_profiles') THEN
        ALTER TABLE public.workouts 
        ADD CONSTRAINT workouts_user_id_fkey_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id);
    END IF;
END $$;
