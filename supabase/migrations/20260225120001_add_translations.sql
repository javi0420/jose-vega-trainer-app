-- Add translations columns to exercises table
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS name_es text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS instructions_es text[];

-- DROP first because we are changing the return type (adding name_es and instructions_es)
DROP FUNCTION IF EXISTS public.search_exercises(text, int, int);

-- Update search_exercises RPC to include name_es and search in it
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
    v_clean_term := '%' || unaccent(search_term) || '%';

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
            unaccent(e.name) ILIKE v_clean_term 
            OR unaccent(e.name_es) ILIKE v_clean_term
            OR unaccent(e.target_muscle) ILIKE v_clean_term
            OR unaccent(e.body_part) ILIKE v_clean_term
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
