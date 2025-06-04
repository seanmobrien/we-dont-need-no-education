import { searchCaseFile } from '@/lib/ai/tools/searchCaseFile';
import { HybridDocumentSearch } from '@/lib/ai/services/search';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/ai/services/search');
jest.mock('@/lib/logger');
jest.mock('@/lib/react-util');

describe('searchCaseFile', () => {
  const mockHybridSearch = jest.fn();
  const mockLog = jest.fn();

  beforeEach(() => {
    (HybridDocumentSearch as jest.Mock).mockImplementation(() => ({
      hybridSearch: mockHybridSearch,
    }));
    (log as jest.Mock).mockImplementation((cb) => cb({ trace: mockLog }));
    jest.clearAllMocks();
  });

  it('should call HybridDocumentSearch.hybridSearch with the correct arguments and log the call', async () => {
    const query = 'test query';
    const options = { foo: 'bar' } as any;
    const expectedResult = [{ id: 1, title: 'result' }];
    mockHybridSearch.mockReturnValue(expectedResult);

    const result = await searchCaseFile({ query, options });

    expect(HybridDocumentSearch).toHaveBeenCalledTimes(1);
    expect(mockHybridSearch).toHaveBeenCalledWith(query, options);
    expect(mockLog).toHaveBeenCalledWith('searchCaseFile invoked.', {
      query,
      options,
      ret: expectedResult,
    });
    expect(result).toBe(expectedResult);
  });

  it('should throw a LoggedError if HybridDocumentSearch.hybridSearch throws', async () => {
    const query = 'fail query';
    const options = { foo: 'baz' } as any;
    const error = new Error('fail');
    const loggedError = new Error('logged') as any;
    mockHybridSearch.mockImplementation(() => {
      throw error;
    });
    (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock).mockReturnValue(
      loggedError,
    );

    await expect(searchCaseFile({ query, options })).rejects.toBe(loggedError);

    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(error, {
      log: true,
      message: 'Error searching case file',
      data: { query, options },
    });
  });
});
