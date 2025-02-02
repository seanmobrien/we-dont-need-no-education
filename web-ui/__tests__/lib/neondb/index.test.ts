import { query, queryExt } from 'lib/neondb';
import { neon } from '@neondatabase/serverless';

jest.mock('@neondatabase/serverless', () => ({
  neon: jest.fn(),
}));

describe('neondb', () => {
  const mockConnection = 'mock_connection_string';
  const mockQueryFunction = jest.fn();
  const mockRowData = { rows: [] };
  const mockQueryPromise = Promise.resolve(mockRowData);

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
      expect(result).toBe(mockRowData);
    });

    it('should throw an error if the callback throws an error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Query error'));

      await expect(query(callback)).rejects.toThrow('Query error');
    });
  });

  describe('queryExt', () => {
    it('should execute a query with extended results using the provided callback', async () => {
      const callback = jest.fn().mockReturnValue(mockQueryPromise);

      const result = await queryExt(callback);

      expect(neon).toHaveBeenCalledWith(mockConnection, { fullResults: true });
      expect(callback).toHaveBeenCalledWith(mockQueryFunction);
      expect(result).toBe(mockRowData);
    });

    it('should throw an error if the callback throws an error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Query error'));

      await expect(queryExt(callback)).rejects.toThrow('Query error');
    });
  });
});