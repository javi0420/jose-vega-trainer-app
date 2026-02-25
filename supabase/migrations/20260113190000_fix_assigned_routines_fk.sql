-- =====================================================
-- FIX: Assigned Routines Relationship
-- Issue: Frontend 400 Error "Could not find a relationship between 'assigned_routines' and 'profiles'"
-- Cause: The foreign key 'assigned_by' referenced 'auth.users', blocking PostgREST from expanding 'profiles'.
-- Solution: Change FK to reference 'public.profiles(id)'.
-- =====================================================

BEGIN;

-- 1. Drop existing FK constraint (if exists)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assigned_routines_assigned_by_fkey'
    ) THEN
        ALTER TABLE public.assigned_routines DROP CONSTRAINT assigned_routines_assigned_by_fkey;
    END IF;
END $$;

-- 2. Add correct FK constraint referencing profiles
ALTER TABLE public.assigned_routines 
ADD CONSTRAINT assigned_routines_assigned_by_fkey 
FOREIGN KEY (assigned_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

COMMIT;
