import { isRequestOrApiRequest } from '@/lib/nextjs-util/guards';
describe('isRequestOrApiRequest', () => {
    it('should return true for a valid NextApiRequest object', () => {
        const req = {
            body: {},
            method: 'GET',
        };
        expect(isRequestOrApiRequest(req)).toBe(true);
    });
    it('should return true for a valid NextRequest object', () => {
        const req = {
            body: {},
            method: 'GET',
        };
        expect(isRequestOrApiRequest(req)).toBe(true);
    });
    it('should return false for an object without body property', () => {
        const req = {
            method: 'GET',
        };
        expect(isRequestOrApiRequest(req)).toBe(false);
    });
    it('should return false for an object without method property', () => {
        const req = {
            body: {},
        };
        expect(isRequestOrApiRequest(req)).toBe(false);
    });
    it('should return false for an object with incorrect body type', () => {
        const req = {
            body: 'not an object',
            method: 'GET',
        };
        expect(isRequestOrApiRequest(req)).toBe(false);
    });
    it('should return false for an object with incorrect method type', () => {
        const req = {
            body: {},
            method: 123,
        };
        expect(isRequestOrApiRequest(req)).toBe(false);
    });
    it('should return false for a non-object input', () => {
        expect(isRequestOrApiRequest(null)).toBe(false);
        expect(isRequestOrApiRequest(undefined)).toBe(false);
        expect(isRequestOrApiRequest('string')).toBe(false);
        expect(isRequestOrApiRequest(123)).toBe(false);
        expect(isRequestOrApiRequest(true)).toBe(false);
    });
});
//# sourceMappingURL=guards.test.js.map