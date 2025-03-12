import { NextRequest, NextResponse } from 'next/server';
import { getImportMessageStatus } from '../../../_utilitites';
import { LoggedError } from '@/lib/react-util';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> }
) => {
  const { provider, emailId } = await params;
  try {
    const result = await getImportMessageStatus({
      provider,
      emailId,
    });
    if (!result) {
      return NextResponse.json(
        { error: 'Unexpected failure' },
        { status: 500 }
      );
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'google-email-import-status',
      provider,
      emailId,
    });
    return NextResponse.json({ error: le.message }, { status: 500 });
  }
};
