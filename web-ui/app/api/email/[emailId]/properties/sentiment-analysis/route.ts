import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  SentimentAnalysisDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';

const repository = new SentimentAnalysisDetailsRepository();
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
            ) => sql`SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            esad.sentiment_score, esad.detected_hostility, esad.flagged_phrases, esad.detected_on
            FROM document_property ep 
             JOIN email_sentiment_analysis_details esad ON esad.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE document_property_email(ep.property_id) = ${emailId} AND ept.email_property_category_id=8 
             ${buildOrderBy({ sql, source: req })}
             LIMIT ${num} OFFSET ${offset}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM document_property ep 
             JOIN email_sentiment_analysis_details esad ON esad.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE document_property_email(ep.property_id) = ${emailId} AND ept.email_property_category_id=8`,
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
