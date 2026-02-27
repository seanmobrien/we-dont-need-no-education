/* @jest-environment node */

import { resolveService } from '@compliance-theater/types/dependency-injection';
import { fetchService } from '../src/index';

describe('fetch-service DI registration', () => {
    it('registers and resolves fetch-service from container', () => {
        const resolved = resolveService('fetch-service');

        expect(resolved).toBeDefined();
        expect(typeof resolved.fetch).toBe('function');
        expect(resolved).toBe(fetchService);
    });
});
