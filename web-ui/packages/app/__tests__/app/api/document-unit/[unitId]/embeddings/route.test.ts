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
  listDocumentEmbeddings: jest.fn(),
  regenerateDocumentEmbeddings: jest.fn(),
  deleteDocumentEmbeddings: jest.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/document-unit/[unitId]/embeddings/route';
import { checkCaseFileAuthorization } from '@compliance-theater/auth/lib/resources/case-file/index';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server';
import {
  deleteDocumentEmbeddings,
  getEmbeddingDimensionsForSize,
  getEmbeddingModelNameForSize,
  listDocumentEmbeddings,
  regenerateDocumentEmbeddings,
} from '@/lib/api/document-unit/embeddings';

describe('Document embeddings route', () => {
  beforeEach(() => {
    mockExtractParamsImpl.mockReset();
    mockExtractParamsImpl.mockImplementation(async (args: { params: Promise<{ unitId: string }> }) => {
      return args.params;
    });

    (checkCaseFileAuthorization as jest.Mock).mockReset();
    (unauthorizedServiceResponse as jest.Mock).mockReset();
    (listDocumentEmbeddings as jest.Mock).mockReset();
    (regenerateDocumentEmbeddings as jest.Mock).mockReset();
    (deleteDocumentEmbeddings as jest.Mock).mockReset();
    (getEmbeddingDimensionsForSize as jest.Mock).mockClear();
    (getEmbeddingModelNameForSize as jest.Mock).mockClear();
  });

  it('GET uses default large size and returns embeddings when authorized', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (listDocumentEmbeddings as jest.Mock).mockResolvedValue([
      {
        documentId: 42,
        embeddingModel: 'model-large',
        index: 0,
        embedding: [0.1, 0.2],
        createdOn: '2026-01-01T00:00:00Z',
      },
    ]);

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings');
    const response = await GET(req, { params: Promise.resolve({ unitId: '42' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(listDocumentEmbeddings).toHaveBeenCalledWith(42, 'model-large');
    expect(json).toMatchObject({
      unitId: 42,
      size: 'large',
      dimensions: 3072,
      embeddingModel: 'model-large',
    });
  });

  it('GET returns 400 for invalid size', async () => {
    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=invalid');
    const response = await GET(req, { params: Promise.resolve({ unitId: '42' }) });

    expect(response.status).toBe(400);
    expect(checkCaseFileAuthorization).not.toHaveBeenCalled();
  });

  it('PUT returns unauthorized fallback when auth fails without response', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({
      authorized: false,
      response: undefined,
    });
    (unauthorizedServiceResponse as jest.Mock).mockReturnValue(
      new Response('Unauthorized', { status: 401 }),
    );

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=small', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(req, { params: Promise.resolve({ unitId: '42' }) });

    expect(response.status).toBe(401);
    expect(unauthorizedServiceResponse).toHaveBeenCalledWith({
      req,
      scopes: ['case-file:write'],
    });
  });

  it('PUT validates chunkSize as positive integer', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=small', {
      method: 'PUT',
      body: JSON.stringify({ chunkSize: -1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(req, { params: Promise.resolve({ unitId: '42' }) });

    expect(response.status).toBe(400);
    expect(regenerateDocumentEmbeddings).not.toHaveBeenCalled();
  });

  it('PUT returns 404 when regenerate target document does not exist', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (regenerateDocumentEmbeddings as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=small', {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(req, { params: Promise.resolve({ unitId: '42' }) });

    expect(response.status).toBe(404);
  });

  it('PUT returns the resulting embeddings payload for the document', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (regenerateDocumentEmbeddings as jest.Mock).mockResolvedValue({
      unitId: 42,
      size: 'small',
      embeddingModel: 'model-small',
      chunkSize: 512,
      embeddings: [
        {
          documentId: 42,
          embeddingModel: 'model-small',
          index: 1,
          embedding: [0.1, 0.2],
          createdOn: '2026-01-01T00:00:00Z',
        },
      ],
    });

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=small', {
      method: 'PUT',
      body: JSON.stringify({ chunkSize: 512 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await PUT(req, { params: Promise.resolve({ unitId: '42' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(regenerateDocumentEmbeddings).toHaveBeenCalledWith({
      unitId: 42,
      size: 'small',
      chunkSize: 512,
    });
    expect(json).toEqual({
      unitId: 42,
      size: 'small',
      dimensions: 1536,
      embeddingModel: 'model-small',
      embeddings: [
        {
          documentId: 42,
          embeddingModel: 'model-small',
          index: 1,
          embedding: [0.1, 0.2],
          createdOn: '2026-01-01T00:00:00Z',
        },
      ],
    });
    expect(json).not.toHaveProperty('chunkSize');
  });

  it('DELETE removes embeddings by size when authorized', async () => {
    (checkCaseFileAuthorization as jest.Mock).mockResolvedValue({ authorized: true });
    (deleteDocumentEmbeddings as jest.Mock).mockResolvedValue(3);

    const req = new NextRequest('http://localhost/api/document-unit/42/embeddings?size=small', {
      method: 'DELETE',
    });
    const response = await DELETE(req, { params: Promise.resolve({ unitId: '42' }) });

    expect(response.status).toBe(200);
    expect(deleteDocumentEmbeddings).toHaveBeenCalledWith(42, 'model-small');
    expect(await response.json()).toMatchObject({
      unitId: 42,
      size: 'small',
      dimensions: 1536,
      deleted: 3,
    });
  });
});
