import { EmbeddingService } from '@/lib/ai/services/embedding';
import { createEmbeddingModel } from '@/lib/ai/aiModelFactory';
import { getEmbeddingDimensionsForSize } from '@/lib/api/document-unit/embeddings';
import { auth } from '@compliance-theater/auth/auth.node';
import { LoggedError } from '@compliance-theater/logger';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server';
import { wrapRouteRequest } from '@compliance-theater/nextjs/server/utils';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type QueryVectorSize = 'small' | 'large';

const queryVectorConfig = {
  small: {
    chunkSize: 512,
    vectorSize: () => getEmbeddingDimensionsForSize('small'),
  },
  large: {
    chunkSize: 1000,
    vectorSize: () => getEmbeddingDimensionsForSize('large'),
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
    const session = await auth();
    if (
      !session ||
      !session.user ||
      process.env.NEXT_PHASE === 'phase-production-build'
    ) {
      return unauthorizedServiceResponse({ req, scopes: ['mcp-tools:read'] });
    }

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
      expectedDimensions: vectorSize,
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
      { error: loggedError.message },
      { status: 500 }
    );
  }
});
