-- =====================================================
-- Detailed Split for remaining "Brazos" exercises
-- Created: 2026-01-24
-- Purpose: Complete the transition for specific exercises identified in feedback
-- =====================================================

BEGIN;

-- 1. Specific BICEPS updates
UPDATE public.exercises
SET muscle_group = 'Bíceps'
WHERE muscle_group = 'Brazos'
AND (
    name ILIKE '%Curl Alterno con Giro%'
    OR name ILIKE '%Curl Bayesian%'
    OR name ILIKE '%Curl%'
);

-- 2. Specific TRICEPS updates
UPDATE public.exercises
SET muscle_group = 'Tríceps'
WHERE muscle_group = 'Brazos'
AND (
    name ILIKE '%Extension Carter%'
    OR name ILIKE '%Extensión de Tríceps a una Mano Tumbado%'
    OR name ILIKE '%Extensión de Tríceps en Polea%'
    OR name ILIKE '%Press Cerrado%'
    OR name ILIKE '%Rompecráneos%'
    OR name ILIKE '%Skull Crushers%'
    OR name ILIKE '%trícep%'
    OR name ILIKE '%tricep%'
);

-- 3. FINAL SAFETY FALLBACK: 
-- Any remaining "Brazos" are likely arms, defaulting to Bíceps if ambiguous
UPDATE public.exercises
SET muscle_group = 'Bíceps'
WHERE muscle_group = 'Brazos';

COMMIT;

-- VERIFICATION:
-- SELECT name, muscle_group FROM public.exercises WHERE muscle_group IN ('Bíceps', 'Tríceps');
