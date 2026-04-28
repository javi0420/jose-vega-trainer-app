-- Migration: Maintenance Mode Implementation
-- Created: 2026-04-28
-- Purpose: Global application settings with Realtime support

BEGIN;

-- 1. Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id integer PRIMARY KEY DEFAULT 1,
    is_maintenance_mode boolean DEFAULT false,
    maintenance_message text DEFAULT 'Estamos realizando tareas de mantenimiento. Volveremos pronto.',
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT singleton_row CHECK (id = 1)
);

-- 2. Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Public read access
CREATE POLICY "Public read app_settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Update access restricted (only service role or admin)
-- Note: Assuming admins can be identified by role or metadata, but for safety 
-- we'll restrict to authenticated admins if needed. For now, public read is the priority.
CREATE POLICY "Admins can update app_settings" 
ON public.app_settings 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'trainer'
    )
);

-- 4. Insert default row
INSERT INTO public.app_settings (id, is_maintenance_mode, maintenance_message)
VALUES (1, false, 'Estamos mejorando IronTrack para ti.')
ON CONFLICT (id) DO NOTHING;

-- 5. Enable Realtime
-- Check if table is already in the publication to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'app_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
    END IF;
END $$;

COMMIT;
