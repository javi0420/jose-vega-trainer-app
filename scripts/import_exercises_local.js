import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load local environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables! Ensure VITE_SUPABASE_URL and SUPABASE_LOCAL_SERVICE_KEY are set in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXERCISES_API_BASE = "https://exercisedb-api.vercel.app/api/v1/exercises";

async function importExercises() {
    console.log(`🚀 Starting local exercise import from Vercel API: ${EXERCISES_API_BASE}`);

    try {
        let allExercises = [];
        let limit = 50; // Reduce limit to 50 to avoid hitting the rate limit as quickly
        let offset = 0;
        let keepFetching = true;

        while (keepFetching) {
            console.log(`📡 Fetching offset ${offset}...`);
            const response = await fetch(`${EXERCISES_API_BASE}?limit=${limit}&offset=${offset}`);

            if (!response.ok) {
                if (response.status === 429) {
                    console.log(`⚠️ Rate limited at offset ${offset}. Waiting 10 seconds before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    continue; // Retry the same offset
                } else {
                    console.error(`❌ Failed offset ${offset}: ${response.status} ${response.statusText}`);
                    break;
                }
            }

            const jsonResponse = await response.json();
            // API sometimes returns { data: [...] } and sometimes direct array [...]
            let rawData = jsonResponse.data || jsonResponse;

            if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
                console.log(`🏁 No more data found at offset ${offset}. Stopping fetch.`);
                keepFetching = false;
                break;
            }

            allExercises = allExercises.concat(rawData);
            offset += rawData.length;

            // Small delay to prevent Vercel API rate limits and node heap exhaustion
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        console.log(`📦 Fetched ${allExercises.length} total exercises. Structuring data...`);

        // Map the JSON structure to match our new Supabase table schema
        const structuredData = allExercises.map((exercise, index) => ({
            id: exercise.exerciseId || exercise.id || `custom_${index}_${exercise.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: exercise.name,
            body_part: exercise.bodyPart || 'General',
            target_muscle: exercise.target || 'General',
            equipment: exercise.equipment || 'none',
            gif_url: exercise.gifUrl || null,
            instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [],
            secondary_muscles: Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : []
        }));

        // Split into chunks of 100 to avoid overloading the local DB insert limits
        const CHUNK_SIZE = 100;
        let totalInserted = 0;

        for (let i = 0; i < structuredData.length; i += CHUNK_SIZE) {
            const chunk = structuredData.slice(i, i + CHUNK_SIZE);
            console.log(`⏳ Inserting batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} records)...`);

            const { error } = await supabase
                .from('exercises')
                .upsert(chunk, { onConflict: 'id' }); // Use upsert to avoid duplicate errors on re-runs

            if (error) {
                console.error(`❌ Error inserting batch:`, error);
                process.exit(1);
            }

            totalInserted += chunk.length;
        }

        console.log(`✅ Success! Imported a total of ${totalInserted} exercises into the local database.`);

    } catch (error) {
        console.error("💥 Error during import:", error);
    }
}

importExercises();
