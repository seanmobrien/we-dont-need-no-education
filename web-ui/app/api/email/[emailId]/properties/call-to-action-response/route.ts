import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  CallToActionResponseDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import {
  parsePaginationStats,
} from '@/data-models';
import { db } from '@/lib/neondb';
import {
  buildOrderBy,
  DefaultEmailColumnMap,
} from '@/lib/components/mui/data-grid/server';
import {
  buildAttachmentOrEmailFilter,
  buildQueryFilter,
} from '@/lib/components/mui/data-grid/buildQueryFilter';

const repository = new CallToActionResponseDetailsRepository();
const controller = new RepositoryCrudController(repository);
const columnMap = {
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
        (num, page, offset) =>
          db(
            (sql) => sql`SELECT ep.*, ctar.response_timestamp,
            ctar.severity, ctar.inferred, ctar.sentiment, ctar.sentiment_reasons, ctar.severity_reasons, 
            (SELECT AVG(car.compliance_chapter_13) 
              FROM call_to_action_details_call_to_action_response car 
              WHERE car.call_to_action_response_id=ep.property_id
            ) AS compliance_average_chapter_13,
            (SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons FROM (
              SELECT UNNEST(car.compliance_chapter_13_reasons) AS reasons_raw_chapter_13
              FROM call_to_action_details_call_to_action_response car
              WHERE car.call_to_action_response_id=ep.property_id
            ) sub) AS compliance_chapter_13_reasons
            FROM document_property ep 
             JOIN call_to_action_response_details ctar ON ctar.property_id = ep.property_id 
             JOIN document_units du ON du.unit_id = ep.document_id
             WHERE ep.document_property_type_id=5 
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: true,
              email_id_table: 'du',
              email_id_column: 'email_id',
              document_id_table: 'ep',
              document_id_column: 'document_id',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true, columnMap })} 
            ${buildOrderBy({ sql, source: req, columnMap })}             
             LIMIT ${num} OFFSET ${offset}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { transform: r.mapRecordToObject as any },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM document_property ep 
             JOIN call_to_action_response_details ctar ON ctar.property_id = ep.property_id 
             JOIN document_units du ON du.unit_id = ep.document_id
             WHERE ep.document_property_type_id=5 
            ${buildAttachmentOrEmailFilter({
              email_id: emailId,
              sql,
              attachments: req,
              append: true,
              email_id_table: 'du',
              email_id_column: 'email_id',
              document_id_table: 'ep',
              document_id_column: 'document_id',
            })} 
            ${buildQueryFilter({ sql, source: req, append: true, columnMap })}`,
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
