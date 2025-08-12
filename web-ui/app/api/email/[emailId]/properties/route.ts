import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';

import {
  RepositoryCrudController,
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '@/lib/api';
import { buildOrderBy } from '@/lib/components/mui/data-grid/server';
import { db } from '@/lib/neondb';
import { extractParams } from '@/lib/nextjs-util';
import { NextRequest } from 'next/server';
import { buildFallbackGrid, wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) => {
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
            FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
            JOIN document_units d ON d.unit_id = ep.document_id
            JOIN email e ON e.email_id = d.email_id
            WHERE e.email_id=${emailId} 
            ${buildOrderBy({ sql, source: req })}
            LIMIT ${num} OFFSET ${offset}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { transform: mapEmailPropertyRecordToObject as any },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        () =>
          db(
            (sql) =>
              sql`SELECT COUNT(*) AS total FROM document_property WHERE document_property_email(document_property.property_id)=${emailId}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        parsePaginationStats(new URL(req.url)),
      ),
    );
  });
}, { buildFallback: buildFallbackGrid });

export const POST = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  const controller = new RepositoryCrudController(
    new EmailPropertyRepository(),
  );
  return controller.create(req, args);
});
