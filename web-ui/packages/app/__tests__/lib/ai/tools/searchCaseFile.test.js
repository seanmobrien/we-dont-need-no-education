import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
jest.mock('@compliance-theater/logger', () => ({
    ...jest.requireActual('@compliance-theater/logger'),
    LoggedError: {
        isTurtlesAllTheWayDownBaby: jest.fn(),
    },
    isError: jest.fn((error) => error instanceof Error),
}));
jest.mock('@/lib/ai/services/search');
import { localSearchCaseFile } from '@/lib/ai/tools/searchCaseFile';
import { HybridDocumentSearch, hybridDocumentSearchFactory, } from '@/lib/ai/services/search';
import { log, LoggedError } from '@compliance-theater/logger';
describe('searchCaseFile', () => {
    const mockHybridSearch = jest.fn();
    const mockLog = jest.fn();
    const mockError = jest.fn();
    beforeEach(() => {
        HybridDocumentSearch.mockImplementation(() => ({
            hybridSearch: mockHybridSearch,
        }));
        log.mockImplementation((cb) => cb({ trace: mockLog, error: mockError }));
        hybridDocumentSearchFactory.mockImplementation(() => ({
            hybridSearch: mockHybridSearch,
        }));
    });
    it('should call HybridDocumentSearch.hybridSearch with the correct arguments and log the call', async () => {
        const query = 'test query';
        const options = { durationMs: 0, foo: 'bar', resultCount: 0 };
        const expectedResult = [{ id: 1, title: 'result' }];
        mockHybridSearch.mockResolvedValue(expectedResult);
        const result = await localSearchCaseFile({ query, options });
        expect(mockHybridSearch).toHaveBeenCalledWith(query, options);
        expect(mockLog).toHaveBeenCalled();
        expect(result.structuredContent.result.isError
            ? null
            : result.structuredContent.result.items).toEqual(expectedResult);
    });
    it('should throw a LoggedError if HybridDocumentSearch.hybridSearch throws', async () => {
        const query = 'fail query';
        const options = { foo: 'baz' };
        const error = new Error('fail');
        const loggedError = new Error('logged');
        mockHybridSearch.mockImplementation(() => {
            throw error;
        });
        LoggedError.isTurtlesAllTheWayDownBaby.mockReturnValue(loggedError);
        const result = await localSearchCaseFile({ query, options });
        expect(result.structuredContent.result.isError).toBe(true);
        expect(result.structuredContent.result.isError
            ? result.structuredContent.result.message
            : '').toBe('logged');
        expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(error, {
            log: true,
            message: 'Error searching case file',
            data: { query, options },
        });
    });
});
//# sourceMappingURL=searchCaseFile.test.js.map