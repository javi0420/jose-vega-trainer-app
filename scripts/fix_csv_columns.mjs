import fs from 'fs';
import Papa from 'papaparse';

const inputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido.csv';
const outputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido_Limpio.csv';

console.log(`Reading translated CSV from ${inputFile}...`);
const fileContent = fs.readFileSync(inputFile, 'utf8');

Papa.parse(fileContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    complete: (results) => {
        let rows = results.data;

        // Remove the incompatible columns from each row
        rows.forEach(row => {
            delete row.muscle_group;
            delete row.source;
        });

        console.log('Writing fixed CSV...');
        // Convert back to CSV. 
        // We will output with a comma ',' this time as it is the most standard for Supabase, 
        // but since instructions have commas, PapaParse will automatically wrap them in quotes.
        const csvOut = Papa.unparse(rows, { delimiter: ',' });

        fs.writeFileSync(outputFile, csvOut);
        console.log('✅ Columns removed! Saved to:', outputFile);
    }
});
