/**
 * Normalizes a string by converting it to lowercase and removing accent marks (tildes).
 * Useful for implementing case-insensitive and accent-insensitive searches.
 * 
 * @param {string} text - The text to normalize
 * @returns {string} - The normalized text
 */
export const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};
