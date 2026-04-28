import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_LOCAL_SERVICE_KEY);

async function inspectAuth() {
    console.log("Checking auth users...");
    // The Supabase JS Client has an admin API for auth
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
    }

    if (users.users.length === 0) {
        console.log("No users found in auth.users! The seed.sql might have failed to insert them.");
    } else {
        users.users.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Confirmed: ${u.email_confirmed_at}`);
        });
    }
}
inspectAuth();
