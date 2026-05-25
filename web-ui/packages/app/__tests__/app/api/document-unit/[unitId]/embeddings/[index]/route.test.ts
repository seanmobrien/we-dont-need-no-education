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

jest.mock('@compliance-theater/nextjs/server', () => {
  const original = jest.requireActual('@compliance-theater/nextjs/server');
  return {
    ...original,
    unauthorizedServiceResponse: jest.fn(),
  };
});

jest.mock('@/lib/api/document-unit/embeddings', () => ({
  isEmbeddingSize: (value: unknown) => value === 'large' || value === 'small',
  getEmbeddingDimensionsForSize: jest.fn((size: string) =>
    size === 'small' ? 1536 : 3072,
  ),
  getEmbeddingModelNameForSize: jest.fn((size: string) =>
    size === 'small' ? 'model-small' : 'model-large',
  ),
  getDocumentEmbeddingByIndex: jest.fn(),
  getDocumentUnitContent: jest.fn(),
  upsertDocumentEmbeddingByIndex: jest.fn(),
  deleteDocumentEmbeddingByIndex: jest.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/document-unit/[unitId]/embeddings/[index]/route';
import { checkCaseFileAuthorization } from '@compliance-theater/auth/lib/resources/case-file/index';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server';
import {
  deleteDocumentEmbeddingByIndex,
  getDocumentEmbeddingByIndex,
  getDocumentUnitContent,
  getEmbeddingDimensionsForSize,
  upsertDocumentEmbeddingByIndex,
} from '@/lib/api/document-unit/embeddings';

describe('Document embedding index route', () => {
  beforeEach(() => {
    mockExtractParamsImpl.mockReset();
    mockExtractParamsImpl.mockImplementation(
      async (args: { params: Promise<{ unitId: string; index: string }> }) => {
        return args.params;
      },
    );

    (checkCaseFileAuthorization as jest.Mock).mockReset();
    (unauthorizedServiceResponse as jest.Mock).mockReset();
    (getDocumentEmbeddingByIndex as jest.Mock).mockReset();
    (getDocumentUnitContent as jest.Mock).mockReset();
    (upsertDocumentEmbeddingByIndex as jest.Mock).mockReset();
    (deleteDocumentEmbeddingByIndex as jest.Mock).mockReset();
    (getEmbeddingDimensionsForSize as jest.Mock).mockClear();
  });

  it('GET returns indexed embedding when authorized', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (getDocumentEmbeddingByIndex as jest.Mock).mockResolvedValue({
      documentId: 42,
      embeddingModel: 'model-large',
      index: 3,
      embedding: [0.5, 0.6],
      createdOn: '2026-01-01T00:00:00Z',
    });

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3');
    const response = await GET(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(getDocumentEmbeddingByIndex).toHaveBeenCalledWith(
      42,
      'model-large',
      3,
    );
    expect(json).toMatchObject({
      unitId: 42,
      size: 'large',
      dimensions: 3072,
      embeddingModel: 'model-large',
    });
  });

  it('GET returns 404 when embedding index is missing', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (getDocumentEmbeddingByIndex as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3');
    const response = await GET(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(404);
  });

  it('GET returns 400 for invalid size values', async () => {
    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3?size=bad');
    const response = await GET(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(400);
    expect(checkCaseFileAuthorization).not.toHaveBeenCalled();
  });

  it('PUT requires non-empty numeric embedding vector payload', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (getDocumentUnitContent as jest.Mock).mockResolvedValue('document body');

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3', {
      method: 'PUT',
      body: JSON.stringify({ embedding: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(400);
    expect(upsertDocumentEmbeddingByIndex).not.toHaveBeenCalled();
  });

  it('PUT upserts indexed embedding when authorized and payload is valid', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (getDocumentUnitContent as jest.Mock).mockResolvedValue('document body');
    (upsertDocumentEmbeddingByIndex as jest.Mock).mockResolvedValue({
      documentId: 42,
      embeddingModel: 'model-small',
      index: 3,
      embedding: [0.1, 0.2],
      createdOn: '2026-01-01T00:00:00Z',
    });

    const req = new NextRequest(
      'http://localhost/api/document-unit/42/embeddings/3?size=small',
      {
        method: 'PUT',
        body: JSON.stringify({ embedding: [0.1, 0.2] }),
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const response = await PUT(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(upsertDocumentEmbeddingByIndex).toHaveBeenCalledWith({
      unitId: 42,
      embeddingModel: 'model-small',
      index: 3,
      embedding: [0.1, 0.2],
    });
    expect(json).toMatchObject({
      unitId: 42,
      size: 'small',
      dimensions: 1536,
      embeddingModel: 'model-small',
    });
  });

  it('DELETE removes indexed embedding and returns dimensions metadata', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (deleteDocumentEmbeddingByIndex as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest(
      'http://localhost/api/document-unit/42/embeddings/3?size=small',
      {
        method: 'DELETE',
      },
    );
    const response = await DELETE(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      unitId: 42,
      size: 'small',
      dimensions: 1536,
      embeddingModel: 'model-small',
      index: 3,
      deleted: 1,
    });
  });

  it('DELETE returns unauthorized fallback when auth fails without response', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({
      authorized: false,
      response: undefined,
    });
    (unauthorizedServiceResponse as jest.Mock).mockReturnValue(
      new Response('Unauthorized', { status: 401 }),
    );

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3', {
      method: 'DELETE',
    });
    const response = await DELETE(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(401);
    expect(unauthorizedServiceResponse).toHaveBeenCalledWith({
      req,
      scopes: ['case-file:write'],
    });
  });

  it('DELETE returns 404 when target embedding row does not exist', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (deleteDocumentEmbeddingByIndex as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings/3', {
      method: 'DELETE',
    });
    const response = await DELETE(req, {
      params: Promise.resolve({ unitId: '42', index: '3' }),
    });

    expect(response.status).toBe(404);
  });
});
