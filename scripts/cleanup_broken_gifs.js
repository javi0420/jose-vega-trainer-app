import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase environment variables!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUrl(urlStr) {
    return new Promise((resolve) => {
        if (!urlStr || !urlStr.startsWith('http')) {
            resolve(false);
            return;
        }

        const client = urlStr.startsWith('https') ? https : http;

        const req = client.request(urlStr, { method: 'HEAD', timeout: 5000 }, (res) => {
            // Consider 2xx and 3xx as valid
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true);
            } else {
                resolve(false);
            }
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function cleanupBrokenLinks() {
    console.log("🔍 Fetching all exercises to validate their GIF URLs...");

    const { data: exercises, error } = await supabase.from('exercises').select('id, name, gif_url');
    if (error) {
        console.error("Error fetching exercises:", error);
        return;
    }

    console.log(`Checking ${exercises.length} exercises... This might take a moment.`);

    // Check in concurrency batches of 20 to avoid exhausting connections
    const CONCURRENCY = 20;
    const brokenExercises = [];

    for (let i = 0; i < exercises.length; i += CONCURRENCY) {
        const batch = exercises.slice(i, i + CONCURRENCY);

        const results = await Promise.all(batch.map(async (ex) => {
            if (!ex.gif_url) return { ex, isValid: false }; // Should already be cleaned, but just in case

            // Just a quick regex to check if it's a valid url format before requesting
            if (!/^https?:\/\//i.test(ex.gif_url)) return { ex, isValid: false };

            const isValid = await checkUrl(ex.gif_url);
            return { ex, isValid };
        }));

        for (const { ex, isValid } of results) {
            if (!isValid) {
                brokenExercises.push(ex);
            }
        }

        if (i % 100 === 0 && i > 0) {
            console.log(`Processed ${i}/${exercises.length}... Found ${brokenExercises.length} broken links so far.`);
        }
    }

    console.log(`\n🧹 Found ${brokenExercises.length} exercises with broken GIF links out of ${exercises.length}.`);

    if (brokenExercises.length > 0) {
        console.log(`Example broken: ${brokenExercises[0].name} - ${brokenExercises[0].gif_url}`);

        const BATCH_SIZE = 100;
        let deletedCount = 0;

        for (let i = 0; i < brokenExercises.length; i += BATCH_SIZE) {
            const batchIds = brokenExercises.slice(i, i + BATCH_SIZE).map(ex => ex.id);

            const { error: delError } = await supabase
                .from('exercises')
                .delete()
                .in('id', batchIds);

            if (delError) {
                console.error(`❌ Error deleting batch:`, delError);
            } else {
                deletedCount += batchIds.length;
            }
        }
        console.log(`✅ Deleted ${deletedCount} exercises with broken images.`);
    } else {
        console.log("✅ All image links appear to be valid!");
    }
}

cleanupBrokenLinks();
