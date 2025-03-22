import { NextResponse } from 'next/server';
import { query } from '@/lib/neondb';
import { LoggedError } from '@/lib/react-util';

export const GET = async (): Promise<NextResponse> => {
  try {
    const result = await query(
      (query) => query`
      SELECT COUNT(*) AS total, MAX(sent_timestamp) AS updated 
      FROM emails e
      JOIN contacts sender ON e.sender_id = sender.contact_id
        LEFT JOIN email_recipients er ON e.email_id = er.email_id
        LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id`,
    );
    const { total, updated } = result[0];
    return NextResponse.json({ total, lastUpdated: updated }, { status: 200 });
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET email:stats',
      msg: 'Error fetching email stats',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
};
