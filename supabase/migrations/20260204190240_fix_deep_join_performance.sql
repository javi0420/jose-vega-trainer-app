-- Índices para claves foráneas (FKs) - Optimizan los joins profundos
CREATE INDEX IF NOT EXISTS idx_sets_block_exercise_id ON public.sets(block_exercise_id);
CREATE INDEX IF NOT EXISTS idx_block_exercises_block_id ON public.block_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_workout_blocks_workout_id ON public.workout_blocks(workout_id);

-- Índice de ordenamiento para cálculos de récord personal (PR)
CREATE INDEX IF NOT EXISTS idx_sets_weight_desc ON public.sets(weight DESC);

-- Índice compuesto para acelerar el filtrado por ejercicio en bloques de entrenamiento
CREATE INDEX IF NOT EXISTS idx_block_exercises_ref_lookup ON public.block_exercises(exercise_id, block_id);
