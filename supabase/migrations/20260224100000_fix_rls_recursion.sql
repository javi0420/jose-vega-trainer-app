-- =========================================================================================
-- MIGRATION: 20260224100000_fix_rls_recursion.sql
-- PURPOSE: Fix 500 Internal Server Error (Stack Depth Limit Exceeded) on Nested Routines
-- WHY: Prevents RLS explosion by using flat SECURITY DEFINER functions for SELECT policies.
-- =========================================================================================

-- 1. 🧹 LIMPIEZA TOTAL: Eliminar TODAS las políticas actuales para evitar duplicados / recursión
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('routines', 'routine_blocks', 'routine_exercises')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- =========================================================================================
-- 2. ⚡ FUNCIONES OPTIMIZADAS (SECURITY DEFINER)
-- Estas funciones resuelven los accesos en una sola pasada, saltando la cadena de RLS
-- recursiva, y devolviendo simplemente la lista de UUIDs autorizados para el usuario.
-- =========================================================================================

-- Función A: Obtiene todos los UUIDs de Rutinas que el usuario puede VER
CREATE OR REPLACE FUNCTION public.get_readable_routines()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER -- Ejecuta como admin, evitando inyectar RLS en estas subqueries
SET search_path = public
AS $$
    -- 1. Rutinas propias
    SELECT r.id FROM public.routines r WHERE r.user_id = auth.uid()
    UNION
    -- 2. Rutinas asignadas (soy el cliente)
    SELECT ar.routine_id FROM public.assigned_routines ar WHERE ar.client_id = auth.uid()
    UNION
    -- 3. Rutinas de mis clientes (soy el entrenador)
    SELECT r.id FROM public.routines r
    JOIN public.trainer_clients tc ON tc.client_id = r.user_id
    WHERE tc.trainer_id = auth.uid()
    UNION
    -- 4. Rutinas públicas (Si existe la columna, prevención a futuro)
    SELECT r.id FROM public.routines r WHERE r.is_public = true;
$$;

-- Función B: Obtiene todos los UUIDs de Bloques que el usuario puede VER
CREATE OR REPLACE FUNCTION public.get_readable_routine_blocks()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rb.id FROM public.routine_blocks rb
    WHERE rb.routine_id IN (SELECT public.get_readable_routines());
$$;


-- =========================================================================================
-- 3. 🛡️ NUEVAS POLÍTICAS `SELECT` (Lectura hiper-rápida y plana)
-- =========================================================================================

CREATE POLICY "Flat Select routines" 
ON public.routines FOR SELECT 
USING (id IN (SELECT public.get_readable_routines()));

CREATE POLICY "Flat Select routine_blocks" 
ON public.routine_blocks FOR SELECT 
USING (id IN (SELECT public.get_readable_routine_blocks()));

CREATE POLICY "Flat Select routine_exercises" 
ON public.routine_exercises FOR SELECT 
USING (block_id IN (SELECT public.get_readable_routine_blocks()));


-- =========================================================================================
-- 4. ✍️ NUEVAS POLÍTICAS `ALL` (Insert, Update, Delete)
-- Estas siguen usando RLS normal porque no se hacen mediante deep joins desde el FrontEnd.
-- =========================================================================================

-- -------------------
-- TABLA: Routines
-- -------------------
CREATE POLICY "Manage own routines" 
ON public.routines FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Manage clients routines" 
ON public.routines FOR ALL 
USING (EXISTS (SELECT 1 FROM public.trainer_clients WHERE trainer_id = auth.uid() AND client_id = routines.user_id)) 
WITH CHECK (EXISTS (SELECT 1 FROM public.trainer_clients WHERE trainer_id = auth.uid() AND client_id = routines.user_id));

-- -------------------
-- TABLA: Routine Blocks
-- -------------------
CREATE POLICY "Manage own routine blocks" 
ON public.routine_blocks FOR ALL 
USING (routine_id IN (SELECT id FROM public.routines WHERE user_id = auth.uid())) 
WITH CHECK (routine_id IN (SELECT id FROM public.routines WHERE user_id = auth.uid()));

CREATE POLICY "Manage clients routine blocks" 
ON public.routine_blocks FOR ALL 
USING (routine_id IN (
    SELECT r.id FROM public.routines r
    JOIN public.trainer_clients tc ON tc.client_id = r.user_id
    WHERE tc.trainer_id = auth.uid()
)) 
WITH CHECK (routine_id IN (
    SELECT r.id FROM public.routines r
    JOIN public.trainer_clients tc ON tc.client_id = r.user_id
    WHERE tc.trainer_id = auth.uid()
));

-- -------------------
-- TABLA: Routine Exercises
-- -------------------
CREATE POLICY "Manage own routine exercises" 
ON public.routine_exercises FOR ALL 
USING (block_id IN (
    SELECT rb.id FROM public.routine_blocks rb
    JOIN public.routines r ON r.id = rb.routine_id
    WHERE r.user_id = auth.uid()
)) 
WITH CHECK (block_id IN (
    SELECT rb.id FROM public.routine_blocks rb
    JOIN public.routines r ON r.id = rb.routine_id
    WHERE r.user_id = auth.uid()
));

CREATE POLICY "Manage clients routine exercises" 
ON public.routine_exercises FOR ALL 
USING (block_id IN (
    SELECT rb.id FROM public.routine_blocks rb
    JOIN public.routines r ON r.id = rb.routine_id
    JOIN public.trainer_clients tc ON tc.client_id = r.user_id
    WHERE tc.trainer_id = auth.uid()
)) 
WITH CHECK (block_id IN (
    SELECT rb.id FROM public.routine_blocks rb
    JOIN public.routines r ON r.id = rb.routine_id
    JOIN public.trainer_clients tc ON tc.client_id = r.user_id
    WHERE tc.trainer_id = auth.uid()
));
