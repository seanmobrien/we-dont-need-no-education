import {
    isLikeNextRequest,
    isLikeNextResponse,
    isNextApiRequest,
    isNextApiResponse,
    isNextRequest,
    isNextResponse,
} from '../../src/lib/nextjs/guards';

describe('nextjs guards extended', () => {
    it('validates NextApiRequest and NextRequest distinctions', () => {
        const apiReq = {
            method: 'GET',
            headers: {},
            body: {},
            cookies: {},
            query: {},
        };
        const nextReq = {
            method: 'POST',
            headers: {},
            body: {},
            nextUrl: {},
        };

        expect(isNextApiRequest(apiReq)).toBe(true);
        expect(isNextApiRequest(nextReq)).toBe(false);

        expect(isNextRequest(nextReq)).toBe(true);
        expect(isNextRequest(apiReq)).toBe(false);

        expect(isLikeNextRequest(apiReq)).toBe(true);
        expect(isLikeNextRequest(nextReq)).toBe(true);
        expect(isLikeNextRequest({})).toBe(false);
    });

    it('validates like-response and concrete response guards', () => {
        const apiRes = {
            status: jest.fn(),
            json: jest.fn(),
            getHeader: jest.fn(),
        };

        const nextRes = {
            status: 200,
            headers: {},
            cookies: {},
        };

        expect(isLikeNextResponse(apiRes)).toBe(true);
        expect(isLikeNextResponse(nextRes)).toBe(true);
        expect(isLikeNextResponse({ status: 'bad' })).toBe(false);

        expect(isNextApiResponse(apiRes)).toBe(true);
        expect(isNextApiResponse(nextRes)).toBe(false);
        expect(isNextApiResponse({ status: jest.fn(), json: jest.fn() })).toBe(false);

        expect(isNextResponse(nextRes)).toBe(true);
        expect(isNextResponse(apiRes)).toBe(false);
        expect(isNextResponse({ status: 200, headers: {} })).toBe(false);
    });
});