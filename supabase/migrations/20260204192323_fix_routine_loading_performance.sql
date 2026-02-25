-- Optimización para carga de plantillas y rutinas (Timeout Fix)
-- Índices para claves foráneas en el sistema de rutinas
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_blocks_routine_id ON public.routine_blocks(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_block_id ON public.routine_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_id ON public.routine_exercises(exercise_id);

-- Índice para ordenamiento en la carga de ejercicios de la rutina
-- Este índice acelera directamente la consulta que está dando timeout
CREATE INDEX IF NOT EXISTS idx_routine_exercises_block_position ON public.routine_exercises(block_id, position ASC);

-- Índice para optimizar el RLS de entrenadores
CREATE INDEX IF NOT EXISTS idx_trainer_clients_trainer_id ON public.trainer_clients(trainer_id);
