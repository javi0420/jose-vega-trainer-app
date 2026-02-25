import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'public', 'logo-jose-vega.png');
const outputDir = path.join(process.cwd(), 'public');

async function generateAssets() {
    console.log('Generating assets from:', inputFile);

    try {
        const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
        const darkTheme = { r: 17, g: 24, b: 39, alpha: 1 }; // bg-gray-900 approx #111827

        // pwa-64x64.png
        await sharp(inputFile)
            .resize(64, 64, { fit: 'contain', background: transparent })
            .png()
            .toFile(path.join(outputDir, 'pwa-64x64.png'));
        console.log('✅ Created pwa-64x64.png');

        // pwa-192x192.png
        await sharp(inputFile)
            .resize(192, 192, { fit: 'contain', background: transparent })
            .png()
            .toFile(path.join(outputDir, 'pwa-192x192.png'));
        console.log('✅ Created pwa-192x192.png');

        // pwa-512x512.png
        await sharp(inputFile)
            .resize(512, 512, { fit: 'contain', background: transparent })
            .png()
            .toFile(path.join(outputDir, 'pwa-512x512.png'));
        console.log('✅ Created pwa-512x512.png');

        // maskable-icon-512x512.png (maskable icons need solid background)
        await sharp(inputFile)
            .resize(400, 400, { fit: 'contain', background: darkTheme })
            .extend({
                top: 56, bottom: 56, left: 56, right: 56,
                background: darkTheme
            })
            .png()
            .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
        console.log('✅ Created maskable-icon-512x512.png');

        // favicon.ico
        await sharp(inputFile)
            .resize(32, 32, { fit: 'contain', background: transparent })
            .png()
            .toFile(path.join(outputDir, 'favicon.ico'));
        console.log('✅ Created favicon.ico');

        // Main UI Logo (transparent) replacing the old .jpg
        await sharp(inputFile)
            .resize(512, 512, { fit: 'contain', background: transparent })
            .png()
            .toFile(path.join(outputDir, 'logo-jose-vega-ui.png'));
        console.log('✅ Created logo-jose-vega-ui.png');

        console.log('🎉 All assets generated successfully with transparency!');
    } catch (error) {
        console.error('❌ Error generating assets:', error);
    }
}

generateAssets();
