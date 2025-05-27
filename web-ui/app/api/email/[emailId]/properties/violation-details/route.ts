import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  ViolationDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';

const repository = new ViolationDetailsRepository();
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
            vd.attachment_id, vd.key_point_property_id, vd.action_property_id, vd.violation_type, vd.severity_level, vd.detected_by, vd.detected_on
            FROM document_property ep 
             JOIN violation_details vd ON vd.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=7 
             ${buildOrderBy({ sql, source: req })}           
             LIMIT ${num} OFFSET ${offset}`,
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM document_property ep 
             JOIN violation_details vd ON vd.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=7`,
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
