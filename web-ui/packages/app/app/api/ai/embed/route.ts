import { EmbeddingService } from '@/lib/ai/services/embedding';
import { createEmbeddingModel } from '@/lib/ai/aiModelFactory';
import { env } from '@compliance-theater/env';
import { LoggedError } from '@compliance-theater/logger';
import { wrapRouteRequest } from '@compliance-theater/nextjs/server/utils';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type QueryVectorSize = 'small' | 'large';

const queryVectorConfig = {
  small: {
    chunkSize: 512,
    vectorSize: () => Number(env('AZURE_AISEARCH_VECTOR_SIZE_SMALL')),
  },
  large: {
    chunkSize: 1000,
    vectorSize: () => Number(env('AZURE_AISEARCH_VECTOR_SIZE_LARGE')),
  },
} as const satisfies Record<
  QueryVectorSize,
  {
    chunkSize: number;
    vectorSize: () => number;
  }
>;

const isQueryVectorSize = (value: unknown): value is QueryVectorSize =>
  value === 'small' || value === 'large';

const readRequestBody = async (
  req: NextRequest
): Promise<{ text?: unknown; size?: unknown }> => {
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};

export const POST = wrapRouteRequest(async (req: NextRequest) => {
  try {
    const { text, size: requestedSize } = await readRequestBody(req);
    const size = requestedSize ?? 'large';

    if (!isQueryVectorSize(size)) {
      return NextResponse.json(
        { error: 'size must be one of: small, large.' },
        { status: 400 }
      );
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const config = queryVectorConfig[size];
    if (text.length >= config.chunkSize) {
      return NextResponse.json(
        {
          error: `text length must be less than ${config.chunkSize} characters for ${size} query vectors.`,
          data: {
            size,
            chunkSize: config.chunkSize,
            textLength: text.length,
          },
        },
        { status: 400 }
      );
    }

    const vectorSize = config.vectorSize();
    const embeddingModel = await createEmbeddingModel();
    const service = new EmbeddingService(embeddingModel, {
      providerOptions: {
        openai: {
          dimensions: vectorSize,
        },
      },
    }).setCacheEmbeddings(false);
    const vectors = await service.embed(text);

    return NextResponse.json({
      vectors,
      size,
      vectorSize,
      model: embeddingModel.modelId,
    });
  } catch (error) {
    const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'api.ai.embed.POST',
    });
    return NextResponse.json(
      { error: loggedError.message, data: { error } },
      { status: 500 }
    );
  }
});
