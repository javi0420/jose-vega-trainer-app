-- Migration: Translate exercise categories, muscles and equipment to Spanish (Single Block)
-- Purpose: Enable native Spanish search and display without frontend-only mapping bottlenecks

DO $$
BEGIN
    -- 1. Translate body_part
    UPDATE exercises SET body_part = 'pecho' WHERE body_part = 'chest';
    UPDATE exercises SET body_part = 'espalda' WHERE body_part = 'back';
    UPDATE exercises SET body_part = 'cintura' WHERE body_part = 'waist';
    UPDATE exercises SET body_part = 'brazos' WHERE body_part = 'upper arms';
    UPDATE exercises SET body_part = 'antebrazos' WHERE body_part = 'lower arms';
    UPDATE exercises SET body_part = 'hombros' WHERE body_part = 'shoulders';
    UPDATE exercises SET body_part = 'pantorrillas' WHERE body_part = 'lower legs';
    UPDATE exercises SET body_part = 'piernas' WHERE body_part = 'upper legs';
    UPDATE exercises SET body_part = 'cuello' WHERE body_part = 'neck';
    UPDATE exercises SET body_part = 'cardio' WHERE body_part = 'cardio';

    -- 2. Translate target_muscle
    UPDATE exercises SET target_muscle = 'aductores' WHERE target_muscle = 'adductors';
    UPDATE exercises SET target_muscle = 'isquiotibiales' WHERE target_muscle = 'hamstrings';
    UPDATE exercises SET target_muscle = 'antebrazos' WHERE target_muscle = 'forearms';
    UPDATE exercises SET target_muscle = 'serrato anterior' WHERE target_muscle = 'serratus anterior';
    UPDATE exercises SET target_muscle = 'abdominales' WHERE target_muscle = 'abs';
    UPDATE exercises SET target_muscle = 'elevador de la escápula' WHERE target_muscle = 'levator scapulae';
    UPDATE exercises SET target_muscle = 'glúteos' WHERE target_muscle = 'glutes';
    UPDATE exercises SET target_muscle = 'espalda superior' WHERE target_muscle = 'upper back';
    UPDATE exercises SET target_muscle = 'sistema cardiovascular' WHERE target_muscle = 'cardiovascular system';
    UPDATE exercises SET target_muscle = 'trapecios' WHERE target_muscle = 'traps';
    UPDATE exercises SET target_muscle = 'abductores' WHERE target_muscle = 'abductors';
    UPDATE exercises SET target_muscle = 'dorsales' WHERE target_muscle = 'lats';
    UPDATE exercises SET target_muscle = 'gemelos' WHERE target_muscle = 'calves';
    UPDATE exercises SET target_muscle = 'tríceps' WHERE target_muscle = 'triceps';
    UPDATE exercises SET target_muscle = 'bíceps' WHERE target_muscle = 'biceps';
    UPDATE exercises SET target_muscle = 'columna' WHERE target_muscle = 'spine';
    UPDATE exercises SET target_muscle = 'pectorales' WHERE target_muscle = 'pectorals';
    UPDATE exercises SET target_muscle = 'cuádriceps' WHERE target_muscle = 'quads';
    UPDATE exercises SET target_muscle = 'deltoides' WHERE target_muscle = 'delts';
    UPDATE exercises SET target_muscle = 'deltoides' WHERE target_muscle = 'deltoids';

    -- 3. Translate equipment
    UPDATE exercises SET equipment = 'cuerda' WHERE equipment = 'rope';
    UPDATE exercises SET equipment = 'elíptica' WHERE equipment = 'elliptical machine';
    UPDATE exercises SET equipment = 'balón medicinal' WHERE equipment = 'medicine ball';
    UPDATE exercises SET equipment = 'pesa rusa' WHERE equipment = 'kettlebell';
    UPDATE exercises SET equipment = 'máquina de palanca' WHERE equipment = 'leverage machine';
    UPDATE exercises SET equipment = 'rueda abdominal' WHERE equipment = 'wheel roller';
    UPDATE exercises SET equipment = 'asistido' WHERE equipment = 'assisted';
    UPDATE exercises SET equipment = 'barra' WHERE equipment = 'barbell';
    UPDATE exercises SET equipment = 'bosu' WHERE equipment = 'bosu ball';
    UPDATE exercises SET equipment = 'banda de resistencia' WHERE equipment = 'resistance band';
    UPDATE exercises SET equipment = 'máquina smith' WHERE equipment = 'smith machine';
    UPDATE exercises SET equipment = 'trineo' WHERE equipment = 'sled machine';
    UPDATE exercises SET equipment = 'fitball' WHERE equipment = 'stability ball';
    UPDATE exercises SET equipment = 'barra olímpica' WHERE equipment = 'olympic barbell';
    UPDATE exercises SET equipment = 'barra hexagonal' WHERE equipment = 'trap bar';
    UPDATE exercises SET equipment = 'peso corporal' WHERE equipment = 'body weight';
    UPDATE exercises SET equipment = 'bicicleta estática' WHERE equipment = 'stationary bike';
    UPDATE exercises SET equipment = 'mancuerna' WHERE equipment = 'dumbbell';
    UPDATE exercises SET equipment = 'polea' WHERE equipment = 'cable';
    UPDATE exercises SET equipment = 'máquina' WHERE equipment = 'machine';
    UPDATE exercises SET equipment = 'barra EZ' WHERE equipment = 'ez barbell';
    UPDATE exercises SET equipment = 'rodillo' WHERE equipment = 'roller';
    UPDATE exercises SET equipment = 'con lastre' WHERE equipment = 'weighted';
    UPDATE exercises SET equipment = 'comba' WHERE equipment = 'skipping rope';
END $$;

-- 5. Update Search RPC to be even more powerful (this is a separate command)
CREATE OR REPLACE FUNCTION public.search_exercises(
    search_term text,
    p_offset int DEFAULT 0,
    p_limit int DEFAULT 20
)
RETURNS TABLE (
    id text,
    name text,
    name_es text,
    body_part text,
    target_muscle text,
    equipment text,
    gif_url text,
    instructions text[],
    instructions_es text[],
    secondary_muscles text[],
    total_count bigint
) AS $$
DECLARE
    v_clean_term text;
BEGIN
    v_clean_term := '%' || lower(unaccent(search_term)) || '%';

    RETURN QUERY
    WITH filtered_exercises AS (
        SELECT 
            e.id, 
            e.name, 
            e.name_es,
            e.body_part, 
            e.target_muscle, 
            e.equipment, 
            e.gif_url,
            e.instructions,
            e.instructions_es,
            e.secondary_muscles
        FROM public.exercises e
        WHERE 
            lower(unaccent(COALESCE(e.name, ''))) LIKE v_clean_term 
            OR lower(unaccent(COALESCE(e.name_es, ''))) LIKE v_clean_term
            OR lower(unaccent(COALESCE(e.target_muscle, ''))) LIKE v_clean_term
            OR lower(unaccent(COALESCE(e.body_part, ''))) LIKE v_clean_term
            OR lower(unaccent(COALESCE(e.equipment, ''))) LIKE v_clean_term
    ),
    total AS (
        SELECT count(*) as count FROM filtered_exercises
    )
    SELECT 
        f.id,
        f.name,
        f.name_es,
        f.body_part,
        f.target_muscle,
        f.equipment,
        f.gif_url,
        f.instructions,
        f.instructions_es,
        f.secondary_muscles,
        t.count as total_count
    FROM filtered_exercises f
    CROSS JOIN total t
    ORDER BY COALESCE(f.name_es, f.name) ASC
    OFFSET p_offset
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
