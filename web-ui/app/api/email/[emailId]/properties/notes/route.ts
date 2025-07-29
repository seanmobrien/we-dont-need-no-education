import { NextRequest } from 'next/server';
import { RepositoryCrudController } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import { NotesRepository } from '@/lib/api/email/properties/notes/notes-repository';
import {
  buildOrderBy,
  buildPagination,
  DefaultEmailColumnMap,
} from '@/lib/components/mui/data-grid/server';
import {
  buildAttachmentOrEmailFilter,
  buildQueryFilter,
} from '@/lib/components/mui/data-grid/buildQueryFilter';

const repository = new NotesRepository();
const controller = new RepositoryCrudController(repository);
const stableColumnMap = {
  ...DefaultEmailColumnMap,
} as const;
export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) {
  return controller.listFromRepository(async (r) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);
    return r.innerQuery((q) =>
      q.list(
        () =>
          db(
            (
              sql,
            ) => sql`SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id
            FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id    
            JOIN document_units du ON du.unit_id = ep.document_id
            WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9    
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: true,
              document_id_table: 'ep',
              document_id_column: 'document_id',
              email_id_column: 'email_id',
              email_id_table: 'du',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true, columnMap: stableColumnMap })} 
            ${buildOrderBy({ sql, source: req, columnMap: stableColumnMap })}
            ${buildPagination({ req, sql })}
            `,
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              transform: r.mapRecordToObject as any,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        () =>
          db(
            (sql) => sql`SELECT COUNT(document_id)
             FROM document_property ep
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id    
            JOIN document_units du ON du.unit_id = ep.document_id
            WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9    
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: true,
              document_id_table: 'ep',
              document_id_column: 'document_id',
              email_id_column: 'email_id',
              email_id_table: 'du',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true })} `,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        parsePaginationStats(req),
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
