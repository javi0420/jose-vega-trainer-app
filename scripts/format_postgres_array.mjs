import fs from 'fs';
import Papa from 'papaparse';

const inputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido_Limpio.csv';
const outputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido_Final.csv';

console.log(`Reading clean CSV from ${inputFile}...`);
const fileContent = fs.readFileSync(inputFile, 'utf8');

function parseInstructionsToArrayString(instructionsString) {
    if (!instructionsString) return '{}';

    // Split the string by matching numbers followed by a dot and a space
    const parts = instructionsString.split(/(?=\b\d+\.\s)/g)
        .map(step => step.trim())
        .filter(step => step.length > 0);

    if (parts.length === 0) return '{}';

    // Format for Postgres array: {"item 1","item 2"}
    // Make sure to escape internal double quotes by doubling them up or using backslash
    const formattedParts = parts.map(part => {
        const escaped = part.replace(/"/g, '""');
        return `"${escaped}"`;
    });

    return `{${formattedParts.join(',')}}`;
}

Papa.parse(fileContent, {
    header: true,
    delimiter: ',',
    skipEmptyLines: true,
    complete: (results) => {
        let rows = results.data;

        // Format the instructions column for Postgres text[]
        rows = rows.map(row => {
            return {
                ...row,
                instructions: parseInstructionsToArrayString(row.instructions)
            };
        });

        console.log('Writing Postgres-ready CSV...');
        // Convert back to CSV with comma delimiter
        const csvOut = Papa.unparse(rows, { delimiter: ',' });

        fs.writeFileSync(outputFile, csvOut);
        console.log('✅ Instructions formatted! Saved to:', outputFile);
    }
});
