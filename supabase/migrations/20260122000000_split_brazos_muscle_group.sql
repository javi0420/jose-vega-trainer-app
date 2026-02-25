-- Migration: Split "Brazos" muscle group into "Bíceps" and "Tríceps"
-- Date: 2026-01-22
-- Description: Separate arm exercises into more specific muscle groups for better tracking

-- Step 1: Update exercises based on name patterns
UPDATE exercises
SET muscle_group = CASE
    -- Bíceps exercises (curl variations)
    WHEN lower(name) LIKE '%curl%' 
        OR lower(name) LIKE '%bícep%' 
        OR lower(name) LIKE '%bicep%' THEN 'Bíceps'
    
    -- Tríceps exercises (extensions, presses, dips)
    WHEN lower(name) LIKE '%trícep%' 
        OR lower(name) LIKE '%tricep%'
        OR lower(name) LIKE '%extensi%n%'  -- Covers "extensión" and "extension"
        OR lower(name) LIKE '%press%francés%' 
        OR lower(name) LIKE '%press%frances%'
        OR lower(name) LIKE '%fondo%'
        OR lower(name) LIKE '%dip%' THEN 'Tríceps'
    
    -- Keep unchanged if not clearly bíceps or tríceps
    ELSE muscle_group
END
WHERE muscle_group = 'Brazos';

-- Step 2: Verification query (Optional - for logging affected rows)
-- SELECT name, muscle_group 
-- FROM exercises 
-- WHERE muscle_group IN ('Bíceps', 'Tríceps') 
-- ORDER BY muscle_group, name;

-- Step 3: If any exercises still have 'Brazos', they are ambiguous and can be reviewed manually
-- SELECT name, muscle_group 
-- FROM exercises 
-- WHERE muscle_group = 'Brazos';
