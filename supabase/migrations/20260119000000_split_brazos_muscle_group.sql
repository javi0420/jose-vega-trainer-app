-- =====================================================
-- Split "Brazos" muscle group into "Bíceps" and "Tríceps"
-- Created: 2026-01-19
-- Purpose: Improve exercise categorization for better filtering
-- =====================================================

BEGIN;

-- Update triceps exercises
UPDATE public.exercises
SET muscle_group = 'Tríceps'
WHERE muscle_group = 'Brazos'
AND (
    name ILIKE '%tríceps%'
    OR name ILIKE '%triceps%'
    OR name ILIKE '%press francés%'
    OR name ILIKE '%fondos%'
    OR name ILIKE '%extensiones%'
);

-- Update biceps exercises
UPDATE public.exercises
SET muscle_group = 'Bíceps'
WHERE muscle_group = 'Brazos'
AND (
    name ILIKE '%curl%'
    OR name ILIKE '%bíceps%'
    OR name ILIKE '%biceps%'
);

-- Check for any remaining "Brazos" exercises (edge cases)
-- If any exist, default to Bíceps as a safer fallback
UPDATE public.exercises
SET muscle_group = 'Bíceps'
WHERE muscle_group = 'Brazos';

COMMIT;

-- =====================================================
-- Verification Query (Run manually to check results)
-- =====================================================
-- SELECT name, muscle_group FROM public.exercises
-- WHERE muscle_group IN ('Bíceps', 'Tríceps')
-- ORDER BY muscle_group, name;
