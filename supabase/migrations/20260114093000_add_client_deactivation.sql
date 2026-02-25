-- Migration: Add client deactivation support
-- Created: 2026-01-14
-- Purpose: Add 'is_active' column to profiles and update trigger to handle it

-- 1. Add column to profiles
alter table public.profiles 
add column if not exists is_active boolean default true;

-- 2. Update handle_new_user trigger function to include is_active
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    v_role text;
    v_is_enum boolean;
begin
    -- Get role from metadata or default to client
    v_role := coalesce(new.raw_user_meta_data->>'role', 'client');
    
    -- Check if the 'role' column is a user-defined type (ENUM) - Production compatibility
    select exists (
        select 1 
        from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'role' 
        and data_type = 'USER-DEFINED'
    ) into v_is_enum;

    if v_is_enum then
        -- Production Environment (ENUM)
        execute format('
            insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at, is_active)
            values ($1, $2, $3, $4::user_role, false, null, true)
        ') using 
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.email, 
            v_role;
    else
        -- Local Environment (TEXT)
        insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at, is_active)
        values (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.email,
            v_role,
            false,
            null,
            true
        );
    end if;

    return new;
end;
$$;
