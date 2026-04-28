import fs from 'fs';
import Papa from 'papaparse';

const inputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado.csv';
const outputFile = 'C:\\Users\\Lindo\\Downloads\\Joaquin_Final_Clasificado_Traducido.csv';

// Helper function to translate text via Google Translate free API endpoint
async function translateText(text) {
    if (!text || text.trim() === '') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Translation request failed with status: ${response.status}`);
            return text; // return original text if limited
        }
        const result = await response.json();
        // Google Translate returns an array of sentence segments
        return result[0].map(s => s[0]).join('');
    } catch (e) {
        console.error('Translation error:', e.message);
        return text;
    }
}

async function processTranslations() {
    console.log(`Reading CSV from ${inputFile}...`);
    const fileContent = fs.readFileSync(inputFile, 'utf8');

    Papa.parse(fileContent, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        complete: async (results) => {
            let rows = results.data;
            console.log(`Parsed ${rows.length} rows. Starting translation... This will take a few minutes.`);

            for (let i = 0; i < rows.length; i++) {
                if (rows[i].instructions && rows[i].instructions.trim() !== '') {
                    rows[i].instructions = await translateText(rows[i].instructions);

                    if ((i + 1) % 50 === 0) {
                        console.log(`Translated ${i + 1}/${rows.length} rows...`);
                    }
                    // Delay 150ms to prevent being blocked for Rate Limiting by Google
                    await new Promise(r => setTimeout(r, 150));
                }
            }

            console.log('Writing back to CSV...');
            // Unparse back to CSV using the exact same semicolon delimiter
            const csvOut = Papa.unparse(rows, { delimiter: ';' });
            fs.writeFileSync(outputFile, csvOut);
            console.log('✅ Translation complete! Saved to:', outputFile);
        }
    });
}

processTranslations();
