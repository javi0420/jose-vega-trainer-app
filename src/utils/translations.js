/**
 * Dictionary for exercise terms translation
 */
const translations = {
    // Body Parts
    'chest': 'pecho',
    'back': 'espalda',
    'waist': 'cintura',
    'upper arms': 'brazos',
    'lower arms': 'antebrazos',
    'shoulders': 'hombros',
    'lower legs': 'pantorrillas',
    'upper legs': 'piernas',
    'neck': 'cuello',
    'cardio': 'cardio',

    // Target Muscles
    'adductors': 'aductores',
    'hamstrings': 'isquiotibiales',
    'forearms': 'antebrazos',
    'serratus anterior': 'serrato anterior',
    'abs': 'abdominales',
    'levator scapulae': 'elevador de la escápula',
    'glutes': 'glúteos',
    'upper back': 'espalda superior',
    'cardiovascular system': 'sistema cardiovascular',
    'traps': 'trapecios',
    'abductors': 'abductores',
    'lats': 'dorsales',
    'calves': 'gemelos',
    'triceps': 'tríceps',
    'biceps': 'bíceps',
    'spine': 'columna',
    'pectorals': 'pectorales',
    'quads': 'cuádriceps',
    'delts': 'deltoides',
    'deltoids': 'deltoides',

    // Equipment
    'rope': 'cuerda',
    'elliptical machine': 'elíptica',
    'medicine ball': 'balón medicinal',
    'kettlebell': 'pesa rusa',
    'leverage machine': 'máquina de palanca',
    'wheel roller': 'rueda abdominal',
    'assisted': 'asistido',
    'barbell': 'barra',
    'bosu ball': 'bosu',
    'resistance band': 'banda de resistencia',
    'smith machine': 'máquina smith',
    'sled machine': 'trineo',
    'stability ball': 'fitball',
    'olympic barbell': 'barra olímpica',
    'trap bar': 'barra hexagonal',
    'body weight': 'peso corporal',
    'stationary bike': 'bicicleta estática',
    'dumbbell': 'mancuerna',
    'cable': 'polea',
    'machine': 'máquina',
    'ez barbell': 'barra EZ',
    'roller': 'rodillo',
    'weighted': 'con lastre',
    'skipping rope': 'comba',
    'gluteus maximus': 'glúteo mayor',
    'gluteus medius': 'glúteo medio',
    'iliopsoas': 'psoas',
    'soleus': 'sóleo',
    'gastrocnemius': 'gemelos',
    'rhomboids': 'romboides',
    'obliques': 'oblicuos',
    'rectus abdominis': 'recto abdominal',
    'bench': 'banco',
    'pull up bar': 'barra de dominadas',
    'dip station': 'paralelas',
    'band': 'banda',
    'bands': 'bandas',
    'plates': 'discos',
    'rack': 'rack',
    'step': 'step',
    'box': 'cajón'
};

/**
 * Translates a term from English to Spanish.
 * If no translation is found, returns the original term capitalized.
 * @param {string} term 
 * @returns {string}
 */
export const t = (term) => {
    if (!term) return '';
    const cleanTerm = term.toLowerCase().trim();
    const translation = translations[cleanTerm];
    
    if (translation) return translation.charAt(0).toUpperCase() + translation.slice(1);
    
    // If not found, just capitalize first letter of original
    return term.charAt(0).toUpperCase() + term.slice(1);
};
