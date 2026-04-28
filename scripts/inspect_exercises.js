import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_LOCAL_SERVICE_KEY);

async function inspectUrls() {
    const { data, error } = await supabase.from('exercises').select('id, name, gif_url');
    if (error) return console.error(error);

    // Check if there are any URLs not from exercisedb.dev
    const nonExercisedb = data.filter(ex => ex.gif_url && !ex.gif_url.includes('exercisedb'));

    console.log(`Found ${nonExercisedb.length} exercises from other domains:`);
    nonExercisedb.slice(0, 10).forEach(ex => console.log(`- ${ex.name}: ${ex.gif_url}`));

    // For non-exercisedb ones, check if they are actually accessible
    for (const ex of nonExercisedb.slice(0, 5)) {
        await new Promise(res => {
            https.get(ex.gif_url, (resp) => {
                console.log(`\nURL: ${ex.gif_url}\nStatus: ${resp.statusCode}, Content-Type: ${resp.headers['content-type']}`);
                res();
            }).on('error', () => res());
        });
    }
}
inspectUrls();
