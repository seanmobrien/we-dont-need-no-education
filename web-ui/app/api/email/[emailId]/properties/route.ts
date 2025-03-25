import { parsePaginationStats } from '@/data-models';
import {
  RepositoryCrudController,
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '@/lib/api';
import { db } from '@/lib/neondb';
import { extractParams } from '@/lib/nextjs-util';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) {
  const controller = new RepositoryCrudController(
    new EmailPropertyRepository(),
  );

  return controller.listFromRepository(async (r) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);
    return r.innerQuery((q) =>
      q.list(
        (num, page, offset) =>
          db(
            (sql) =>
              sql`SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id
            FROM email_property ep
            JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
            WHERE email_id=${emailId} LIMIT ${num} OFFSET ${offset}`,
            { transform: mapEmailPropertyRecordToObject },
          ),
        () =>
          db(
            (sql) =>
              sql`SELECT COUNT(*) AS total FROM email_property WHERE email_id=${emailId}`,
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
  const controller = new RepositoryCrudController(
    new EmailPropertyRepository(),
  );
  return controller.create(req, args);
}
