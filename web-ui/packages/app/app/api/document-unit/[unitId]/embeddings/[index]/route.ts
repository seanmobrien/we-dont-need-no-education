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
  deleteDocumentEmbeddingByIndex,
  getDocumentEmbeddingByIndex,
  getDocumentUnitContent,
  getEmbeddingDimensionsForSize,
  getEmbeddingModelNameForSize,
  isEmbeddingSize,
  upsertDocumentEmbeddingByIndex,
} from '@/lib/api/document-unit/embeddings';

export const dynamic = 'force-dynamic';

const parsePositiveInteger = (value: number | string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const parseUnitId = (value: number | string): number | null => {
  const parsed = Number(value);
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

const parseEmbeddingVector = (value: unknown): number[] | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const vector = value.map((entry) => Number(entry));
  return vector.every((entry) => Number.isFinite(entry)) ? vector : null;
};

export const GET = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string; index: number | string }> },
  ) => {
    const { unitId, index } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    const parsedIndex = parsePositiveInteger(index);
    if (parsedUnitId == null || parsedIndex == null) {
      return NextResponse.json(
        { error: 'Invalid unitId or index parameter.' },
        { status: 400 },
      );
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
    const row = await getDocumentEmbeddingByIndex(
      parsedUnitId,
      embeddingModel,
      parsedIndex,
    );

    if (row == null) {
      return NextResponse.json({ error: 'Embedding not found.' }, { status: 404 });
    }

    return NextResponse.json({
      unitId: parsedUnitId,
      size,
      dimensions: getEmbeddingDimensionsForSize(size),
      embeddingModel,
      embedding: row,
    });
  },
);

export const PUT = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string; index: number | string }> },
  ) => {
    const { unitId, index } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    const parsedIndex = parsePositiveInteger(index);
    if (parsedUnitId == null || parsedIndex == null) {
      return NextResponse.json(
        { error: 'Invalid unitId or index parameter.' },
        { status: 400 },
      );
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

    const documentContent = await getDocumentUnitContent(parsedUnitId);
    if (documentContent == null) {
      return NextResponse.json(
        { error: 'Document unit not found.' },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { embedding?: unknown };
    const embeddingVector = parseEmbeddingVector(body.embedding);
    if (embeddingVector == null) {
      return NextResponse.json(
        { error: 'PUT requires a non-empty numeric embedding array.' },
        { status: 400 },
      );
    }

    const embeddingModel = getEmbeddingModelNameForSize(size);
    const updated = await upsertDocumentEmbeddingByIndex({
      unitId: parsedUnitId,
      embeddingModel,
      index: parsedIndex,
      embedding: embeddingVector,
    });

    return NextResponse.json({
      unitId: parsedUnitId,
      size,
      dimensions: getEmbeddingDimensionsForSize(size),
      embeddingModel,
      embedding: updated,
    });
  },
);

export const DELETE = wrapRouteRequest(
  async (
    req: NextRequest,
    args: { params: Promise<{ unitId: number | string; index: number | string }> },
  ) => {
    const { unitId, index } = await extractParams(args);
    const parsedUnitId = parseUnitId(unitId);
    const parsedIndex = parsePositiveInteger(index);
    if (parsedUnitId == null || parsedIndex == null) {
      return NextResponse.json(
        { error: 'Invalid unitId or index parameter.' },
        { status: 400 },
      );
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
    const deleted = await deleteDocumentEmbeddingByIndex(
      parsedUnitId,
      embeddingModel,
      parsedIndex,
    );

    if (deleted === 0) {
      return NextResponse.json({ error: 'Embedding not found.' }, { status: 404 });
    }

    return NextResponse.json({
      unitId: parsedUnitId,
      size,
      dimensions: getEmbeddingDimensionsForSize(size),
      embeddingModel,
      index: parsedIndex,
      deleted,
    });
  },
);
