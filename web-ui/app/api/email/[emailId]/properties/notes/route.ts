import { NextRequest } from 'next/server';
import { RepositoryCrudController } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import { NotesRepository } from '@/lib/api/email/properties/notes/notes-repository';

const repository = new NotesRepository();
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
            (
              sql,
            ) => sql`SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id
            FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id    
            WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9 AND   
            email_to_document_id(${emailId}) = document_id LIMIT ${num} OFFSET ${offset} 
            `,
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(document_id)
             FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id    
            WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9 AND   
            email_to_document_id(${emailId}) = document_id`,
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
