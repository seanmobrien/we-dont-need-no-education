import {
  RepositoryCrudController,
  KeyPointsDetailsRepository,
} from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) {
  const controller = new RepositoryCrudController(
    new KeyPointsDetailsRepository(),
  );
  return controller.get(req, args);
}

export async function PUT(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) {
  const controller = new RepositoryCrudController(
    new KeyPointsDetailsRepository(),
  );
  return controller.update(req, args);
}

export async function DELETE(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) {
  const controller = new RepositoryCrudController(
    new KeyPointsDetailsRepository(),
  );
  return controller.delete(req, args);
}
