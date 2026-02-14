import { normalizeNullableNumeric } from '@/data-models/_utilities';
import { query } from '@compliance-theater/database/driver';
import { NextResponse } from 'next/server';
import { googleProviderFactory } from './_googleProviderFactory';
import { isError, LoggedError } from '@compliance-theater/logger';
import { auth } from '@/auth';
import { MailQueryBuilder } from './_mailQueryBuilder';
import { ParsedHeaderMap } from '@/lib/email/parsedHeaderMap';
export const parsePaginationStats = (req) => {
    if ('searchParams' in req) {
        req = req.searchParams;
    }
    const page = (req.get('page') ?? '').trim();
    const num = normalizeNullableNumeric(Number(req.get('num')), 100) ?? 100;
    return {
        page,
        num,
        total: 0,
    };
};
const KnownGmailErrorCauseValues = [
    'unauthorized',
    'invalid-args',
    'gmail-failure',
    'email-not-found',
    'source-not-found',
    'email-exists',
    'unknown-error',
];
export const isKnownGmailErrorCause = (check) => KnownGmailErrorCauseValues.includes(check);
export const isKnownGmailError = (check) => isError(check) && isKnownGmailErrorCause(check.cause);
export const defaultGmailErrorFilter = (error) => {
    if (!isKnownGmailError(error)) {
        return undefined;
    }
    switch (error.cause) {
        case 'unauthorized':
            return NextResponse.json({ error: error.message ?? 'Unauthorized' }, { status: 401 });
        case 'email-exists':
            return NextResponse.json({ error: error.message ?? 'Email already exists' }, { status: 409 });
        case 'email-not-found':
        case 'source-not-found':
            return NextResponse.json({ error: error.message ?? 'Email not found' }, { status: 404 });
        case 'unknown-error':
            return NextResponse.json({ error: error.message ?? 'Unknown error' }, { status: 500 });
        case 'invalid-args':
            return NextResponse.json({ error: error.message ?? 'Invalid arguments' }, { status: 400 });
        case 'gmail-failure':
            return NextResponse.json({ error: error.message ?? 'Gmail error' }, { status: 500 });
        default:
            break;
    }
    return undefined;
};
const getGmailMessage = async ({ provider, emailId, req, }) => {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            throw new Error('Must be authenticated to call this API', {
                cause: 'unauthorized',
            });
        }
        const userId = Number(session.user.id);
        if (![provider, emailId].every(Boolean)) {
            throw new TypeError('Missing provider name or provider email id', {
                cause: 'invalid-args',
            });
        }
        const factoryResponse = await googleProviderFactory(provider, { req });
        if ('status' in factoryResponse) {
            throw new Error('Error in factory response', { cause: 'gmail-failure' });
        }
        const { mail } = factoryResponse;
        let googleMessageId = emailId;
        if (emailId.includes('@')) {
            const query = new MailQueryBuilder();
            query.appendQueryParam('rfc822msgid', emailId);
            const queryString = query.build();
            const googleResponse = await mail.list({
                userId: 'me',
                q: queryString,
            });
            if (googleResponse.data.messages?.length) {
                googleMessageId = googleResponse.data.messages[0].id;
            }
            else {
                throw new Error('Email not found', { cause: 'email-not-found' });
            }
        }
        const googleResponse = await mail.get({
            userId: 'me',
            id: googleMessageId,
        });
        if (googleResponse.status !== 200) {
            if (googleResponse.status === 404) {
                throw new Error('Email not found', { cause: 'email-not-found' });
            }
            throw new Error('Error retrieving email', { cause: 'unknown-error' });
        }
        if (!googleResponse?.data) {
            throw new Error('No email data returned', { cause: 'email-not-found' });
        }
        return {
            userId,
            email: googleResponse.data,
            mail,
        };
    }
    catch (error) {
        if (isError(error)) {
            if (isKnownGmailErrorCause(error.cause)) {
                throw error;
            }
        }
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getGmailMessage',
            provider,
            emailId,
        });
        throw le;
    }
};
const getCurrentState = async ({ emailId, userId, source, }) => {
    const refresh = !!source;
    const messageField = refresh ? '' : ', to_json(s.message) AS message';
    const currentStateRows = await query((sql) => sql(`
          select s.external_id AS providerId, s.stage, s.id${messageField}, s."user_id", m.email_id AS targetId from emails m 
            right join staging_message s on s.external_id = m.imported_from_id
            where s.external_id = $1;`.toString(), [emailId]));
    if (!currentStateRows.length) {
        const existingEmailRows = await query((sql) => sql `select email_id from emails where imported_from_id = ${emailId};`);
        if (existingEmailRows.length) {
            throw new Error(`Gmail Message ${emailId} has already been imported as email ${existingEmailRows[0].email_id}; manually delete the email if you want to re-import it.`, { cause: 'email-exists' });
        }
        if (!source) {
            throw new Error(`Gmail message id ${emailId} not found.`, {
                cause: 'source-not-found',
            });
        }
        return {
            raw: source,
            stage: 'new',
            providerId: emailId,
            userId: userId,
            id: undefined,
        };
    }
    if (userId !== currentStateRows[0].userId) {
        throw new Error('Unauthorized', { cause: 'unauthorized' });
    }
    const raw = source ?? currentStateRows[0].message;
    if (!raw) {
        throw new Error(`Gmail message id ${emailId} not found.`, {
            cause: 'source-not-found',
        });
    }
    return {
        stage: currentStateRows[0].stage,
        id: currentStateRows[0].id,
        providerId: currentStateRows[0].providerid,
        targetId: currentStateRows[0].targetid,
        userId: userId,
        raw,
    };
};
export const getImportMessageSource = async ({ req, provider, emailId, refresh = false, errorFilter, }) => {
    const getReturnValue = (response) => (!!errorFilter ? response : null);
    try {
        let source = undefined;
        const session = await auth();
        if (!session || !session.user || !session.user.id) {
            throw new Error('Must be authenticated to call this API', {
                cause: 'unauthorized',
            });
        }
        const userId = Number(session.user.id);
        if (refresh) {
            if (![provider, emailId].every(Boolean)) {
                return getReturnValue(NextResponse.json({ error: 'missing provider or emailId' }, { status: 400 }));
            }
            const factoryResponse = await googleProviderFactory(provider, {
                req,
            });
            if ('status' in factoryResponse) {
                return getReturnValue(factoryResponse);
            }
            const { mail } = factoryResponse;
            const googleResponse = await mail.get({
                userId: 'me',
                id: emailId,
            });
            source = googleResponse.data;
        }
        const theCurrentState = await getCurrentState({
            emailId: emailId,
            source,
            userId,
        });
        if (!theCurrentState) {
            throw new Error('No current state found', { cause: 'email-not-found' });
        }
        return {
            stage: theCurrentState.stage,
            id: theCurrentState.id,
            providerId: theCurrentState.providerId,
            targetId: theCurrentState.targetId,
            userId: theCurrentState.userId,
            raw: theCurrentState.raw,
        };
    }
    catch (error) {
        if (errorFilter) {
            const checkFilter = errorFilter(error);
            if (checkFilter !== undefined) {
                return getReturnValue(checkFilter);
            }
        }
        if (isKnownGmailError(error)) {
            throw error;
        }
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getImportMessageSource',
        });
        if (errorFilter) {
            return getReturnValue(NextResponse.json({ error: le.message }, { status: 500 }));
        }
        throw le;
    }
};
const getImportStatusForExternalId = async (providerId) => {
    let emailId;
    let status;
    const statusRecords = await query((sql) => sql `
          SELECT e.email_id, s.id AS staged_id 
          FROM emails e 
            FULL OUTER JOIN staging_message s 
              ON e.imported_from_id = s.external_id
          WHERE e.imported_from_id=${providerId} OR s.external_id=${providerId};`);
    if (statusRecords.length) {
        const { email_id: recordEmailId, staged_id: recordStagedId } = statusRecords[0];
        if (recordStagedId) {
            status = 'in-progress';
            emailId = recordEmailId;
        }
        else if (recordEmailId) {
            emailId = String(recordEmailId);
            status = 'imported';
        }
        else {
            emailId = null;
            status = 'pending';
        }
    }
    else {
        emailId = null;
        status = 'pending';
    }
    return { status, emailId };
};
const checkReferencedEmailStatus = async ({ email, mail, }) => {
    const extractHeaders = (payload) => {
        const headers = [];
        const extractHeadersFromPart = (part) => {
            if (part.headers) {
                headers.push(...part.headers);
            }
            if (part.parts) {
                part.parts.forEach(extractHeadersFromPart);
            }
        };
        if (payload) {
            extractHeadersFromPart(payload);
        }
        return ParsedHeaderMap.fromHeaders(headers, {
            parseContacts: true,
            expandArrays: true,
            extractBrackets: true,
        });
    };
    const headerMap = extractHeaders(email.payload);
    const referencedEmailIds = Array.from(new Set([
        ...(headerMap.getAllStringValues('References') ?? []),
        ...(headerMap.getAllStringValues('In-Reply-To') ?? []),
    ]));
    const recipients = Array.from(new Set([
        ...(headerMap.getAllContactValues('To') ?? []),
        ...(headerMap.getAllContactValues('Cc') ?? []),
        ...(headerMap.getAllContactValues('Bcc') ?? []),
    ]));
    const importedRecordset = new Map((await query((sql) => sql `select email_id, global_message_id from emails where global_message_id = any(${referencedEmailIds});`)).map((x) => [x.global_message_id, x.email_id]));
    let parseImported = referencedEmailIds.reduce((acc, id) => {
        const emailId = importedRecordset.get(id);
        if (emailId) {
            acc.processed.push({
                emailId,
                provider: 'google',
                providerId: id,
                status: 'imported',
            });
        }
        else {
            acc.unsorted.push(id);
        }
        return acc;
    }, { processed: [], unsorted: [] });
    const operations = await Promise.all(parseImported.unsorted.map((id) => {
        const queryBuilder = new MailQueryBuilder();
        queryBuilder.appendMessageId(id);
        return mail
            .list({ q: queryBuilder.build(), userId: 'me' })
            .then((matches) => ({
            status: 'succeeded',
            provider: 'google',
            id: id,
            data: matches?.data?.messages?.at(0),
        }))
            .catch((error) => ({ status: 'failed', id: id, error }));
    }));
    parseImported = parseImported.unsorted.reduce((acc, id) => {
        const match = operations.find((o) => o.id === id);
        if (match && match.status === 'succeeded' && match.data) {
            acc.processed.push({
                emailId: id,
                provider: 'google',
                providerId: match.data.id,
                status: 'pending',
            });
        }
        else {
            acc.unsorted.push(id);
        }
        return acc;
    }, { processed: parseImported.processed, unsorted: [] });
    const date = headerMap.getFirstStringValue('Date');
    const receivedDate = date ? new Date(date) : new Date(0);
    return {
        processed: parseImported.processed,
        recipients,
        receivedDate,
        subject: headerMap.getFirstStringValue('Subject') ?? '[No Subject]',
        sender: headerMap.getFirstContactValue('From') ?? { email: 'No Sender' },
    };
};
export const getImportMessageStatus = async ({ provider, emailId: emailIdFromProps, req, }) => {
    try {
        const { email, mail } = await getGmailMessage({
            provider,
            emailId: emailIdFromProps,
            req,
        });
        const providerId = email.id;
        const { emailId, status } = await getImportStatusForExternalId(providerId);
        const { processed, recipients, sender, subject, receivedDate } = await checkReferencedEmailStatus({ email, mail });
        return {
            emailId,
            providerId,
            provider,
            status,
            recipients,
            sender,
            subject,
            receivedDate,
            references: processed,
        };
    }
    catch (error) {
        if (isError(error)) {
            if (isKnownGmailErrorCause(error.cause)) {
                if (error.cause === 'email-not-found') {
                    return {
                        emailId: null,
                        providerId: emailIdFromProps,
                        provider,
                        status: 'not-found',
                        sender: { email: 'unknown' },
                        recipients: [],
                        subject: 'unknown',
                        receivedDate: new Date(0),
                        references: [],
                    };
                }
                throw error;
            }
        }
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'getImportMessageStatus',
            provider,
            emailId: emailIdFromProps,
        });
    }
};
//# sourceMappingURL=_utilitites.js.map