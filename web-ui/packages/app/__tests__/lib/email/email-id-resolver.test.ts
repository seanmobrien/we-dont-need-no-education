import { jest } from '@jest/globals';

jest.mock('@compliance-theater/typescript', () => {
  const origModule = jest.requireActual('@compliance-theater/typescript') as any;
  return {
    ...origModule,
    isValidUuid: jest.fn(),
  };
});

import { resolveEmailId } from '@/lib/email/email-id-resolver';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

import { drizDb, drizDbWithInit } from '@/lib/drizzle-db';
import { isValidUuid } from '@compliance-theater/typescript';
import { hideConsoleOutput } from '@/__tests__/test-utils';

const mockDrizDb = drizDbWithInit as jest.MockedFunction<typeof drizDbWithInit>;
const mockIsValidUuid = isValidUuid as jest.MockedFunction<typeof isValidUuid>;

describe('resolveEmailId', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
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
    const db = drizDb();
    (db.query.documentUnits.findFirst as jest.Mock).mockResolvedValue({
      unitId: 123,
      emailId: emailId,
    } as never);

    const result = await resolveEmailId(documentId);
    expect(result).toBe(emailId);
    expect(db.query.documentUnits.findFirst).toHaveBeenCalledWith({
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
          findFirst: jest.fn().mockResolvedValue(null as unknown as never),
        },
      },
    };

    mockDrizDb.mockResolvedValue(mockDb as any);

    const result = await resolveEmailId(documentId);
    expect(result).toBeNull();
  });

  it('should return null on database error', async () => {
    hideConsoleOutput().setup();
    const documentId = '123';

    mockIsValidUuid.mockReturnValue(false);

    const mockDb = {
      query: {
        documentUnits: {
          findFirst: jest
            .fn()
            .mockRejectedValue(new Error('Database error') as unknown as never),
        },
      },
    };

    mockDrizDb.mockResolvedValue(mockDb as any);

    jest.clearAllMocks();

    const result = await resolveEmailId(documentId);
    expect(result).toBeNull();
  });
});
