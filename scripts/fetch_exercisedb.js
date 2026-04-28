const axios = require('axios');
const fs = require('fs');
const { Parser } = require('json2csv');

// Configuration
const API_URL = 'https://exercisedb.p.rapidapi.com/exercises?limit=0'; // limit=0 fetches all exercises
// NOTE: To run this, you will need a valid RapidAPI Key for ExerciseDB
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'TU_API_KEY_AQUI'; // Reemplazar con clave real
const OUTPUT_FILE = 'C:/Users/Lindo/Downloads/All_ExerciseDB_Exercises.csv';

async function fetchExercises() {
    if (RAPIDAPI_KEY === 'TU_API_KEY_AQUI') {
        console.error('❌ ERROR: Necesitas proveer una API Key válida de RapidAPI (ExerciseDB) en el script.');
        console.log('Puedes registrarte gratis en: https://rapidapi.com/justin-roche/api/exercisedb');
        return;
    }

    console.log('🔄 Conectando a ExerciseDB API...');
    try {
        const response = await axios.get(API_URL, {
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
            }
        });

        const exercises = response.data;
        console.log(`✅ ¡Éxito! Recuperados ${exercises.length} ejercicios.`);

        if (exercises.length > 0) {
            console.log('📝 Generando archivo CSV...');

            // Format instructions from array to string if needed
            const formattedExercises = exercises.map(ex => {
                return {
                    ...ex,
                    instructions: Array.isArray(ex.instructions) ? ex.instructions.join(' ') : ex.instructions
                };
            });

            // Flatten the JSON structure into CSV
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(formattedExercises);

            fs.writeFileSync(OUTPUT_FILE, csv);
            console.log(`🎉 Archivo guardado correctamente en: ${OUTPUT_FILE}`);
        } else {
            console.log('⚠️ La API no devolvió ejercicios.');
        }

    } catch (error) {
        console.error('❌ Error al obtener los datos de la API:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Message:', error.response.data.message || error.response.statusText);
        } else {
            console.error(error.message);
        }
    }
}

fetchExercises();
