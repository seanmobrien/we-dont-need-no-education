import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  CallToActionDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { CallToActionDetails, parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import {
  buildOrderBy,
  DefaultEmailColumnMap,
} from '@/lib/components/mui/data-grid/server';
import { buildQueryFilter } from '@/lib/components/mui/data-grid/buildQueryFilter';

const repository = new CallToActionDetailsRepository();
const controller = new RepositoryCrudController(repository);
const columnMap = {
  ...DefaultEmailColumnMap,
} as const;
export async function GET(req: NextRequest) {
  return controller.listFromRepository(async (r) => {
    const response_id = req.nextUrl.searchParams.get('response_id');
    const additionalFilters = response_id
      ? { responsive_actions: { operator: 'in', value: response_id } }
      : undefined;
    return r.innerQuery((q) =>
      q.list(
        (num, page, offset) =>
          db<CallToActionDetails, Record<string, unknown>>(
            (
              sql,
            ) => sql`SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id,
            cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage, 
            cta.compliance_rating, cta.inferred, cta.compliance_date_enforceable, cta.reasonable_request, 
            cta.reasonable_reasons, cta.sentiment, cta.sentiment_reasons, cta.compliance_rating_reasons, 
            cta.severity, cta.severity_reason, cta.title_ix_applicable, cta.title_ix_applicable_reasons, 
            cta.closure_actions,
            (SELECT array_agg(call_to_action_response_id) FROM call_to_action_details_call_to_action_response WHERE call_to_action_id=cta.property_id) AS responsive_actions,
            (SELECT AVG(car.compliance_chapter_13) 
              FROM call_to_action_details_call_to_action_response car 
              WHERE car.call_to_action_id=cta.property_id
            ) AS compliance_average_chapter_13,
            (SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons FROM (
              SELECT UNNEST(car.compliance_chapter_13_reasons) AS reasons_raw_chapter_13
              FROM call_to_action_details_call_to_action_response car
              WHERE car.call_to_action_id=cta.property_id
            ) sub) AS compliance_chapter_13_reasons
            FROM document_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             JOIN document_units du ON du.unit_id = ep.document_id
             WHERE ep.document_property_type_id=4 
                  ${buildQueryFilter({ sql, source: req, append: true, columnMap, additional: additionalFilters })} 
                  ${buildOrderBy({ sql, source: req, columnMap })} 
             LIMIT ${num} OFFSET ${offset}`,
            { transform: r.mapRecordToObject },
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM document_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             JOIN document_units du ON du.unit_id = ep.document_id
             WHERE ep.document_property_type_id=4 
                  ${buildQueryFilter({ sql, source: req, append: true, columnMap, additional: additionalFilters })} 
             `,
          ),
        parsePaginationStats(new URL(req.url)),
      ),
    );
  });
}

export async function POST(
  req: NextRequest,
  args: { params: Promise<{ propertyId: string }> },
) {
  return controller.create(req, args);
}
