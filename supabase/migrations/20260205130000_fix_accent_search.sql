-- =====================================================
-- Migration: Fix Accent-Insensitive Search & Search Logic
-- Purpose: Enable 'unaccent' extension and provide RPC for flexible exercise search.
-- =====================================================

-- 1. Enable Unaccent Extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Create Search RPC
-- We use a function to handle:
--   - Accent insensitivity (unaccent)
--   - Case insensitivity (ilike)
--   - Partial matching (%term%)
--   - Pagination
CREATE OR REPLACE FUNCTION public.search_exercises(
    search_term text,
    p_offset int DEFAULT 0,
    p_limit int DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    name text,
    muscle_group text,
    category text,
    description text,
    video_url text,
    is_active boolean,
    total_count bigint
) AS $$
DECLARE
    v_clean_term text;
BEGIN
    -- Remove accents from search term and add wildcards
    v_clean_term := '%' || unaccent(search_term) || '%';

    RETURN QUERY
    WITH filtered_exercises AS (
        SELECT 
            e.id, 
            e.name, 
            e.muscle_group, 
            e.category, 
            e.description, 
            e.video_url,
            e.is_active
        FROM public.exercises e
        WHERE 
            e.is_active = true 
            AND (
                unaccent(e.name) ILIKE v_clean_term 
                OR 
                unaccent(e.muscle_group) ILIKE v_clean_term
            )
    ),
    total AS (
        SELECT count(*) as count FROM filtered_exercises
    )
    SELECT 
        f.id,
        f.name,
        f.muscle_group,
        f.category,
        f.description,
        f.video_url,
        f.is_active,
        t.count as total_count
    FROM filtered_exercises f
    CROSS JOIN total t
    ORDER BY f.name ASC
    OFFSET p_offset
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Security
-- Grant execute permissions (adjust public if needed, ideally specific roles)
GRANT EXECUTE ON FUNCTION public.search_exercises(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_exercises(text, int, int) TO service_role;
