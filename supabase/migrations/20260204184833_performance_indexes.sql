-- Índice crítico para RLS y filtros de clientes
CREATE INDEX IF NOT EXISTS idx_trainer_clients_client_id ON public.trainer_clients(client_id);
-- Índice para filtrar ejercicios por creador
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);
-- Índice para el estado de los workouts (Dashboard)
CREATE INDEX IF NOT EXISTS idx_workouts_status ON public.workouts(status);
