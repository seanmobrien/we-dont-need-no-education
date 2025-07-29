import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  KeyPointsDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import {
  buildOrderBy,
  DefaultEmailColumnMap,
} from '@/lib/components/mui/data-grid/server';
import {
  buildAttachmentOrEmailFilter,
  buildQueryFilter,
} from '@/lib/components/mui/data-grid/buildQueryFilter';

const keyPointColumnMap = {
  ...DefaultEmailColumnMap,
  propertyId: 'property_id',
  emailId: 'email_id',
  documentId: 'document_id',
  relevance: 'relevance',
  compliance: 'compliance',
  severityRanking: 'severity_ranking',
} as const;

const repository = new KeyPointsDetailsRepository();
const controller = new RepositoryCrudController(repository);

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; attachments: boolean }> },
) {
  return controller.listFromRepository(async (r) => {
    const { emailId } = await extractParams<{
      emailId: string;
    }>(args);

    return r.innerQuery((q) =>
      q.list(
        (num, page, offset) =>
          db(
            (sql) => sql`SELECT * FROM "KeyPoints"
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: false,
              document_id_table: '',
              email_id_column: 'email_id',
              document_id_column: 'document_id',
              email_id_table: '',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true, columnMap: keyPointColumnMap })} 
            ${buildOrderBy({ sql, source: req, columnMap: keyPointColumnMap })} 
             LIMIT ${num} OFFSET ${offset}`,
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              transform: r.mapRecordToObject as any,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        () =>
          db(
            (sql) => sql`SELECT COUNT(*)
            FROM "KeyPoints"
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: false,
              document_id_table: '',
              email_id_column: 'email_id',
              document_id_column: 'document_id',
              email_id_table: '',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true, columnMap: keyPointColumnMap })} 
            `,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
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
