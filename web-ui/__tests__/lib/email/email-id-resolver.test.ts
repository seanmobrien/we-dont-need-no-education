import { jest } from '@jest/globals';
import { resolveEmailId } from '@/lib/email/email-id-resolver';

// Mock the dependencies
jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn().mockResolvedValue({
    query: {
      documentUnits: {
        findFirst: jest.fn(),
      },
    },
  }),
}));

jest.mock('@/lib/ai/tools/utility', () => ({
  isValidUuid: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

import { drizDbWithInit } from '@/lib/drizzle-db';
import { isValidUuid } from '@/lib/ai/tools/utility';

const mockDrizDb = drizDbWithInit as jest.MockedFunction<typeof drizDbWithInit>;
const mockIsValidUuid = isValidUuid as jest.MockedFunction<typeof isValidUuid>;

describe('resolveEmailId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null for empty emailIdParam', async () => {
    const result = await resolveEmailId('');
    expect(result).toBeNull();
  });

  it('should return the emailId if it is a valid UUID', async () => {
    const validUuid = '73c51505-9c3f-4782-9324-9fd5e23efbde';
    mockIsValidUuid.mockReturnValue(true);

    const result = await resolveEmailId(validUuid);
    expect(result).toBe(validUuid);
    expect(mockIsValidUuid).toHaveBeenCalledWith(validUuid);
  });

  it('should return null for invalid document ID format', async () => {
    mockIsValidUuid.mockReturnValue(false);

    const result = await resolveEmailId('invalid');
    expect(result).toBeNull();
  });

  it('should resolve document ID to email ID', async () => {
    const documentId = '123';
    const emailId = '73c51505-9c3f-4782-9324-9fd5e23efbde';
    
    mockIsValidUuid.mockReturnValue(false);
    
    const mockDb = {
      query: {
        documentUnits: {
          findFirst: jest.fn().mockResolvedValue({
            unitId: 123,
            emailId: emailId,
          }),
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDrizDb.mockResolvedValue(mockDb as any);

    const result = await resolveEmailId(documentId);
    expect(result).toBe(emailId);
    expect(mockDb.query.documentUnits.findFirst).toHaveBeenCalledWith({
      where: expect.any(Function),
      columns: {
        unitId: true,
        emailId: true,
      },
    });
  });

  it('should return null when document not found', async () => {
    const documentId = '999';
    
    mockIsValidUuid.mockReturnValue(false);
    
    const mockDb = {
      query: {
        documentUnits: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDrizDb.mockResolvedValue(mockDb as any);

    const result = await resolveEmailId(documentId);
    expect(result).toBeNull();
  });

  it('should return null on database error', async () => {
    const documentId = '123';
    
    mockIsValidUuid.mockReturnValue(false);
    
    const mockDb = {
      query: {
        documentUnits: {
          findFirst: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDrizDb.mockResolvedValue(mockDb as any);

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await resolveEmailId(documentId);
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error resolving document ID to email ID:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});