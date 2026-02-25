-- Migration: Robust fix for user_role type compatibility
-- Created: 2026-01-13
-- Purpose: Handle user_role cast safely for both local (text) and production (enum)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    v_role text; -- Use text explicitly to avoid type issues
begin
    -- Get role from metadata or default to client
    v_role := coalesce(new.raw_user_meta_data->>'role', 'client');
    
    insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        -- Force cast to text first, then let Postgres handle the rest.
        -- In production (ENUM), text 'client' converts to enum automatically on insert.
        -- In local (TEXT), it's already text.
        v_role, 
        false,
        null
    );
    return new;
end;
$$;
