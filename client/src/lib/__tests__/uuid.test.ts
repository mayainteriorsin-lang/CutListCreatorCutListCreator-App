import { describe, it, expect, vi } from 'vitest';
import { generateUUID } from '../uuid';

describe('generateUUID', () => {
    it('should return a valid UUID string', () => {
        const id = generateUUID();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should be unique', () => {
        const ids = new Set();
        for (let i = 0; i < 1000; i++) {
            ids.add(generateUUID());
        }
        expect(ids.size).toBe(1000);
    });

    it('should use fallback if crypto is not available', () => {
        // Mock crypto being undefined
        const originalCrypto = global.crypto;

        // This is a bit tricky in JSDOM environment which usually has crypto.
        // We'll try to redefine checking behavior.
        // NOTE: Redefining global crypto might affect other tests, usually safe in isolation or use vi.stubGlobal

        vi.stubGlobal('crypto', undefined);

        const id = generateUUID();
        expect(id).toHaveLength(36);
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

        // Restore
        vi.stubGlobal('crypto', originalCrypto);
    });
});
