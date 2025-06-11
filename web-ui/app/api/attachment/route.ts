import { NextRequest } from 'next/server';
import { DrizzleCrudRepositoryController, EmailAttachmentDrizzleRepository } from '@/lib/api';

const repository = new EmailAttachmentDrizzleRepository();
const controller = new DrizzleCrudRepositoryController(repository);

export async function GET(req: NextRequest) {
  return controller.list(req);
}

export async function POST(req: NextRequest) {
  return controller.create(req);
}
