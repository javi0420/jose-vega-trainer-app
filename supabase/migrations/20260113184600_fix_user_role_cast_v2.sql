-- Migration: Force fix for user_role type compatibility (v2)
-- Created: 2026-01-13
-- Purpose: Correctly update handle_new_user to avoid explicit user_role cast which fails in local dev

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    v_role text;
begin
    -- Get role from metadata or default to client
    v_role := coalesce(new.raw_user_meta_data->>'role', 'client');
    
    insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
    values (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        -- Remove explicit cast to ::user_role.
        -- In local (TEXT column), this works as text.
        -- In prod (ENUM column), Postgres auto-casts text literal to enum on insert.
        v_role, 
        false,
        null
    );
    return new;
end;
$$;
