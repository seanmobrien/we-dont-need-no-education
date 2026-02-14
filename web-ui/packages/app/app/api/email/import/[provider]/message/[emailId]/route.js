import { NextResponse } from 'next/server';
import { defaultGmailErrorFilter, getImportMessageSource, } from '../../_utilitites';
import { query, queryExt } from '@compliance-theater/database/driver';
import { newUuid } from '@compliance-theater/typescript';
import { DefaultImportManager, queueStagedAttachments, } from '@/lib/email/import/google';
import { LoggedError } from '@compliance-theater/logger';
export const dynamic = 'force-dynamic';
export const GET = async (req, { params }) => {
    const { provider, emailId } = await params;
    const result = await getImportMessageSource({
        req,
        provider,
        emailId,
        refresh: true,
        errorFilter: defaultGmailErrorFilter,
    });
    return 'status' in result
        ? result
        : NextResponse.json(result, { status: 200 });
};
export const POST = async (req, { params }) => {
    const { provider, emailId } = await params;
    const importInstance = new DefaultImportManager(provider);
    const result = await importInstance.importEmail(emailId, { req });
    return NextResponse.json(result, { status: 200 });
};
export const PUT = async (req, { params }) => {
    const { provider, emailId } = await params;
    const result = await getImportMessageSource({
        req,
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
            await query((sql) => sql `delete from staging_message where external_id = ${emailId}`);
            result.stage = 'new';
        }
        else {
            return NextResponse.json({ error: 'message already imported' }, { status: 400 });
        }
    }
    const id = newUuid();
    const payload = JSON.stringify({
        external_id: emailId,
        id: id,
        stage: 'staged',
        message: result.raw,
        userId: result.userId,
    });
    const records = await queryExt((sql) => sql("INSERT INTO staging_message SELECT * FROM  \
      jsonb_populate_record(null::staging_message, '" +
        payload.replaceAll("'", "''") +
        "'::jsonb)"));
    if (records.rowCount !== 1) {
        return NextResponse.json({ error: 'Unexpected failure updating staging table.' }, { status: 500 });
    }
    try {
        const attachments = await Promise.all((result.raw.payload?.parts ?? []).flatMap((part) => queueStagedAttachments({ req, stagedMessageId: id, part })));
        if (!attachments.every((attachment) => attachment.status === 'success')) {
            throw new Error('Failed to stage attachments', { cause: attachments });
        }
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'email-import',
            data: { emailId, attachments: result.raw.payload?.parts },
        });
        try {
            await query((sql) => sql `delete from staging_message where id = ${id}`);
        }
        catch (suppress) {
            LoggedError.isTurtlesAllTheWayDownBaby(suppress, {
                log: true,
                source: 'email-import',
            });
        }
        return NextResponse.json({ error: 'Failed to process attachments' }, { status: 500 });
    }
    return NextResponse.json({
        ...result,
        id,
        stage: 'staged',
    }, { status: 201 });
};
//# sourceMappingURL=route.js.map