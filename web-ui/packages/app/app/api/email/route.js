import { NextResponse } from 'next/server';
import { log } from '@compliance-theater/logger';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { EmailService } from '@/lib/api/email/email-service';
import { validateCreateEmail, validateUpdateEmail, } from '@/lib/api/email/email-validation';
import { buildFallbackGrid, wrapRouteRequest, } from '@/lib/nextjs-util/server/utils';
import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { eq, and, inArray } from 'drizzle-orm';
import { getEmailColumn, selectForGrid, } from '@/lib/components/mui/data-grid/queryHelpers';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
import { getAccessToken } from '@/lib/auth/access-token';
export const dynamic = 'force-dynamic';
const NEVER_USE_USER_ID = -942370932;
export const GET = wrapRouteRequest(async (req) => {
    const normalAccessToken = await getAccessToken(req);
    const eligibleUserIds = (await getAccessibleUserIds(normalAccessToken)) ?? [
        NEVER_USE_USER_ID,
    ];
    const results = await drizDbWithInit(async (db) => {
        const getColumn = (columnName) => {
            switch (columnName) {
                case 'sentOn':
                    return schema.emails.sentTimestamp;
                case 'sender':
                    return schema.contacts.name;
                case 'count_cta':
                    return schema.emails.countCta;
                case 'count_kpi':
                    return schema.emails.countKpi;
                case 'count_notes':
                    return schema.emails.countNotes;
                case 'count_responsive_actions':
                    return schema.emails.countResponsiveActions;
                case 'count_attachments':
                    return schema.emails.countAttachments;
                default:
                    return getEmailColumn({ columnName, table: schema.emails });
            }
        };
        const bq = db
            .select({
            emailId: schema.emails.emailId,
            senderId: schema.emails.senderId,
            senderName: schema.contacts.name,
            senderEmai: schema.contacts.email,
            subject: schema.emails.subject,
            sentOn: schema.emails.sentTimestamp,
            threadId: schema.emails.threadId,
            parentEmailId: schema.emails.parentId,
            importedFromId: schema.emails.importedFromId,
            globalMessageId: schema.emails.globalMessageId,
            count_kpi: schema.emails.countKpi,
            count_notes: schema.emails.countNotes,
            count_cta: schema.emails.countCta,
            count_responsive_actions: schema.emails.countResponsiveActions,
            count_attachments: schema.emails.countAttachments,
        })
            .from(schema.emails)
            .innerJoin(schema.documentUnits, and(and(eq(schema.emails.emailId, schema.documentUnits.emailId), eq(schema.documentUnits.documentType, 'email')), inArray(schema.documentUnits.userId, eligibleUserIds)))
            .innerJoin(schema.contacts, eq(schema.emails.senderId, schema.contacts.contactId));
        return await selectForGrid({
            req,
            query: bq,
            getColumn,
            defaultSort: 'sentOn',
            recordMapper: (emailDomain) => ({
                emailId: String(emailDomain.emailId),
                sender: {
                    contactId: Number(emailDomain.senderId),
                    name: String(emailDomain.senderName),
                    email: String(emailDomain.senderEmail),
                },
                subject: String(emailDomain.subject ?? ''),
                sentOn: new Date(emailDomain.sentOn
                    ? Date.parse(String(emailDomain.sentOn))
                    : Date.now()),
                threadId: emailDomain.threadId
                    ? Number(emailDomain.threadId)
                    : undefined,
                parentEmailId: emailDomain.parentId
                    ? String(emailDomain.parentId)
                    : undefined,
                importedFromId: emailDomain.importedFromId
                    ? String(emailDomain.importedFromId)
                    : undefined,
                globalMessageId: emailDomain.globalMessageId
                    ? String(emailDomain.globalMessageId)
                    : undefined,
                recipients: emailDomain.recipients,
                count_attachments: Number(emailDomain.count_attachments) ?? 0,
                count_kpi: Number(emailDomain.count_kpi) ?? 0,
                count_notes: Number(emailDomain.count_notes) ?? 0,
                count_cta: Number(emailDomain.count_cta) ?? 0,
                count_responsive_actions: Number(emailDomain.count_responsive_actions) ?? 0,
            }),
        });
    });
    return Response.json(results);
}, { buildFallback: buildFallbackGrid });
export const POST = wrapRouteRequest(async (req) => {
    try {
        const raw = await req.json();
        const validated = validateCreateEmail(raw);
        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
        }
        const emailService = new EmailService();
        const createdEmail = await emailService.createEmail(validated.data);
        return NextResponse.json({
            message: 'Email created successfully',
            email: createdEmail,
        }, { status: 201 });
    }
    catch (error) {
        if (ValidationError.isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        log((l) => l.error({
            source: 'POST email',
            error,
        }));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
export const PUT = wrapRouteRequest(async (req) => {
    try {
        const raw = await req.json();
        const validated = validateUpdateEmail(raw);
        if (!validated.success) {
            return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 });
        }
        const emailService = new EmailService();
        const updatedEmail = await emailService.updateEmail(validated.data);
        return NextResponse.json({ message: 'Email updated successfully', email: updatedEmail }, { status: 200 });
    }
    catch (error) {
        if (ValidationError.isValidationError(error)) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        log((l) => l.error({ source: 'PUT email', error }));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
export const DELETE = wrapRouteRequest(async (req) => {
    try {
        const { emailId } = await req.json();
        if (!emailId) {
            return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
        }
        const emailService = new EmailService();
        const deleted = await emailService.deleteEmail(emailId);
        if (!deleted) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Email deleted successfully' }, { status: 200 });
    }
    catch (error) {
        log((l) => l.error({ source: 'DELETE email', error }));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map