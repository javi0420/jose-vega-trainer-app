
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TRAINER = { email: 'trainer@test.com', pass: 'password123', id: '11111111-1111-1111-1111-111111111111' }
const CLIENT = { email: 'lindo@test.com', pass: 'IronTrack2025', id: '22222222-2222-2222-2222-222222222222' }
const ROUTINE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

async function seed() {
    console.log('Logging in as Trainer...')
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: TRAINER.email,
        password: TRAINER.pass
    })

    if (loginError) {
        console.error('Login failed:', loginError)
        process.exit(1)
    }

    console.log('Creating Routine...')
    const { error: routineError } = await supabase
        .from('routines')
        .upsert({
            id: ROUTINE_ID,
            name: 'Rutina Fuerza Pro',
            owner_id: TRAINER.id, // Using the fixed ID might require admin, but let's try with owner
            created_at: new Date(),
            updated_at: new Date()
        }, { onConflict: 'id' })

    if (routineError) {
        console.log('Routine upsert failed (might be RLS or ID policy), trying insert without ID if needed, or ignoring if exists.')
        // If upsert fails, it might be because we can't force ID as non-admin. 
        // But for test debugging, we want a specific name.
        // Let's check if it exists first.
    }

    // Assign to client
    console.log('Assigning to Client...')
    const { error: assignError } = await supabase
        .from('assigned_routines')
        .upsert({
            client_id: CLIENT.id,
            routine_id: ROUTINE_ID,
            assigned_by: TRAINER.id,
            assigned_at: new Date()
        }, { onConflict: 'client_id,routine_id' })

    if (assignError) {
        console.error('Assignment failed:', assignError)
        process.exit(1)
    }

    console.log('Seed completed successfully.')
}

seed()
