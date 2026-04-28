-- =====================================================
-- Migration: Auditoria Seguridad y Rendimiento
-- Fecha: 2026-04-28
-- =====================================================

BEGIN;

-- 1. RLS EN PUBLIC.PROFILES (Crítico)
-- Eliminar políticas de lectura pública existentes
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' AND (cmd = 'SELECT' OR cmd = 'ALL')
    LOOP 
        EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname); 
    END LOOP; 
END $$;

-- Crear política de SELECT restringida
CREATE POLICY "Profiles viewable by owner or related trainer_client"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id 
    OR 
    EXISTS (
        SELECT 1 FROM public.trainer_clients 
        WHERE (trainer_id = auth.uid() AND client_id = profiles.id)
        OR (client_id = auth.uid() AND trainer_id = profiles.id)
    )
);


-- 2. RLS EN PUBLIC.EXERCISES (Media)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes de SELECT
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'exercises' AND schemaname = 'public' AND cmd = 'SELECT'
    LOOP 
        EXECUTE format('DROP POLICY %I ON public.exercises', pol.policyname); 
    END LOOP; 
END $$;

-- Nueva política SELECT exclusiva para authenticated
CREATE POLICY "Authenticated users can view exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (true);


-- 3. INTEGRIDAD EN PUBLIC.WORKOUTS (Media)
-- Cambiar el borrado en cascada por RESTRICT para proteger el historial
DO $$ 
BEGIN 
    -- Eliminar cualquier versión de la FK existente
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='workouts_user_id_fkey_profiles') THEN
        ALTER TABLE public.workouts DROP CONSTRAINT workouts_user_id_fkey_profiles;
    ELSIF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='workouts_user_id_fkey') THEN
        ALTER TABLE public.workouts DROP CONSTRAINT workouts_user_id_fkey;
    END IF;

    -- Recrear con ON DELETE RESTRICT
    ALTER TABLE public.workouts 
        ADD CONSTRAINT workouts_user_id_fkey_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE RESTRICT;
END $$;


-- 4. ÍNDICES DE RENDIMIENTO
-- a) Optimización de búsqueda Trainer-Client para RLS
CREATE INDEX IF NOT EXISTS idx_trainer_clients_lookup 
ON public.trainer_clients (trainer_id, client_id);

-- b) Optimización para cálculos de volumen y PRs
CREATE INDEX IF NOT EXISTS idx_sets_completion_volume 
ON public.sets (completed, weight, reps) 
WHERE (completed = true);

-- c) Optimización para el feed de actividad del entrenador
CREATE INDEX IF NOT EXISTS idx_workouts_activity_feed 
ON public.workouts (user_id, date DESC) 
WHERE (status = 'completed');

COMMIT;
