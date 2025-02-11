import { query, queryExt } from 'lib/neondb';
import { neon } from '@neondatabase/serverless';

jest.mock('@neondatabase/serverless', () => ({
  neon: jest.fn(),
}));

describe('neondb', () => {
  const mockConnection = 'mock_connection_string';
  const mockQueryFunction = jest.fn();
  const mockEmptyRowData: Array<{ field: string }> = [];
  const mockEmptyExtRowData = {
    rows: mockEmptyRowData,
    rowCount: 0,
  };
  const mockWithRecordData = [{ field: 'val' }];
  const mockWithDataExtRowData = {
    rows: mockWithRecordData,
    rowCount: mockWithRecordData.length,
  };
  const mockQueryPromise = Promise.resolve(mockEmptyRowData);
  const mockQueryExtPromise = Promise.resolve(mockEmptyExtRowData);
  const mockQueryWithDataPromise = Promise.resolve(mockWithRecordData);
  const mockQueryExtWithDataPromise = Promise.resolve(mockWithDataExtRowData);

  beforeAll(() => {
    process.env.DATABASE_URL = mockConnection;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (neon as jest.Mock).mockReturnValue(mockQueryFunction);
    mockQueryFunction.mockReturnValue(mockQueryPromise);
  });

  describe('query', () => {
    it('should execute a query with the provided callback', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryPromise);

      const result = await query(callback);

      expect(neon).toHaveBeenCalledWith(mockConnection, { fullResults: false });
      expect(callback).toHaveBeenCalledWith(mockQueryFunction);
      expect(result).toBe(mockEmptyRowData);
    });

    it('should throw an error if the callback throws an error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Query error'));

      await expect(query(callback)).rejects.toThrow('Query error');
    });

    describe('query with transform', () => {
      it('should apply the transform function to each result', async () => {
        const callback = jest.fn().mockReturnValue(mockQueryWithDataPromise);
        const transform = jest.fn().mockImplementation((result) => ({
          ...result,
          transformed: true,
        }));

        const result = await query(callback, { transform });

        expect(neon).toHaveBeenCalledWith(mockConnection, {
          fullResults: false,
        });
        expect(callback).toHaveBeenCalledWith(mockQueryFunction);
        expect(transform).toHaveBeenCalledTimes(1);
        expect(result).toEqual([{ field: 'val', transformed: true }]);
      });

      it('should handle transform function throwing an error', async () => {
        const callback = jest.fn().mockReturnValue(mockQueryWithDataPromise);
        const transform = jest.fn().mockImplementation(() => {
          throw new Error('Transform error');
        });

        await expect(query(callback, { transform })).rejects.toThrow(
          new Error('Transform error')
        );
      });

      it('should return the original promise if no transform is provided', async () => {
        const callback = jest.fn().mockReturnValue(mockQueryPromise);

        const result = await query(callback);

        expect(neon).toHaveBeenCalledWith(mockConnection, {
          fullResults: false,
        });
        expect(callback).toHaveBeenCalledWith(mockQueryFunction);
        expect(result).toBe(mockEmptyRowData);
      });
    });
  });

  describe('queryExt', () => {
    it('should execute a query with extended results using the provided callback', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryExtPromise);

      const result = await queryExt(callback);

      expect(neon).toHaveBeenCalledWith(mockConnection, { fullResults: true });
      expect(callback).toHaveBeenCalledWith(mockQueryFunction);
      expect(result).toStrictEqual(mockEmptyExtRowData);
    });

    it('should throw an error if the callback throws an error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Query error'));

      await expect(queryExt(callback)).rejects.toThrow('Query error');
    });
  });

  describe('queryExt with transform', () => {
    it('should apply the transform function to each result', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryExtWithDataPromise);
      const transform = jest.fn().mockImplementation((result) => ({
        ...result,
        transformed: true,
      }));

      const result = await queryExt(callback, { transform });

      expect(neon).toHaveBeenCalledWith(mockConnection, {
        fullResults: true,
      });
      expect(callback).toHaveBeenCalledWith(mockQueryFunction);
      expect(transform).toHaveBeenCalledTimes(1);
      expect(result.rows).toEqual([{ field: 'val', transformed: true }]);
    });

    it('should handle transform function throwing an error', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryExtWithDataPromise);
      const transform = jest.fn().mockImplementation(() => {
        throw new Error('Transform error');
      });

      await expect(queryExt(callback, { transform })).rejects.toThrow(
        new Error('Transform error')
      );
    });

    it('should return the original promise if no transform is provided', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryExtWithDataPromise);

      const result = await queryExt(callback);

      expect(neon).toHaveBeenCalledWith(mockConnection, {
        fullResults: true,
      });
      expect(callback).toHaveBeenCalledWith(mockQueryFunction);
      expect(result.rows).toEqual(mockWithRecordData);
    });
  });
});
