import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
    console.log("🧹 Fetching all exercises to determine which ones to keep...");

    // Fetch all exercises to avoid Supabase row deletion limits
    let allExercises = [];
    let count = 0;

    const { data, error } = await supabase.from('exercises').select('id, gif_url');
    if (error) {
        console.error("Error fetching exercises:", error);
        return;
    }

    const toDelete = data.filter(ex => !ex.gif_url || !ex.gif_url.toLowerCase().endsWith('.gif'));

    console.log(`Found ${data.length} total exercises. ${toDelete.length} of them do not end in .gif and will be deleted.`);

    if (toDelete.length === 0) {
        console.log("✅ Nothing to delete.");
        return;
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE).map(ex => ex.id);

        const { error: delError } = await supabase
            .from('exercises')
            .delete()
            .in('id', batch);

        if (delError) {
            console.error(`❌ Error deleting batch:`, delError);
        } else {
            console.log(`Deleted batch of ${batch.length} exercises.`);
        }
    }

    console.log("✅ Cleanup complete. Only GIF exercises remain.");
}

cleanup();
