/**
 * @jest-environment node
 */

const embedMock = jest.fn();
const setCacheEmbeddingsMock = jest.fn();

jest.mock('../../../../../lib/ai/aiModelFactory', () => ({
  createEmbeddingModel: jest.fn(async () => ({
    modelId: 'text-embedding-3-large',
  })),
}));

jest.mock('../../../../../lib/ai/services/embedding', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => ({
    setCacheEmbeddings: setCacheEmbeddingsMock.mockReturnThis(),
    embed: embedMock,
  })),
}));

jest.unmock('@compliance-theater/nextjs/server/utils');

import { NextRequest } from 'next/server';
import { createEmbeddingModel } from '../../../../../lib/ai/aiModelFactory';
import { EmbeddingService } from '../../../../../lib/ai/services/embedding';
import { POST } from '../../../../../app/api/ai/embed/route';

describe('/api/ai/embed route', () => {
  beforeEach(() => {
    process.env.AZURE_AISEARCH_VECTOR_SIZE_SMALL = '1536';
    process.env.AZURE_AISEARCH_VECTOR_SIZE_LARGE = '3072';

    embedMock.mockResolvedValue([1, 2, 3]);
    setCacheEmbeddingsMock.mockClear();
  });

  it('encodes text with large vectors by default', async () => {
    const req = new NextRequest('http://localhost/api/ai/embed', {
      method: 'POST',
      body: JSON.stringify({ text: 'policy search query' }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createEmbeddingModel).toHaveBeenCalled();
    expect(EmbeddingService).toHaveBeenCalledWith(
      { modelId: 'text-embedding-3-large' },
      {
        expectedDimensions: 3072,
      }
    );
    expect(setCacheEmbeddingsMock).toHaveBeenCalledWith(false);
    expect(embedMock).toHaveBeenCalledWith('policy search query');
    expect(body).toEqual({
      vectors: [1, 2, 3],
      size: 'large',
      vectorSize: 3072,
      model: 'text-embedding-3-large',
    });
  });

  it('rejects text at or above the selected chunk size', async () => {
    const req = new NextRequest('http://localhost/api/ai/embed', {
      method: 'POST',
      body: JSON.stringify({ text: 'x'.repeat(512), size: 'small' }),
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('less than 512');
    expect(embedMock).not.toHaveBeenCalled();
  });

  it('rejects invalid size values', async () => {
    const req = new NextRequest('http://localhost/api/ai/embed', {
      method: 'POST',
      body: JSON.stringify({ text: 'query', size: 'medium' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });
});
