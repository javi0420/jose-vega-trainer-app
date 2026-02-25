-- =====================================================
-- Migration: Add is_active to exercises for Soft Delete
-- Created: 2026-01-24
-- =====================================================

ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records just in case
UPDATE public.exercises SET is_active = true WHERE is_active IS NULL;
