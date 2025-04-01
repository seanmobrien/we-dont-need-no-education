import { NextRequest } from 'next/server';
import { RepositoryCrudController, DocumentUnitRepository } from '@/lib/api';
import { isTruthy } from '@/lib/react-util';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const generateDownloadKey = isTruthy(searchParams.get('downloadable'));
  const alwaysReturnContent = isTruthy(searchParams.get('content'));
  const pendingEmbed = isTruthy(searchParams.get('pending'));

  const controller = new RepositoryCrudController(
    new DocumentUnitRepository({
      generateDownloadKey,
      alwaysReturnContent,
      pendingEmbed,
    }),
  );
  return controller.list(req);
}

export async function POST(
  req: NextRequest,
  data: { params: Promise<{ unitId: number }> },
) {
  const controller = new RepositoryCrudController(new DocumentUnitRepository());
  return controller.create(req, data);
}
