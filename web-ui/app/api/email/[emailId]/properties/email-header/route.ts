import { NextRequest } from 'next/server';
import {
  RepositoryCrudController,
  EmailHeaderDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { parsePaginationStats } from '@/data-models';
import { db } from '@/lib/neondb';

const repository = new EmailHeaderDetailsRepository();
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
            ) => sql`SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id
            FROM email_property ep 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=1 LIMIT ${num} OFFSET ${offset}`,
          ),
        () =>
          db(
            (sql) => sql`SELECT COUNT(ep.*) AS records 
             FROM email_property ep 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
             WHERE ep.email_id = ${emailId} AND ept.email_property_category_id=1`,
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
