-- Migration: Fix user_role type cast in handle_new_user trigger
-- Purpose: Safely cast the text value from raw_user_meta_data to public.user_role ENUM to prevent "expression is of type text" error.

create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
declare
    v_role public.user_role;
begin
    -- Extract the role as text and cast it explicitly to public.user_role
    -- If null or invalid, fallback to 'client'
    begin
        v_role := coalesce(new.raw_user_meta_data->>'role', 'client')::public.user_role;
    exception when others then
        v_role := 'client'::public.user_role;
    end;

    if new.raw_user_meta_data->>'role' = 'trainer' then
        insert into public.profiles (
            id, 
            full_name, 
            email, 
            role, 
            is_active
        ) values (
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.email, 
            v_role,
            true
        );
    else
        insert into public.profiles (
            id, 
            full_name, 
            email, 
            role,
            is_active
        ) values (
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.email, 
            v_role,
            true
        );
    end if;

    return new;
end;
$$;
