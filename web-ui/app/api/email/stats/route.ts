import { NextResponse } from 'next/server';
import { errorLogFactory } from '@/lib/logger';
import { query } from '@/lib/neondb';
import { log } from '@/lib/logger';

export const GET = async (): Promise<NextResponse> => {
  try {
    const result = await query(
      (query) => query`
      SELECT COUNT(*) AS total, MAX(sent_timestamp) AS updated 
      FROM emails e
      JOIN contacts sender ON e.sender_id = sender.contact_id
        LEFT JOIN email_recipients er ON e.email_id = er.email_id
        LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id`
    );
    const { total, updated } = result[0];
    return NextResponse.json({ total, lastUpdated: updated }, { status: 200 });
  } catch (error) {
    log((l) => l.error(errorLogFactory({ source: 'GET email:stats', error })));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
};
