import { NextRequest, NextResponse } from 'next/server';
import { getImportMessageSource } from '../../_utilitites';
import { query, queryExt } from '@/lib/neondb';
import { newUuid } from '@/lib/typescript';
// import { ImportStage } from '@/data-models/api/import/email-message';

export const GET = async (
  req: NextRequest,
  { params }: { params: { provider: string; emailId: string } }
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    provider,
    emailId,
    refresh: true,
  });
  return 'status' in result
    ? result
    : NextResponse.json(result, { status: 200 });
};

export const POST = async (
  req: NextRequest,
  { params }: { params: { provider: string; emailId: string } }
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    provider,
    emailId,
    refresh: true,
  });
  if ('status' in result) {
    return result;
  }
  if (result.stage !== 'new') {
    if (req.nextUrl.searchParams.get('refresh')) {
      await query(
        (sql) => sql`delete from staging_message where external_id = ${emailId}`
      );
      result.stage = 'new';
    } else {
      return NextResponse.json(
        { error: 'message already imported' },
        { status: 400 }
      );
    }
  }
  const payload = JSON.stringify({
    id: newUuid(),
    external_id: emailId,
    message: result.raw,
    stage: 'staged',
  });
  const records = await queryExt(
    (sql) =>
      sql`
  INSERT INTO staging_message 
  SELECT * FROM jsonb_populate_record(
    NULL::staging_message,
  ${payload}::jsonb
  ) 
    RETURNING external_id`
  );
  if (records.rowCount !== 1) {
    return NextResponse.json(
      { error: 'Unexpected failure updating staging table.' },
      { status: 500 }
    );
  }
  /*
  result.id = Number(records[0].id);
  result.stage = records[0].stage as ImportStage;
  */
  return NextResponse.json(result, { status: 201 });
};
