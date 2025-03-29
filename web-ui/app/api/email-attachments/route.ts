import { NextRequest } from 'next/server';
import { RepositoryCrudController, EmailAttachmentRepository } from '@/lib/api';

const repository = new EmailAttachmentRepository();
const controller = new RepositoryCrudController(repository);

export async function GET(req: NextRequest) {
  return controller.list(req);
}

export async function POST(
  req: NextRequest,
  data: { params: Promise<{ attachmentId: number }> },
) {
  return controller.create(req, data);
}
