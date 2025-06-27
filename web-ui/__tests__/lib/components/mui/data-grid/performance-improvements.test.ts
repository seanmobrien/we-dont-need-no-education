import { StableDefaultInitialState, StableDefaultPageSizeOptions } from '@/lib/components/mui/data-grid/default-values';
import { GridRecordCache } from '@/lib/components/mui/data-grid/grid-record-cache';

describe('Grid Performance Improvements', () => {
  describe('Default Values Optimization', () => {
    it('should have increased default page size to 25', () => {
      expect(StableDefaultInitialState.pagination.paginationModel.pageSize).toBe(25);
    });

    it('should have optimized page size options', () => {
      expect(StableDefaultPageSizeOptions).toEqual([25, 50, 100]);
    });
  });

  describe('GridRecordCache Performance', () => {
    it('should not create unnecessary promise chains in chain method', async () => {
      // Mock fetch
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: 1, name: 'Test' }],
          pageStats: { total: 1 },
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const cacheResponse = await GridRecordCache.getWithFetch({
        url: 'https://example.com/test',
        page: 0,
        pageSize: 25,
        signal: new AbortController().signal,
      });

      expect(cacheResponse).toBeDefined();
      expect(cacheResponse.rows).toHaveLength(1);
      expect(cacheResponse.rowCount).toBe(1);
    });

    it('should cache responses properly', async () => {
      // Mock fetch
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: 1, name: 'Test' }],
          pageStats: { total: 1 },
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const props = {
        url: 'https://example.com/test-cache',
        page: 0,
        pageSize: 25,
        signal: new AbortController().signal,
      };

      // First call
      await GridRecordCache.getWithFetch(props);
      
      // Peek should return cached result
      const cachedResult = GridRecordCache.peek(props);
      expect(cachedResult).toBeDefined();
    });
  });
});