import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkContentType(urlStr) {
    return new Promise((resolve) => {
        if (!urlStr || !urlStr.startsWith('http')) {
            resolve('invalid');
            return;
        }

        const client = urlStr.startsWith('https') ? https : http;

        const req = client.request(urlStr, { method: 'HEAD', timeout: 5000 }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                const contentType = res.headers['content-type'] || '';
                resolve(contentType);
            } else {
                resolve('error');
            }
        });

        req.on('error', () => resolve('error'));
        req.on('timeout', () => {
            req.destroy();
            resolve('timeout');
        });

        req.end();
    });
}

async function cleanupStaticImages() {
    console.log("🔍 Fetching all exercises to validate Content-Type...");
    const { data: exercises, error } = await supabase.from('exercises').select('id, name, gif_url');
    if (error) return console.error(error);

    console.log(`Checking ${exercises.length} exercises...`);

    const CONCURRENCY = 20;
    const staticExercises = [];

    for (let i = 0; i < exercises.length; i += CONCURRENCY) {
        const batch = exercises.slice(i, i + CONCURRENCY);

        const results = await Promise.all(batch.map(async (ex) => {
            const ct = await checkContentType(ex.gif_url);
            return { ex, contentType: ct };
        }));

        for (const { ex, contentType } of results) {
            // we only keep it if content-type exactly contains 'image/gif'
            if (!contentType.includes('image/gif')) {
                staticExercises.push({ ex, contentType });
            }
        }

        if (i % 100 === 0 && i > 0) {
            console.log(`Processed ${i}/${exercises.length}... Found ${staticExercises.length} non-GIFs so far.`);
        }
    }

    console.log(`\n🧹 Found ${staticExercises.length} exercises that are NOT actually GIFs.`);
    if (staticExercises.length > 0) {
        console.log("Examples to delete:", staticExercises.slice(0, 3).map(s => `${s.ex.name} -> ${s.contentType}`));

        const BATCH_SIZE = 100;
        let deletedCount = 0;

        for (let i = 0; i < staticExercises.length; i += BATCH_SIZE) {
            const batchIds = staticExercises.slice(i, i + BATCH_SIZE).map(s => s.ex.id);
            const { error: delError } = await supabase.from('exercises').delete().in('id', batchIds);
            if (!delError) deletedCount += batchIds.length;
        }
        console.log(`✅ Deleted ${deletedCount} fake-GIF exercises.`);
    }
}
cleanupStaticImages();
