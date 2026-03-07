import { getHeaderValue } from '../../../src/lib/nextjs/get-header-value';
import {
    isNextApiRequest,
    isNextApiResponse,
    isNextRequest,
    isNextResponse,
} from '../../../src/lib/nextjs/guards';

jest.mock('../../../src/lib/nextjs/guards', () => ({
    isNextApiRequest: jest.fn(() => false),
    isNextApiResponse: jest.fn(() => false),
    isNextRequest: jest.fn(() => false),
    isNextResponse: jest.fn(() => false),
    isLikeNextRequest: jest.fn(() => false),
    isLikeNextResponse: jest.fn(() => false),
}));

describe('lib/nextjs/get-header-value', () => {
    const isNextApiRequestMock = isNextApiRequest as jest.MockedFunction<typeof isNextApiRequest>;
    const isNextRequestMock = isNextRequest as jest.MockedFunction<typeof isNextRequest>;
    const isNextResponseMock = isNextResponse as jest.MockedFunction<typeof isNextResponse>;
    const isNextApiResponseMock = isNextApiResponse as jest.MockedFunction<typeof isNextApiResponse>;

    beforeEach(() => {
        isNextApiRequestMock.mockReset();
        isNextRequestMock.mockReset();
        isNextResponseMock.mockReset();
        isNextApiResponseMock.mockReset();

        isNextApiRequestMock.mockReturnValue(false);
        isNextRequestMock.mockReturnValue(false);
        isNextResponseMock.mockReturnValue(false);
        isNextApiResponseMock.mockReturnValue(false);
    });

    it('reads lowercased header from NextApiRequest shape', () => {
        isNextApiRequestMock.mockReturnValue(true);
        const req = {
            headers: {
                authorization: 'Bearer token',
            },
        };

        expect(getHeaderValue(req as never, 'Authorization')).toBe('Bearer token');
    });

    it('reads headers.get for NextRequest shape', () => {
        isNextRequestMock.mockReturnValue(true);
        const req = {
            headers: {
                get: jest.fn((name: string) => (name === 'x-id' ? 'abc' : null)),
            },
        };

        expect(getHeaderValue(req as never, 'x-id')).toBe('abc');
        expect(req.headers.get).toHaveBeenCalledWith('x-id');
    });

    it('reads headers.get for NextResponse shape', () => {
        isNextResponseMock.mockReturnValue(true);
        const res = {
            headers: {
                get: jest.fn(() => 'value-from-response'),
            },
        };

        expect(getHeaderValue(res as never, 'x-any')).toBe('value-from-response');
    });

    it('reads getHeader for NextApiResponse shape', () => {
        isNextApiResponseMock.mockReturnValue(true);
        const res = {
            getHeader: jest.fn(() => 'api-response-header'),
        };

        expect(getHeaderValue(res as never, 'x-header')).toBe('api-response-header');
        expect(res.getHeader).toHaveBeenCalledWith('x-header');
    });

    it('falls back to object.getHeader when present and no guard matches', () => {
        const custom = {
            getHeader: jest.fn(() => 'custom-get-header'),
        };

        expect(getHeaderValue(custom as never, 'x-test')).toBe('custom-get-header');
        expect(custom.getHeader).toHaveBeenCalledWith('x-test');
    });

    it('falls back to headers.get when available and no guard matches', () => {
        const req = {
            headers: {
                get: jest.fn(() => 'headers-get-fallback'),
            },
        };

        expect(getHeaderValue(req as never, 'x-id')).toBe('headers-get-fallback');
    });

    it('falls back to plain object headers using lowercase lookup', () => {
        const req = {
            headers: {
                'x-trace-id': 'trace-123',
            },
        };

        expect(getHeaderValue(req as never, 'X-Trace-Id')).toBe('trace-123');
    });

    it('returns null for unknown object shapes', () => {
        expect(getHeaderValue({} as never, 'x-none')).toBeNull();
    });

    it('throws for null input with current implementation', () => {
        expect(() => getHeaderValue(null as never, 'x-none')).toThrow(
            "Cannot use 'in' operator to search for 'getHeader' in null"
        );
    });
});