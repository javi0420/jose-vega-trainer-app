import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use the ANON key for realistic login simulation from the client side
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testLogin() {
    console.log("Testing login for lindo@test.com / IronTrack2025 ...");
    const { data: data1, error: err1 } = await supabase.auth.signInWithPassword({
        email: 'lindo@test.com',
        password: 'IronTrack2025'
    });

    if (err1) console.error("❌ Login failed for lindo@test.com:", err1.message);
    else console.log("✅ Login successful for lindo@test.com! User ID:", data1.user.id);

    console.log("\nTesting login for trainer@test.com / password123 ...");
    const { data: data2, error: err2 } = await supabase.auth.signInWithPassword({
        email: 'trainer@test.com',
        password: 'password123'
    });

    if (err2) console.error("❌ Login failed for trainer@test.com:", err2.message);
    else console.log("✅ Login successful for trainer@test.com! User ID:", data2.user.id);
}

testLogin();
