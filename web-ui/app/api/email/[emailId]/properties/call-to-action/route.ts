import { NextRequest } from 'next/server';
import { CallToActionDetailsRepository } from '@/lib/api/email/properties/call-to-action/database';
import { RepositoryCrudController } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';

const repository = new CallToActionDetailsRepository();
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
            ) => sql`SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id,
            cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage, cta.policy_id
            FROM email_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=4 LIMIT ${num} OFFSET ${offset}`,
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM email_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=4`,
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
