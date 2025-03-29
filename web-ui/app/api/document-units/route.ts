import { NextRequest } from 'next/server';
import { RepositoryCrudController, DocumentUnitRepository } from '@/lib/api';

const repository = new DocumentUnitRepository();
const controller = new RepositoryCrudController(repository);

export async function GET(req: NextRequest) {
  return controller.list(req);
}

export async function POST(
  req: NextRequest,
  data: { params: Promise<{ unitId: number }> },
) {
  return controller.create(req, data);
}
