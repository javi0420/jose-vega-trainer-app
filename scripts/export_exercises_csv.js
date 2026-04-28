import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Parser } from 'json2csv';
import fs from 'fs';

// Load local environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportToCSV() {
    console.log("Fetching all exercises from the database...");

    // Fetch all exercises (bypassing the 1000 limit by looping if necessary, or using a large limit)
    let allExercises = [];
    let keepFetching = true;
    let offset = 0;
    const limit = 1000;

    while (keepFetching) {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching exercises:", error);
            process.exit(1);
        }

        if (data && data.length > 0) {
            allExercises = allExercises.concat(data);
            offset += limit;
        } else {
            keepFetching = false;
        }
    }

    console.log(`Successfully fetched ${allExercises.length} exercises from the database.`);

    if (allExercises.length === 0) {
        console.log("No data to export.");
        return;
    }

    // Convert instructions array to a manageable string (e.g. JSON stringified or joined by |)
    const formattedData = allExercises.map(ex => {
        return {
            ...ex,
            instructions: Array.isArray(ex.instructions) ? ex.instructions.join(' | ') : ex.instructions,
            secondary_muscles: Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles.join(', ') : ex.secondary_muscles
        };
    });

    console.log("Converting data to CSV format...");
    try {
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(formattedData);

        const outputPath = path.resolve(process.cwd(), 'ejercicios_exportados.csv');
        fs.writeFileSync(outputPath, csv);
        console.log(`✅ Export complete! File saved successfully to: ${outputPath}`);
    } catch (err) {
        console.error("Error generating CSV:", err);
    }
}

exportToCSV();
