/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Removed Royal Blue override to match premium palette
                // brand: { ... } can be added if needed

                // Neutral & Deep Gunmetal Grays
                gray: {
                    700: '#1A1A1A',
                    800: '#141414',
                    900: '#0A0A0A',
                    950: '#000000', // Pure black
                },
                // Add Gold
                gold: {
                    400: '#FFD700',
                    500: '#D4AF37',
                    600: '#B8860B',
                },
                // Alias Gold to something if needed or use 'text-gold-400' classes
            },
        },
    },
    plugins: [],
}
