import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findExercises() {
    let allExercises = [];
    let offset = 0;
    let limit = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .range(offset, offset + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allExercises = allExercises.concat(data);
        offset += limit;
    }

    const searchTerms = [
        "21s", "spider curl", "preacher curl",
        "concentration curl", "incline hammer curl", "cable spider"
    ];

    const results = {};

    allExercises.forEach(ex => {
        const nameLower = ex.name.toLowerCase();
        searchTerms.forEach(term => {
            if (nameLower.includes(term)) {
                if (!results[term]) results[term] = [];
                if (!results[term].some(e => e.id === ex.id)) {
                    results[term].push({
                        id: ex.id,
                        name: ex.name,
                        target: ex.target_muscle,
                        instructions: typeof ex.instructions === 'string' ? ex.instructions : ex.instructions.join(' | ')
                    });
                }
            }
        });
    });

    fs.writeFileSync('C:/tmp/biceps_results.json', JSON.stringify(results, null, 2));
    console.log("Done. Results found:", Object.keys(results).length);
}

findExercises();
