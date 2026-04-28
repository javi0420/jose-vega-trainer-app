import fs from 'fs';
import { Parser } from 'json2csv';
// fetch is natively available in Node 18+, no need to import node-fetch

const EXERCISES_API_BASE = "https://exercisedb-api.vercel.app/api/v1/exercises";
const OUTPUT_FILE = 'C:/Users/Lindo/Downloads/Ejercicios_ExerciseDB_Originales.csv';

async function fetchAndSaveExercises() {
    console.log(`🚀 Iniciando descarga masiva desde: ${EXERCISES_API_BASE}`);

    try {
        let allExercises = [];
        let limit = 100;
        let offset = 0;
        let keepFetching = true;

        while (keepFetching) {
            console.log(`📡 Descargando bloque (offset ${offset})...`);
            const response = await fetch(`${EXERCISES_API_BASE}?limit=${limit}&offset=${offset}`);

            if (!response.ok) {
                console.error(`❌ Error en offset ${offset}: HTTP ${response.status}`);
                break;
            }

            const jsonResponse = await response.json();
            const rawData = jsonResponse.data;

            if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
                console.log("🏁 No hay más datos para descargar.");
                keepFetching = false;
                break;
            }

            allExercises = allExercises.concat(rawData);
            offset += limit;

            // Pausa de cortesía para no saturar la API gratuita
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`📦 Se descargaron ${allExercises.length} ejercicios en total.`);

        if (allExercises.length > 0) {
            console.log('📝 Convirtiendo datos a formato CSV...');

            // Estructurar / aplanar los datos (especialmente las instrucciones que son un Array)
            const structuredData = allExercises.map(exercise => {
                return {
                    id: exercise.exerciseId || exercise.id || '',
                    name: exercise.name || '',
                    body_part: exercise.bodyPart || '',
                    target_muscle: exercise.target || '',
                    equipment: exercise.equipment || '',
                    gif_url: exercise.gifUrl || '',
                    instructions: Array.isArray(exercise.instructions)
                        ? exercise.instructions.join('\n')
                        : (exercise.instructions || ''),
                    secondary_muscles: Array.isArray(exercise.secondaryMuscles)
                        ? exercise.secondaryMuscles.join(', ')
                        : (exercise.secondaryMuscles || '')
                };
            });

            // Usar json2csv para generar el archivo
            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(structuredData);

            fs.writeFileSync(OUTPUT_FILE, csv, 'utf8');
            console.log(`🎉 ¡ÉXITO! Archivo guardado correctamente en: ${OUTPUT_FILE}`);
        }

    } catch (error) {
        console.error("💥 Error fatal durante el proceso:", error);
    }
}

fetchAndSaveExercises();
