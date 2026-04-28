-- Update search_exercises RPC to be extremely robust with lower() and unaccent()
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
    -- Force lowercase and unaccent for the search term
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
