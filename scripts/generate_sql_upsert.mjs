import fs from 'fs';
import Papa from 'papaparse';

// We intentionally use the translated file BEFORE we deleted the muscle_group column
const inputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido.csv';
const outputFile = 'C:\\Users\\Lindo\\Downloads\\Update_Exercises_Translated.sql';

console.log(`Reading CSV from ${inputFile}...`);
const fileContent = fs.readFileSync(inputFile, 'utf8');

function parseInstructionsToSQLArray(instructionsString) {
    if (!instructionsString) return 'ARRAY[]::text[]';

    // Split the string by matching numbers followed by a dot and a space
    const parts = instructionsString.split(/(?=\b\d+\.\s)/g)
        .map(step => step.trim())
        .filter(step => step.length > 0);

    if (parts.length === 0) return 'ARRAY[]::text[]';

    const formattedParts = parts.map(part => {
        const escaped = part.replace(/'/g, "''");
        return `'${escaped}'`;
    });

    return `ARRAY[${formattedParts.join(', ')}]::text[]`;
}

Papa.parse(fileContent, {
    header: true,
    // The original translated file still uses the semicolon delimiter
    delimiter: ';',
    skipEmptyLines: true,
    complete: (results) => {
        let rows = results.data;

        console.log(`Generating SQL for ${rows.length} rows...`);

        let sql = `-- SQL Upsert script to update translated exercises\n`;
        sql += `INSERT INTO public.exercises (id, name, equipment, gif_url, instructions, body_part)\nVALUES\n`;

        const values = rows.map((row) => {
            const id = `'${row.id.replace(/'/g, "''")}'`;
            const name = `'${row.name?.replace(/'/g, "''") || ''}'`;
            const equipment = `'${row.equipment?.replace(/'/g, "''") || ''}'`;
            const gif_url = `'${row.gif_url?.replace(/'/g, "''") || ''}'`;

            const instructions = parseInstructionsToSQLArray(row.instructions);

            // CRITICAL FIX: The CSV stores the actual muscle group in the 'muscle_group' column.
            // The 'body_part' column in the CSV is just "General".
            // Since the Supabase table ONLY has 'body_part' and not 'muscle_group',
            // we map the CSV's 'muscle_group' directly to the SQL's 'body_part' column!
            // We also convert it to lowercase to match the UI's select options (pecho, espalda, piernas, etc.)
            let properMuscleGroup = row.muscle_group || row.body_part || 'general';
            properMuscleGroup = properMuscleGroup.toLowerCase();
            const body_part = `'${properMuscleGroup.replace(/'/g, "''")}'`;

            return `(${id}, ${name}, ${equipment}, ${gif_url}, ${instructions}, ${body_part})`;
        });

        sql += values.join(',\n');

        sql += `\nON CONFLICT (id) DO UPDATE SET\n`;
        sql += `  name = EXCLUDED.name,\n`;
        sql += `  equipment = EXCLUDED.equipment,\n`;
        sql += `  gif_url = EXCLUDED.gif_url,\n`;
        sql += `  instructions = EXCLUDED.instructions,\n`;
        sql += `  body_part = EXCLUDED.body_part;\n`;

        fs.writeFileSync(outputFile, sql);
        console.log('✅ SQL Script generated successfully! Saved to:', outputFile);
    }
});
