-- =====================================================
-- PERFORMANCE OPTIMIZATION AUDIT FIXES
-- Purpose: Optimize RLS policies and foreign key lookups
-- Created: 2026-01-29
-- =====================================================

BEGIN;

-- 1. CRITICAL: Missing Index on trainer_clients(client_id)
-- Why: RLS policies often check "Does current user (trainer) have access to this client?"
-- Without this, every RLS check on profiles/workouts for trainers performs a sequential scan on trainer_clients.
CREATE INDEX IF NOT EXISTS idx_trainer_clients_client_id ON public.trainer_clients(client_id);

-- 2. EXERCISES: Index on created_by
-- Why: To speed up listing "My Exercises" or system exercises.
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);

-- 3. WORKOUTS: Index on status
-- Why: Dashboard frequently filters by 'active' (current session) or 'completed'.
CREATE INDEX IF NOT EXISTS idx_workouts_status ON public.workouts(status);

-- 4. ROUTINES: Array Index for tags
-- Why: If the app searches by tags (e.g., 'upper body'), a GIN index is required for performance.
CREATE INDEX IF NOT EXISTS idx_routines_tags ON public.routines USING GIN (tags);

-- 5. ASSIGNED ROUTINES: Optimization for trainer tracking
-- Why: Trainers need to see what they have assigned to who efficiently.
-- Note: client_id and routine_id are already indexed. Adding assigned_by explicitly if not already covered.
CREATE INDEX IF NOT EXISTS idx_assigned_routines_assigned_at ON public.assigned_routines(assigned_at DESC);

-- 6. RLS REFINEMENT: Cache auth roles
-- Many policies check roles. While auth.jwt() is fast, ensuring simple comparisons helps.
-- (No specific SQL change needed here, but noted for future logic refinements)

COMMIT;

-- Explicación Técnica:
-- Los índices añadidos eliminan los "Sequential Scans" en las validaciones de políticas RLS.
-- Especialmente 'idx_trainer_clients_client_id' es vital ya que se usa en subconsultas de RLS
-- que se ejecutan por cada fila devuelta en tablas de perfiles y entrenamientos.
