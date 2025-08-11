import { NextRequest, NextResponse } from 'next/server';
import { mapRecordToSummary } from '../../../../lib/api/email/util';
import { query } from '@/lib/neondb';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';

import { LoggedError } from '@/lib/react-util';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;
    const queryParam = searchParams.get('query') ?? searchParams.get('q');
    const contactIds = searchParams
      .getAll('contactId')
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));
    const { page, num, offset } = parsePaginationStats(url);

    if (!queryParam || queryParam.length < 2) {
      return NextResponse.json([], { status: 200 });
    }
    const whereClauses = [];
    if (queryParam) {
      whereClauses.push(
        "(e.subject ILIKE '%' || $1 || '%' OR sender.name ILIKE '%' || $1 || '%')",
      );
    }
    if (contactIds.length > 0) {
      whereClauses.push('e.sender_id = ANY(' + contactIds.join(',') + ')');
    }
    const querySql =
      "SELECT \
      e.email_id, \
      e.subject, \
      e.sent_timestamp, \
      sender.contact_id AS senderId, \
      sender.name AS senderName, \
      sender.email AS senderEmail, \
      COALESCE(json_agg( \
        json_build_object( \
        'recipient_id', recipient.contact_id, \
        'recipient_name', recipient.name, \
        'recipient_email', recipient.email \
        ) \
      ) FILTER (WHERE recipient.contact_id IS NOT NULL), '[]') AS recipients \
      FROM emails e \
      JOIN contacts sender ON e.sender_id = sender.contact_id \
      LEFT JOIN email_recipients er ON e.email_id = er.email_id \
      LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id " +
      (whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '') +
      'GROUP BY e.email_id, sender.contact_id, sender.name, sender.email \
      ORDER BY e.sent_timestamp DESC \
        LIMIT ' +
      num +
      ' OFFSET ' +
      offset +
      ';';

    const result = await query(
      (sql) => sql<false, false>(querySql.toString(), [queryParam]),
      { transform: mapRecordToSummary },
    );

    const countQuery =
      'SELECT COUNT(*) AS records \
      FROM emails e \
      JOIN contacts sender ON e.sender_id = sender.contact_id \
      LEFT JOIN email_recipients er ON e.email_id = er.email_id \
      LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id ' +
      (whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '') +
      ';';
    const total = await query((q) => q<false, false>(countQuery, [queryParam]));

    return NextResponse.json(
      { pageStats: { page, num, total: total[0].records }, results: result },
      { status: 200 },
    );
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET email/query',
      msg: 'Error searching emails',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
