import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  KeyPointsDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';

const repository = new KeyPointsDetailsRepository();
const controller = new RepositoryCrudController(repository);

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) {
  return controller.listFromRepository(async (r) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);
    return r.innerQuery((q) =>
      q.list(
        (num, page, offset) =>
          db(
            (sql) => sql`SELECT * FROM "KeyPoints"               
             WHERE email_to_document_id(${emailId}) = document_id LIMIT ${num} OFFSET ${offset}`,
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(document_id)
            FROM "KeyPoints"  
            WHERE email_to_document_id(${emailId}) = document_id`,
          ),
        parsePaginationStats(new URL(req.url)),
      ),
    );
  });
}

export async function POST(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) {
  return controller.create(req, args);
}
