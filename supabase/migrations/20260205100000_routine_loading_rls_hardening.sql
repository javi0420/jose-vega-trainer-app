-- RLS Hardening for Routine Visibility
-- Allows clients to see:
-- 1. Routines they own (user_id = auth.uid())
-- 2. Routines assigned to them by trainers (via assigned_routines)

-- 1. ROUTINES
DROP POLICY IF EXISTS "Clients can view assigned routines metadata" ON public.routines;
CREATE POLICY "Clients can view assigned routines metadata" 
ON public.routines 
FOR SELECT 
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.assigned_routines 
        WHERE routine_id = routines.id 
        AND client_id = auth.uid()
    )
);

-- 2. ROUTINE BLOCKS
DROP POLICY IF EXISTS "Clients can view assigned routine blocks" ON public.routine_blocks;
CREATE POLICY "Clients can view assigned routine blocks" 
ON public.routine_blocks 
FOR SELECT 
USING (
    routine_id IN (
        SELECT id FROM public.routines 
        WHERE user_id = auth.uid()
        OR id IN (SELECT routine_id FROM public.assigned_routines WHERE client_id = auth.uid())
    )
);

-- 3. ROUTINE EXERCISES
DROP POLICY IF EXISTS "Clients can view assigned routine exercises" ON public.routine_exercises;
CREATE POLICY "Clients can view assigned routine exercises" 
ON public.routine_exercises 
FOR SELECT 
USING (
    block_id IN (
        SELECT rb.id FROM public.routine_blocks rb
        JOIN public.routines r ON r.id = rb.routine_id
        WHERE r.user_id = auth.uid()
        OR r.id IN (SELECT routine_id FROM public.assigned_routines WHERE client_id = auth.uid())
    )
);
