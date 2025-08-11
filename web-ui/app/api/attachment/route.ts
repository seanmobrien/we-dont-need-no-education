export const dynamic = 'force-dynamic'; // Never statically optimize

import { NextRequest } from 'next/server';
import {
  DrizzleCrudRepositoryController,
  EmailAttachmentDrizzleRepository,
} from '@/lib/api';



export async function GET(req: NextRequest) {
  const repository = new EmailAttachmentDrizzleRepository();
  const controller = new DrizzleCrudRepositoryController(repository);
  return controller.list(req);
}

export async function POST(req: NextRequest) {
  const repository = new EmailAttachmentDrizzleRepository();
  const controller = new DrizzleCrudRepositoryController(repository);
  return controller.create(req);
}
