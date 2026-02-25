-- Migration: Add RLS for trainer client management
-- Created: 2026-01-14

-- Ensure trainers can UPDATE the 'is_active' column for their clients
DROP POLICY IF EXISTS "Trainers can toggle client status" ON public.profiles;

CREATE POLICY "Trainers can toggle client status"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM trainer_clients 
        WHERE trainer_id = auth.uid() 
        AND client_id = id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM trainer_clients 
        WHERE trainer_id = auth.uid() 
        AND client_id = id
    )
);

-- Note: The schema cache usually reloads automatically after DDL.
-- If it doesn't, a 'supabase stop' and 'supabase start' might be needed.
