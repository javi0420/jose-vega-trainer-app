-- =========================================================================================
-- MIGRATION: 20260224110000_fix_security_warnings.sql
-- PURPOSE: Resolver avisos del Supabase Security Advisor (Search Path & Extensions)
-- =========================================================================================

-- =========================================================================================
-- 1. FUNCTION SEARCH PATH MUTABLE
-- Setear el search_path de forma segura (Inmutable).
-- Usamos un bloque DO para alterar la función sin importar qué firma (argumentos) tenga.
-- =========================================================================================
DO $$ 
DECLARE
    f record;
BEGIN
    FOR f IN 
        SELECT n.nspname AS schema_name, p.proname AS func_name, pg_get_function_identity_arguments(p.oid) AS func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname IN ('test_create_auth_user', 'search_exercises')
    LOOP
        -- Esto ejecuta: ALTER FUNCTION public.nombre(args) SET search_path = public, extensions;
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = %I, extensions', f.schema_name, f.func_name, f.func_args, f.schema_name);
    END LOOP;
END $$;


-- =========================================================================================
-- 2. EXTENSION IN PUBLIC
-- Mover las extensiones 'unaccent' y 'pgcrypto' al esquema 'extensions' para mayor seguridad.
-- =========================================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- Cambiar extensiones de esquema si existen en public
DO $$ 
BEGIN
    -- Mover unaccent
    IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'unaccent' AND n.nspname = 'public') THEN
        ALTER EXTENSION unaccent SET SCHEMA extensions;
    END IF;

    -- Mover pgcrypto
    IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgcrypto' AND n.nspname = 'public') THEN
        ALTER EXTENSION pgcrypto SET SCHEMA extensions;
    END IF;
END $$;

-- Otorgar permisos de uso en el esquema de extensiones para que las funciones internas no fallen
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
