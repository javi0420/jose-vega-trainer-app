/**
 * Determina el "Mejor Set" (Best Performance) de una lista de series.
 * Prioridad: 1. Mayor Peso -> 2. Mayor Reps -> 3. Más reciente (implícito por orden de array)
 * 
 * @param {Array<{weight: number, reps: number, [key: string]: any}>} sets 
 * @returns {Object|null} El objeto del set ganador o null si no hay sets válidos.
 */
export function getBestSet(sets) {
    // 0. Validación de entrada
    if (!Array.isArray(sets) || sets.length === 0) {
        return null;
    }

    // 1. Filtrar sets inválidos (opcional pero recomendado en producción)
    // Aseguramos que tengan peso y reps definidos
    const validSets = sets.filter(s =>
        s && typeof Number(s.weight) === 'number' && typeof Number(s.reps) === 'number'
    );

    if (validSets.length === 0) return null;

    // 2. Ordenamiento (.sort muta el array, así que hacemos copy con [...])
    const sortedSets = [...validSets].sort((a, b) => {
        const weightA = Number(a.weight);
        const weightB = Number(b.weight);
        const repsA = Number(a.reps);
        const repsB = Number(b.reps);

        // Prioridad 1: Peso (Descendente)
        // Si la diferencia es positiva, b es mayor y va primero.
        if (weightB !== weightA) {
            return weightB - weightA;
        }

        // Prioridad 2: Repeticiones (Descendente)
        // Solo llegamos aquí si el peso es idéntico (Empate técnico)
        return repsB - repsA;

        // Prioridad 3 (Implícita):
        // Si weight y reps son iguales, .sort mantiene el orden relativo (si es estable) 
        // o el resultado es 0, dejándolos como estaban.
    });

    // 3. Retornar el ganador (índice 0 tras el ordenamiento)
    return sortedSets[0];
}
