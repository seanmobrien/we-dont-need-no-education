import {
  getCaseFileDocument,
  toolCallbackResultSchemaFactory,
} from '@/lib/ai/tools';
import { RepositoryCrudController, DocumentUnitRepository } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { NextRequest, NextResponse } from 'next/server';
import { DocumentSchema } from '@/lib/ai/tools';
import { isError } from '@/lib/react-util';
export async function GET(
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) {
  try {
    const { unitId } = await extractParams(args);
    const document = await getCaseFileDocument({ caseFileId: unitId });

    const valid = toolCallbackResultSchemaFactory(
      DocumentSchema,
    ).result.safeParse(document.structuredContent.result);
    if (!valid.success) {
      console.log(valid.error);
      throw valid.error;
    }
    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json(
      { error: isError(error) ? error.message : error, data: error },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) {
  const controller = new RepositoryCrudController(new DocumentUnitRepository());
  return controller.update(req, args);
}

export async function DELETE(
  req: NextRequest,
  args: { params: Promise<{ unitId: number }> },
) {
  const controller = new RepositoryCrudController(new DocumentUnitRepository());
  return controller.delete(req, args);
}
