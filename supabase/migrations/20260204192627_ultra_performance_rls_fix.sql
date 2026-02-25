-- Optimizamos el RLS de routine_exercises para que no haga joins infinitos
-- Utilizamos una técnica de "lookup" más directa
DROP POLICY IF EXISTS "Users can CRUD own routine exercises" ON public.routine_exercises;

CREATE POLICY "Users can CRUD own routine exercises"
  ON routine_exercises FOR ALL
  USING (
    block_id IN (
      SELECT rb.id 
      FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      WHERE r.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM trainer_clients 
        WHERE trainer_id = auth.uid() AND client_id = r.user_id
      )
    )
  );

-- Índice olvidado: La clave para que la política SELECT sea rápida
CREATE INDEX IF NOT EXISTS idx_routine_blocks_composite_auth ON public.routine_blocks(id, routine_id);

-- Estadística de Postgres: Forzamos a que el optimizador use los índices
ANALYZE public.routines;
ANALYZE public.routine_blocks;
ANALYZE public.routine_exercises;
ANALYZE public.trainer_clients;
