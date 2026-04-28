-- Update search_exercises RPC to filter out inactive exercises
DROP FUNCTION IF EXISTS public.search_exercises(text, int, int);

CREATE OR REPLACE FUNCTION public.search_exercises(
  search_term TEXT,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  id TEXT,
  name TEXT,
  name_es TEXT,
  body_part TEXT,
  target_muscle TEXT,
  equipment TEXT,
  gif_url TEXT,
  instructions TEXT[],
  instructions_es TEXT[],
  secondary_muscles TEXT[],
  is_active BOOLEAN,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Count total results for pagination
  SELECT count(*) INTO v_total_count
  FROM public.exercises e
  WHERE (
    unaccent(e.name) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.name_es) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.body_part) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.target_muscle) ILIKE unaccent('%' || search_term || '%')
  ) AND e.is_active = true;

  RETURN QUERY
  SELECT 
    e.id, e.name, e.name_es, e.body_part, e.target_muscle, e.equipment, 
    e.gif_url, e.instructions, e.instructions_es, e.secondary_muscles,
    e.is_active, v_total_count
  FROM public.exercises e
  WHERE (
    unaccent(e.name) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.name_es) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.body_part) ILIKE unaccent('%' || search_term || '%') OR
    unaccent(e.target_muscle) ILIKE unaccent('%' || search_term || '%')
  ) AND e.is_active = true
  ORDER BY e.name_es ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
