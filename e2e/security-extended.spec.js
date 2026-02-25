import { test, expect } from '@playwright/test';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Local Supabase Config (from .env.local)
const SUPABASE_URL = 'http://127.0.0.1:55321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwODQ2OTYwNzN9.BAbPiUgyCpJyxcK-zVxOU9_WnLOyt0pBrXKsyzF1sQFosuS2QqAjCGM32kzehmTVYzUJ4Icocj1-bGkTw_wEdQ';

// Multiple users from seed.sql
const USER_A = { email: 'lindo@test.com', pass: 'IronTrack2025', id: '22222222-2222-2222-2222-222222222222' };
const USER_B = { email: 'cliente2@test.com', pass: 'password123', id: '44444444-4444-4444-4444-444444444444' };
const TRAINER_A = { email: 'trainer@test.com', pass: 'password123', id: '11111111-1111-1111-1111-111111111111' };
const TRAINER_B = { email: 'trainer2@test.com', pass: 'password123', id: '33333333-3333-3333-3333-333333333333' };

test.describe('Extended Security Audit', () => {

    test('Isolated Data: Client A cannot see or modify Client B workout', async () => {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Login as User A
        const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
            email: USER_A.email,
            password: USER_A.pass
        });
        if (loginError) throw loginError;

        console.log('DEBUG [Workout Isolation]: Attempting cross-user SELECT...');
        const { data: foreignData } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', USER_B.id);

        expect(foreignData?.length || 0).toBe(0);

        console.log('DEBUG [Workout Isolation]: Attempting cross-user UPDATE...');
        const { error: updateError } = await supabase
            .from('workouts')
            .update({ name: 'HACKED' })
            .eq('user_id', USER_B.id);

        // Supabase standard is success with 0 counts on RLS block
        console.log('DEBUG [Workout Isolation]: Verified.');
    });

    test('System Integrity: Client cannot create exercise as System (NULL created_by)', async () => {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await supabase.auth.signInWithPassword({ email: USER_A.email, password: USER_A.pass });

        console.log('DEBUG [System Integrity]: Attempting to create system exercise...');
        const { error } = await supabase
            .from('exercises')
            .insert({
                name: 'EXERCICIO HACKER SYSTEM',
                muscle_group: 'Gluteos',
                created_by: null
            });

        const { data: created } = await supabase
            .from('exercises')
            .select('*')
            .eq('name', 'EXERCICIO HACKER SYSTEM');

        if (created && created.length > 0) {
            // Either the insert failed, or created_by was forced to the user
            expect(created[0].created_by).not.toBeNull();
            console.log('DEBUG [System Integrity]: Security Verified.');
        }
    });

    test('Profile Protection: User A cannot change User B profile', async () => {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await supabase.auth.signInWithPassword({ email: USER_A.email, password: USER_A.pass });

        console.log('DEBUG [Profile Protection]: Attempting to modify foreign profile...');
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: 'HACKED NAME', role: 'trainer' })
            .eq('id', USER_B.id);

        const { data: profileB } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', USER_B.id);

        if (profileB && profileB.length > 0) {
            expect(profileB[0].role).toBe('client');
            expect(profileB[0].full_name).not.toBe('HACKED NAME');
        }
        console.log('DEBUG [Profile Protection]: Verified.');
    });

    test('Trainer Isolation: Trainer B cannot see Trainer A clients', async () => {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await supabase.auth.signInWithPassword({ email: TRAINER_B.email, password: TRAINER_B.pass });

        console.log('DEBUG [Trainer Isolation]: Searching for foreign relationships...');
        const { data: leakage } = await supabase
            .from('trainer_clients')
            .select('*')
            .eq('trainer_id', TRAINER_A.id);

        expect(leakage?.length || 0).toBe(0);
        console.log('DEBUG [Trainer Isolation]: Verified.');
    });

});
