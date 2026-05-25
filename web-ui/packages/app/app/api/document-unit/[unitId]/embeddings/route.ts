import {
  wrapRouteRequest,
  extractParams,
} from '@compliance-theater/nextjs/server/utils';
import { NextRequest, NextResponse } from 'next/server';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@compliance-theater/auth/lib/resources/case-file/index';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server';
import {
  deleteDocumentEmbeddings,
  getEmbeddingDimensionsForSize,
  getEmbeddingModelNameForSize,
  isEmbeddingSize,
  listDocumentEmbeddings,
  regenerateDocumentEmbeddings,
} from '@/lib/api/document-unit/embeddings';

export const dynamic = 'force-dynamic';

const parseUnitId = (unitId: number | string): number | null => {
  const parsed = Number(unitId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseSize = (req: NextRequest) => {
  const value = req.nextUrl.searchParams.get('size') ?? 'large';
  if (!isEmbeddingSize(value)) {
    return null;
  }
  return value;
};

export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    if (parsedUnitId == null) {
      return NextResponse.json({ error: 'Invalid unitId parameter.' }, { status: 400 });
    }

    const size = parseSize(req);
    if (size == null) {
      return NextResponse.json(
        { error: 'Invalid size query parameter. Allowed values: large, small.' },
        { status: 400 },
      );
    }

    const authCheck = await checkCaseFileAuthorization(req, parsedUnitId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:read'] })
      );
    }

    const embeddingModel = getEmbeddingModelNameForSize(size);
    const dimensions = getEmbeddingDimensionsForSize(size);
    const embeddings = await listDocumentEmbeddings(parsedUnitId, embeddingModel);

    return NextResponse.json({
      unitId: parsedUnitId,
      size,
      dimensions,
      embeddingModel,
      embeddings,
    });
  },
);

export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    if (parsedUnitId == null) {
      return NextResponse.json({ error: 'Invalid unitId parameter.' }, { status: 400 });
    }

    const size = parseSize(req);
    if (size == null) {
      return NextResponse.json(
        { error: 'Invalid size query parameter. Allowed values: large, small.' },
        { status: 400 },
      );
    }

    const authCheck = await checkCaseFileAuthorization(req, parsedUnitId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:write'] })
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      chunkSize?: unknown;
    };
    const parsedChunkSize =
      typeof body?.chunkSize === 'number'
        ? body.chunkSize
        : typeof body?.chunkSize === 'string'
          ? Number(body.chunkSize)
          : undefined;
    if (
      typeof parsedChunkSize !== 'undefined' &&
      (!Number.isInteger(parsedChunkSize) || parsedChunkSize <= 0)
    ) {
      return NextResponse.json(
        { error: 'chunkSize must be a positive integer when provided.' },
        { status: 400 },
      );
    }

    const regenerated = await regenerateDocumentEmbeddings({
      unitId: parsedUnitId,
      size,
      chunkSize: parsedChunkSize,
    });

    if (regenerated == null) {
      return NextResponse.json(
        { error: 'Document unit not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      unitId: regenerated.unitId,
      size,
      dimensions: getEmbeddingDimensionsForSize(size),
      embeddingModel: regenerated.embeddingModel,
      embeddings: regenerated.embeddings,
    });
  },
);

export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string }> },
  ) => {
    const { unitId } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    if (parsedUnitId == null) {
      return NextResponse.json({ error: 'Invalid unitId parameter.' }, { status: 400 });
    }

    const size = parseSize(req);
    if (size == null) {
      return NextResponse.json(
        { error: 'Invalid size query parameter. Allowed values: large, small.' },
        { status: 400 },
      );
    }

    const authCheck = await checkCaseFileAuthorization(req, parsedUnitId, {
      requiredScope: CaseFileScope.WRITE,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:write'] })
      );
    }

    const embeddingModel = getEmbeddingModelNameForSize(size);
    const deleted = await deleteDocumentEmbeddings(parsedUnitId, embeddingModel);

    return NextResponse.json({
      unitId: parsedUnitId,
      size,
      dimensions: getEmbeddingDimensionsForSize(size),
      embeddingModel,
      deleted,
    });
  },
);
