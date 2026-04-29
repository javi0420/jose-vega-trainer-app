-- Simplify RLS for routine blocks to ensure visibility for clients
DROP POLICY IF EXISTS "Clients can view assigned routine blocks" ON public.routine_blocks;
CREATE POLICY "Clients can view assigned routine blocks" 
ON public.routine_blocks 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.assigned_routines 
        WHERE routine_id = routine_blocks.routine_id 
        AND client_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.routines
        WHERE id = routine_blocks.routine_id
        AND user_id = auth.uid()
    )
);

-- Do the same for exercises
DROP POLICY IF EXISTS "Clients can view assigned routine exercises" ON public.routine_exercises;
CREATE POLICY "Clients can view assigned routine exercises" 
ON public.routine_exercises 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.routine_blocks rb
        JOIN public.assigned_routines ar ON ar.routine_id = rb.routine_id
        WHERE rb.id = routine_exercises.block_id
        AND ar.client_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.routine_blocks rb
        JOIN public.routines r ON r.id = rb.routine_id
        WHERE rb.id = routine_exercises.block_id
        AND r.user_id = auth.uid()
    )
);
