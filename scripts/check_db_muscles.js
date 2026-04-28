import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data: bicepExercises, error } = await supabase
        .from('exercises')
        .select('*')
        .ilike('name', '%bicep%')
        .limit(5);

    if (error) {
        console.error("DB Error:", error);
        return;
    }
    console.log("Found bicep exercises:", bicepExercises.map(e => e.name));

    // Also let's check by target_muscle
    const { data: armExercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('target_muscle', 'biceps')
        .limit(5);

    console.log("Found bicep target exercises:", armExercises ? armExercises.map(e => e.name) : 'none');
}

check();
