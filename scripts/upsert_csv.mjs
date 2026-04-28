import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const inputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido_Limpio.csv';

console.log(`Reading clean CSV from ${inputFile}...`);
const fileContent = fs.readFileSync(inputFile, 'utf8');

function parseInstructionsToArray(instructionsString) {
    if (!instructionsString) return [];

    // Split the string by matching numbers followed by a dot and a space
    // e.g. "1. Do this 2. Do that" -> ["1. Do this", "2. Do that"]
    const parts = instructionsString.split(/(?=\b\d+\.\s)/g);

    return parts
        .map(step => step.trim())
        .filter(step => step.length > 0);
}

Papa.parse(fileContent, {
    header: true,
    delimiter: ',',
    skipEmptyLines: true,
    complete: async (results) => {
        let rows = results.data;
        console.log(`Parsed ${rows.length} rows. Updating database via Upsert...`);

        // Convert the string instructions field into an array of strings
        // Since Supabase requires an array (TEXT[]) for the instructions column
        rows = rows.map(row => {
            return {
                ...row,
                instructions: parseInstructionsToArray(row.instructions)
            };
        });

        // Supabase allows upserting arrays in batches. 
        // We will do it in batches of 100 to avoid overwhelming the database.
        const batchSize = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('exercises')
                .upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error(`Error in batch ${i} to ${i + batchSize}:`, error.message);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`Upserted row ${i + 1} to ${Math.min(i + batchSize, rows.length)} successfully...`);
            }
        }

        console.log('--- UPSERT COMPLETE ---');
        console.log(`Successfully updated: ${successCount} exercises`);
        if (errorCount > 0) {
            console.log(`Failed to update: ${errorCount} exercises`);
        }
    }
});
