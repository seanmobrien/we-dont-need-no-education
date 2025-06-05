/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
  isError: jest.fn((error: any) => error instanceof Error),
}));
jest.mock('@/lib/ai/services/search');
// jest.mock('@/lib/ai/services/search/HybridDocumentSearch');
jest.mock('@/lib/logger');

import { searchCaseFile } from '@/lib/ai/tools/searchCaseFile';
import {
  HybridDocumentSearch,
  hybridDocumentSearchFactory,
} from '@/lib/ai/services/search';

import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';

describe('searchCaseFile', () => {
  const mockHybridSearch = jest.fn();
  const mockLog = jest.fn();

  beforeEach(() => {
    (HybridDocumentSearch as jest.Mock).mockImplementation(() => ({
      hybridSearch: mockHybridSearch,
    }));
    (log as jest.Mock).mockImplementation((cb) => cb({ trace: mockLog }));
    (hybridDocumentSearchFactory as jest.Mock).mockImplementation(() => ({
      hybridSearch: mockHybridSearch,
    }));
  });

  it('should call HybridDocumentSearch.hybridSearch with the correct arguments and log the call', async () => {
    const query = 'test query';
    const options = { foo: 'bar' } as any;
    const expectedResult = [{ id: 1, title: 'result' }];
    mockHybridSearch.mockResolvedValue(expectedResult);

    const result = await searchCaseFile({ query, options });

    expect(mockHybridSearch).toHaveBeenCalledWith(query, options);
    expect(mockLog).toHaveBeenCalledWith('searchCaseFile invoked.', {
      query,
      options,
      ret: expectedResult,
    });
    expect(
      result.structuredContent.result.isError
        ? null
        : result.structuredContent.result.items,
    ).toEqual(expectedResult);
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

    const result = await searchCaseFile({ query, options });
    expect(result.structuredContent.result.isError).toBe(true);
    expect(
      result.structuredContent.result.isError
        ? result.structuredContent.result.message
        : '',
    ).toBe('logged');

    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalledWith(error, {
      log: true,
      message: 'Error searching policy',
      data: { query, options },
    });
  });
});
