import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import Papa from 'papaparse'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importExercises() {
  try {
    console.log('Reading CSV (Translated Master)...')
    const csvFile = fs.readFileSync('EJERCICIOS_MAESTRO_TRADUCIDO.csv', 'utf8')
    
    // Parse CSV starting from row 2 (index 1) to avoid the junk header
    const { data, errors } = Papa.parse(csvFile, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      // We skip the first line manually because PapaParse header: true takes the first line as header
    })

    if (errors.length > 0) {
      // Some errors might be due to the junk first row if we didn't skip it.
      // Let's refine the parsing.
    }

    // Manual slice to remove the first row if it's junk
    let cleanData = data;
    if (data.length > 0 && data[0].ID === 'ID') {
       // Already has headers from row 2, but wait, PapaParse took Row 1 as headers.
       // Row 1: Column1;Column2...
       // Row 2: ID;Name;Name ES...
       // So data[0] is the record starting at Row 3.
    } else {
       // If PapaParse took Row 1 as header, data[0] is Row 2.
       // Let's check headers.
    }

    // Let's just re-parse without headers first to find the real header row.
    const rawParse = Papa.parse(csvFile, { delimiter: ';', skipEmptyLines: true });
    const rows = rawParse.data;
    
    // Header row is index 1 (ID;Name;Name ES...)
    const headers = rows[1];
    const exerciseRows = rows.slice(2);

    console.log(`Parsed ${exerciseRows.length} exercises.`)

    // Delete all existing exercises
    console.log('Deleting existing exercises...')
    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .not('id', 'is', null)

    if (deleteError) {
      console.error('Error deleting exercises:', deleteError)
      process.exit(1)
    }

    console.log('Inserting translated exercises...')

    // Helper to clean up instructions
    const cleanInstructions = (text) => {
      if (!text) return [];
      // If it contains | use that, otherwise split by newlines
      if (text.includes('|')) {
        return text.split('|').map(s => s.trim()).filter(s => s !== '');
      }
      return text.split('\n').map(s => s.trim().replace(/^Step:\s*\d+\s*/i, '')).filter(s => s !== '');
    }

    // Batch insert in chunks of 100
    const CHUNK_SIZE = 100
    for (let i = 0; i < exerciseRows.length; i += CHUNK_SIZE) {
      const chunkRows = exerciseRows.slice(i, i + CHUNK_SIZE);
      const chunk = chunkRows.map(row => {
        // Map by index: 0:ID, 1:Name, 2:Name ES, 3:Target, 4:BodyPart, 5:Equipment, 6:GifUrl, 7:Instructions, 8:Instructions ES, 9:SecondaryMuscles
        return {
          id: row[0],
          name: row[1],
          name_es: row[2],
          target_muscle: row[3],
          body_part: row[4],
          equipment: row[5],
          gif_url: row[6],
          instructions: cleanInstructions(row[7]),
          instructions_es: cleanInstructions(row[8]),
          secondary_muscles: row[9] ? row[9].split(',').map(s => s.trim()).filter(s => s !== '') : []
        };
      })

      const { error: insertError } = await supabase
        .from('exercises')
        .insert(chunk)

      if (insertError) {
        console.error(`Error inserting chunk ${i / CHUNK_SIZE}:`, insertError)
        process.exit(1)
      }
      console.log(`Inserted ${Math.min(i + CHUNK_SIZE, exerciseRows.length)}/${exerciseRows.length}`)
    }

    console.log('Import completed successfully!')
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

importExercises()
