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
    console.log('Reading CSV...')
    const csvFile = fs.readFileSync('todos_los_ejercicios_api.csv', 'utf8')
    
    const { data, errors } = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true
    })

    if (errors.length > 0) {
      console.warn('CSV Parsing warnings:', errors)
    }

    console.log(`Parsed ${data.length} exercises.`)

    // Delete all existing exercises
    console.log('Deleting existing exercises...')
    // Usamos una condición que siempre sea verdadera para borrar todo
    const { error: deleteError } = await supabase
      .from('exercises')
      .delete()
      .not('id', 'is', null)

    if (deleteError) {
      console.error('Error deleting exercises:', deleteError)
      process.exit(1)
    }

    console.log('Inserting new exercises...')

    // Batch insert in chunks of 100
    const CHUNK_SIZE = 100
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE).map(row => ({
        id: row.ID,
        name: row.Name,
        target_muscle: row.Target,
        body_part: row.BodyPart,
        equipment: row.Equipment,
        gif_url: row.GifUrl,
        instructions: row.Instructions ? row.Instructions.split('|').map(s => s.trim()) : [],
        secondary_muscles: row.SecondaryMuscles ? row.SecondaryMuscles.split(',').map(s => s.trim()).filter(s => s !== '') : []
      }))

      const { error: insertError } = await supabase
        .from('exercises')
        .insert(chunk)

      if (insertError) {
        console.error(`Error inserting chunk ${i / CHUNK_SIZE}:`, insertError)
        // If one chunk fails, we might want to continue or stop. Stopping is safer to identify issues.
        process.exit(1)
      }
      console.log(`Inserted ${Math.min(i + CHUNK_SIZE, data.length)}/${data.length}`)
    }

    console.log('Import completed successfully!')
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

importExercises()
