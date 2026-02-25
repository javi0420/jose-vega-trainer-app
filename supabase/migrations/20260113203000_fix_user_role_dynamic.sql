-- Migration: Dynamic fix for user_role type compatibility
-- Purpose: Handle insertion into 'role' column regardless of whether it is TEXT (local) or ENUM (production)

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
    
    -- Check if the 'role' column is a user-defined type (ENUM)
    select exists (
        select 1 
        from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'role' 
        and data_type = 'USER-DEFINED'
    ) into v_is_enum;

    if v_is_enum then
        -- Production Environment (ENUM): Use dynamic SQL to cast specifically
        execute format('
            insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
            values ($1, $2, $3, $4::user_role, false, null)
        ') using 
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.email, 
            v_role;
    else
        -- Local Environment (TEXT): Standard insert without cast
        insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
        values (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.email,
            v_role, -- No cast needed for text column
            false,
            null
        );
    end if;

    return new;
end;
$$;
