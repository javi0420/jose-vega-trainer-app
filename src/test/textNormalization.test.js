import { describe, it, expect } from 'vitest';
import { normalizeText } from '../utils/text';

describe('normalizeText utility', () => {
    it('should convert text to lowercase', () => {
        expect(normalizeText('HELLO')).toBe('hello');
    });

    it('should remove accents (tildes)', () => {
        expect(normalizeText('áéíóúÁÉÍÓÚ')).toBe('aeiouaeiou');
        expect(normalizeText('ñ')).toBe('n');
        expect(normalizeText('Pájaro')).toBe('pajaro');
    });

    it('should handle multi-word strings with accents', () => {
        expect(normalizeText('Press de Banca Inclinado')).toBe('press de banca inclinado');
        expect(normalizeText('Extensión de Cuádriceps')).toBe('extension de cuadriceps');
    });

    it('should return empty string for null or undefined', () => {
        expect(normalizeText(null)).toBe('');
        expect(normalizeText(undefined)).toBe('');
    });

    it('should handle strings that are already normalized', () => {
        expect(normalizeText('test')).toBe('test');
        expect(normalizeText('123')).toBe('123');
    });
});
