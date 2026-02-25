-- Refine Muscle Groups
-- 1. Split "Brazos" into "Bíceps" and "Tríceps"
UPDATE public.exercises 
SET muscle_group = 'Bíceps' 
WHERE name ILIKE '%Curl%' AND muscle_group = 'Brazos';

UPDATE public.exercises 
SET muscle_group = 'Tríceps' 
WHERE (name ILIKE '%Tríceps%' OR name ILIKE '%Francés%' OR name ILIKE '%Fondos%') AND muscle_group = 'Brazos';

-- 2. Move specific Leg exercises from Glúteo to Piernas (User Request)
UPDATE public.exercises 
SET muscle_group = 'Piernas' 
WHERE name IN ('Abducción de Cadera', 'Aducción de Cadera');

-- 3. Cleanup: any remaining "Brazos" to "Otros" or keep as is? 
-- Let's keep them as "Bíceps" by default if not caught above, as it's the most common for "Curl".
UPDATE public.exercises 
SET muscle_group = 'Bíceps' 
WHERE muscle_group = 'Brazos';
