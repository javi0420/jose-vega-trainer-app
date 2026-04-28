-- Migration: Stabilize Exercises table and Search
-- Created: 2026-04-27
-- Purpose: Add missing columns, RLS policies and robust search RPC

-- 1. Add created_by column if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'created_by') THEN
        ALTER TABLE public.exercises ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Anyone can view exercises" ON exercises;
CREATE POLICY "Anyone can view exercises" ON exercises
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Trainers can manage their own exercises" ON exercises;
CREATE POLICY "Trainers can manage their own exercises" ON exercises
    FOR ALL 
    TO authenticated
    USING (created_by = auth.uid());

-- 4. Robust Search RPC
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
            e.id, e.name, e.name_es, e.body_part, e.target_muscle, 
            e.equipment, e.gif_url, e.instructions, e.instructions_es, 
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
        f.*,
        t.count as total_count
    FROM filtered_exercises f
    CROSS JOIN total t
    ORDER BY COALESCE(f.name_es, f.name) ASC
    OFFSET p_offset
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant Permissions
GRANT EXECUTE ON FUNCTION public.search_exercises(text, int, int) TO authenticated, anon, service_role;
