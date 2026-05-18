/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockExtractParamsImpl = jest.fn();

jest.mock('@compliance-theater/nextjs/server/utils', () => {
  const original = jest.requireActual('@compliance-theater/nextjs/server/utils');
  return {
    ...original,
    extractParams: (...args: unknown[]) => mockExtractParamsImpl(...args),
  };
});

jest.mock('@compliance-theater/auth/lib/resources/case-file/index', () => {
  const original = jest.requireActual('@compliance-theater/auth/lib/resources/case-file/index');
  return {
    ...original,
    checkCaseFileAuthorization: jest.fn(),
  };
});

jest.mock('@compliance-theater/nextjs/server/unauthorized-service-response', () => ({
  unauthorizedServiceResponse: jest.fn(),
}));

jest.mock('@/lib/api/document-unit', () => ({
  DocumentUnitRepository: jest.fn().mockImplementation(() => ({
    SasKey: '?mock-sas-key',
  })),
}));

import { GET } from '../../../../../../app/api/email/[emailId]/attachments/route';
import { checkCaseFileAuthorization } from '@compliance-theater/auth/lib/resources/case-file/index';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';
import { drizDbWithInit } from '@compliance-theater/database/orm';

type MockDb = {
  select: jest.Mock;
};

const makeDbMock = (rows: unknown[]): MockDb => {
  const where = jest.fn().mockResolvedValue(rows);
  const innerJoin = jest.fn().mockReturnValue({ where });
  const from = jest.fn().mockReturnValue({ innerJoin });
  const select = jest.fn().mockReturnValue({ from });
  return { select };
};

describe('GET /api/email/[emailId]/attachments', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_HOSTNAME = 'https://example.test';
    mockExtractParamsImpl.mockReset();
    mockExtractParamsImpl.mockImplementation(async (args: { params: Promise<{ emailId: string }> }) => {
      return args.params;
    });
    (checkCaseFileAuthorization as jest.Mock).mockReset();
    (unauthorizedServiceResponse as jest.Mock).mockReset();
    (drizDbWithInit as jest.Mock).mockReset();
  });

  it('returns attachment list with generated hrefDocument and hrefApi when authorized', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    const db = makeDbMock([
      {
        unitId: 101,
        attachmentId: 44,
        emailId: 'email-123',
        documentType: 'attachment',
        fileName: 'evidence.pdf',
        filePath: 'https://blob.example/evidence.pdf',
      },
    ]);
    (drizDbWithInit as jest.Mock).mockResolvedValue(db);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ emailId: 'email-123' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        unitId: 101,
        attachmentId: 44,
        fileName: 'evidence.pdf',
        hrefDocument: 'https://blob.example/evidence.pdf?mock-sas-key',
        hrefApi: 'https://example.test/api/attachment/44',
      },
    ]);
  });

  it('returns authorization response when authorization fails with response', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({
      authorized: false,
      response: new Response('Forbidden', { status: 403 }),
    });

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ emailId: 'email-123' }),
    });

    expect(response.status).toBe(403);
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });

  it('returns unauthorizedServiceResponse when authorization fails without response', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({
      authorized: false,
      response: undefined,
    });
    (unauthorizedServiceResponse as jest.Mock).mockReturnValue(
      new Response('Unauthorized', { status: 401 }),
    );

    const request = {} as NextRequest;
    const response = await GET(request, {
      params: Promise.resolve({ emailId: 'email-123' }),
    });

    expect(response.status).toBe(401);
    expect(unauthorizedServiceResponse).toHaveBeenCalledWith({
      req: request,
      scopes: ['case-file:read'],
    });
    expect(drizDbWithInit).not.toHaveBeenCalled();
  });
});
