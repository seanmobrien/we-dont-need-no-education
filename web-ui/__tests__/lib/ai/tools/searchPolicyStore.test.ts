/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/ai/services/search');
jest.mock('@/lib/logger');
jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((error, options) => {
      return new Error(options.message);
    }),
  },
  isError: jest.fn((error: any) => error instanceof Error),
}));

import { searchPolicyStore } from '@/lib/ai/tools/searchPolicyStore';
import { HybridPolicySearch } from '@/lib/ai/services/search';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { hybridPolicySearchFactory } from '@/lib/ai/services/search';
import { toolCallbackResultFactory } from '@/lib/ai/tools/utility';

describe('searchPolicyStore', () => {
  const mockHybridSearch = jest.fn();
  const mockLog = jest.fn();

  beforeEach(() => {
    (HybridPolicySearch as jest.Mock).mockImplementation(() => ({
      hybridSearch: mockHybridSearch,
    }));
    (hybridPolicySearchFactory as jest.Mock).mockReturnValue({
      hybridSearch: mockHybridSearch,
    });
    (log as jest.Mock).mockImplementation((cb) => cb({ trace: mockLog }));
  });

  it('should call HybridPolicySearch.hybridSearch with the correct arguments and log the call', async () => {
    const query = 'test query';
    const options = { foo: 'bar' } as any;
    const expectedResult = {
      results: [{ id: 1, content: 'result' }],
    };
    const wrappedResult = toolCallbackResultFactory(expectedResult);
    mockHybridSearch.mockResolvedValueOnce(expectedResult);

    const result = await searchPolicyStore({ query, options });

    expect(mockHybridSearch).toHaveBeenCalledTimes(1);
    expect(mockHybridSearch).toHaveBeenCalledWith(query, options);
    expect(mockLog).toHaveBeenCalled();
    expect(result).toEqual(wrappedResult);
  });

  it('should throw a LoggedError if HybridPolicySearch.hybridSearch throws', async () => {
    const query = 'fail query';
    const options = { foo: 'baz' } as any;
    const error = new Error('fail');
    const loggedError = new Error('logged') as any;
    const expectedResult = toolCallbackResultFactory<unknown>(loggedError);
    mockHybridSearch.mockImplementation(() => {
      throw error;
    });
    (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock).mockReturnValue(
      loggedError,
    );

    expect(await searchPolicyStore({ query, options })).toEqual(expectedResult);

    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(error, {
      log: true,
      message: 'Error searching policy',
      data: { query, options },
    });
  });
});
