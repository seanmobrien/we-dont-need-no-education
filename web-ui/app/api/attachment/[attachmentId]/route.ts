import { RepositoryCrudController, EmailAttachmentRepository } from '@/lib/api';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) {
  const controller = new RepositoryCrudController(
    new EmailAttachmentRepository(),
  );
  return controller.get(req, args);
}

export async function PUT(
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) {
  const controller = new RepositoryCrudController(
    new EmailAttachmentRepository(),
  );
  return controller.update(req, args);
}

export async function DELETE(
  req: NextRequest,
  args: { params: Promise<{ attachmentId: number }> },
) {
  const controller = new RepositoryCrudController(
    new EmailAttachmentRepository(),
  );
  return controller.delete(req, args);
}
