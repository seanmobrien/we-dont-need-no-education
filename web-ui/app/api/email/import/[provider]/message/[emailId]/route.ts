import { NextRequest, NextResponse } from 'next/server';
import {
  defaultGmailErrorFilter,
  getImportMessageSource,
} from '../../_utilitites';
import { query, queryExt } from '@/lib/neondb';
import { newUuid } from '@/lib/typescript';
import { DefaultImportManager } from '@/lib/email/import/importmanager';
import { gmail_v1 } from 'googleapis';
import { LoggedError } from '@/lib/react-util';
import { StagedAttachmentRepository } from '@/lib/api/email/import/staged-attachment';
import { errorLogFactory, log } from '@/lib/logger';
import { queueAttachment } from '@/lib/email/import/google/attachment-download';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> }
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    provider,
    emailId,
    refresh: true,
    errorFilter: defaultGmailErrorFilter,
  });
  return 'status' in result!
    ? result
    : NextResponse.json(result, { status: 200 });
};

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> }
) => {
  const { provider, emailId } = await params;
  const importInstance = new DefaultImportManager(provider);
  const result = await importInstance.importEmail(emailId, { req });
  return NextResponse.json(result, { status: 200 });
};

type StageAttachmentProps = {
  stagedMessageId: string;
  part: gmail_v1.Schema$MessagePart;
};
type AttachmentStagedResult = {
  status: 'success' | 'error';
  error?: string;
  partId: string;
};

export const stageAttachment = async ({
  stagedMessageId,
  part,
}: StageAttachmentProps): Promise<AttachmentStagedResult> => {
  const {
    partId = 'unknown',
    filename,
    mimeType,
  } = part as gmail_v1.Schema$MessagePart;
  try {
    if (partId === 'unknown') {
      throw new Error('partId is required');
    }
    const repository = new StagedAttachmentRepository();
    const model = await repository.create({
      stagedMessageId,
      partId: Number(partId),
      filename: filename ?? `attachment-${partId}`,
      mimeType:
        mimeType ??
        part.headers?.find((h) => h.name === 'Content-Type')?.value ??
        null,
      storageId: null,
      imported: false,
      size: part.body!.size ?? 0,
      fileOid: null,
      attachmentId: part.body!.attachmentId!,
    });

    await queueAttachment({
      id: `${stagedMessageId}:${model.partId}`,
      job: { model: { ...model, stagedMessageId: stagedMessageId } },
    });

    return {
      status: 'success',
      partId: partId!,
    };
  } catch (error) {
    const e = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'email-import',
      data: { stagedMessageId, partId, filename, mimeType },
    });
    return {
      status: 'error',
      error: e.message,
      partId: partId ?? 'unknown',
    };
  }
};

export const queueStagedAttachments = ({
  stagedMessageId,
  part: partFromProps,
}: StageAttachmentProps): Array<Promise<AttachmentStagedResult>> => {
  const partItems = [];
  if (partFromProps.filename && partFromProps.body?.attachmentId) {
    partItems.push(stageAttachment({ stagedMessageId, part: partFromProps }));
  }
  return partFromProps.parts
    ? [
        ...partItems,
        ...partFromProps.parts.flatMap((part) =>
          queueStagedAttachments({ stagedMessageId, part })
        ),
      ]
    : partItems;
};

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ provider: string; emailId: string }> }
) => {
  const { provider, emailId } = await params;
  const result = await getImportMessageSource({
    provider,
    emailId,
    refresh: true,
    errorFilter: defaultGmailErrorFilter,
  });
  if (!result) {
    return NextResponse.json({ error: 'message not found' }, { status: 404 });
  }
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
  const id = newUuid();
  const payload = JSON.stringify({
    external_id: emailId,
    message: result.raw,
    stage: 'staged',
    id,
    userId: result.userId,
  });
  const records = await queryExt(
    (sql) => sql`
  INSERT INTO staging_message 
  SELECT * FROM jsonb_populate_record(
    NULL::staging_message,
  ${payload}::jsonb
  ) 
    RETURNING id`
  );
  if (records.rowCount !== 1) {
    return NextResponse.json(
      { error: 'Unexpected failure updating staging table.' },
      { status: 500 }
    );
  }
  // Stage attachments
  try {
    const attachments = await Promise.all(
      (result.raw.payload?.parts ?? []).flatMap((part) =>
        queueStagedAttachments({ stagedMessageId: id, part })
      )
    );
    if (!attachments.every((attachment) => attachment.status === 'success')) {
      throw new Error('Failed to stage attachments', { cause: attachments });
    }
  } catch (error) {
    log((l) =>
      l.error(
        errorLogFactory({
          message: 'Unexpected error processing attachments',
          data: { emailId, attachments: result.raw.payload?.parts },
          error,
          source: 'email-import',
        })
      )
    );
    try {
      await query((sql) => sql`delete from staging_message where id = ${id}`);
    } catch (suppress) {
      LoggedError.isTurtlesAllTheWayDownBaby(suppress, {
        log: true,
        source: 'email-import',
      });
    }
    console.error('Unexpected error processing attachments:', error);
    return NextResponse.json(
      { error: 'Failed to process attachments' },
      { status: 500 }
    );
  }
  return NextResponse.json(
    {
      ...result,
      id,
      stage: 'staged',
    },
    { status: 201 }
  );
};
