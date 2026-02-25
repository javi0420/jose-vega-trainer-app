-- =====================================================
-- EXTREME PERFORMANCE AUDIT 2026-02-05
-- Goal: 50-100 Concurrent Users on Free Tier
-- Strategy: Laser Surgery Indexes & RLS Optimization
-- =====================================================

-- -----------------------------------------------------
-- 1. FOREIGN KEY INDEXES (CRITICAL FOR JOIN PERFORMANCE)
-- -----------------------------------------------------

-- Exercises: created_by used in RLS "auth.uid() = created_by" (often implicit or explicitly null check)
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);

-- Trainer Clients: status used often for filtering active clients
CREATE INDEX IF NOT EXISTS idx_trainer_clients_trainer_status ON public.trainer_clients(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_trainer_clients_client_status ON public.trainer_clients(client_id, status);

-- Workouts: Composite index for Status + Date (Used in History View)
CREATE INDEX IF NOT EXISTS idx_workouts_user_status_date ON public.workouts(user_id, status, date DESC);

-- Block Exercises: exercise_id is already indexed in sync_v1, but ensure position for ordering
CREATE INDEX IF NOT EXISTS idx_block_exercises_block_position ON public.block_exercises(block_id, position);

-- Routine Exercises: exercise_id for when deleting exercises (ON DELETE SET NULL triggers scan)
-- Also critical for expanding exercises in RPCs
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_id ON public.routine_exercises(exercise_id);
-- Index for ordering within a block
CREATE INDEX IF NOT EXISTS idx_routine_exercises_block_position ON public.routine_exercises(block_id, position);

-- Assigned Routines: Composite for filtering by client and viewed status
CREATE INDEX IF NOT EXISTS idx_assigned_routines_client_viewed ON public.assigned_routines(client_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_assigned_routines_assigned_by ON public.assigned_routines(assigned_by);

-- -----------------------------------------------------
-- 2. RLS OPTIMIZATION (Composite Indexes for Policy Filters)
-- -----------------------------------------------------

-- Profiles: Role lookups are frequent
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- -----------------------------------------------------
-- 3. DATA TYPE OPTIMIZATION REVIEWS (Comments only)
-- -----------------------------------------------------
-- "text" vs "varchar": In Postgres, text and varchar are performance-equivalent. 
-- "text" is preferred over "varchar(n)" unless a strict business limit is needed for data integrity.
-- We are keeping "text" to avoid arbitrary limits, as it does not waste space (toast storage).

-- -----------------------------------------------------
-- 4. VACUUM ANALYZE (Force stats update for Planner)
-- -----------------------------------------------------
-- This will run when migration is applied to ensure planner knows about new indexes immediately.
ANALYZE;
