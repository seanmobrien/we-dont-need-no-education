import { schema } from '@compliance-theater/database/orm';
import { eq, desc, and } from 'drizzle-orm';
import { log } from '@compliance-theater/logger';
import { getNextSequence, getNewMessages, getItemOutput } from './utility';
import { generateChatId } from '@/lib/ai/core';
const getChatId = (context) => typeof context.chatId === 'string'
    ? context.chatId ?? generateChatId().id
    : generateChatId(context.chatId ?? 1).id;
export const upsertChat = async (tx, chatId, context) => {
    const existingChat = (await tx
        .select({ id: schema.chats.id })
        .from(schema.chats)
        .where(eq(schema.chats.id, chatId))
        .limit(1)
        .execute()).length > 0;
    if (existingChat) {
        log((l) => l.debug(`Record ${chatId} already exists; no insert necessary.`));
    }
    else {
        await tx.insert(schema.chats).values({
            id: String(chatId),
            userId: Number(context.userId),
            title: null,
            createdAt: new Date().toISOString(),
            metadata: {
                model: context.model,
                temperature: context.temperature,
                topP: context.topP,
                threadId: context.chatId,
                firstRequestId: context.requestId,
            },
        });
    }
};
export const reserveTurnId = async (tx, chatId) => {
    const thisTurnId = await getNextSequence({
        tableName: 'chat_turns',
        chatId: chatId,
        tx,
    }).then((ids) => ids[0]);
    if (!thisTurnId) {
        throw new Error('Unexpected failure retrieving next turn sequence for chat id ' + chatId);
    }
    return thisTurnId;
};
export const insertChatTurn = async (tx, chatId, turnId, context) => {
    const thisTurnId = turnId ? turnId : await reserveTurnId(tx, chatId);
    const providerId = ((rId) => {
        if (!rId) {
            return undefined;
        }
        const idxOf = rId.lastIndexOf(':');
        if (idxOf === -1) {
            return rId === chatId ? undefined : rId;
        }
        return rId.substring(idxOf + 1).trim();
    })(context.requestId?.trim());
    await tx.insert(schema.chatTurns).values({
        chatId: chatId,
        turnId: thisTurnId,
        statusId: 1,
        createdAt: new Date().toISOString(),
        providerId,
        temperature: context.temperature,
        topP: context.topP,
        warnings: [],
        errors: [],
        metadata: {
            requestId: context.requestId,
            model: context.model,
        },
    });
};
export const reserveMessageIds = async (tx, chatId, turnId, count) => {
    const messageIds = await getNextSequence({
        tableName: 'chat_messages',
        chatId: chatId,
        turnId: turnId,
        count: count,
        tx,
    });
    if (!messageIds || messageIds.length < count) {
        throw new Error(`Failed to reserve enough message ids for chat ${chatId} turn ${turnId}. Expected ${count}, got ${messageIds?.length ?? 0}`);
    }
    return messageIds;
};
export const insertPendingAssistantMessage = async (tx, chatId, turnId, messageId, messageOrder, content) => {
    await tx
        .insert(schema.chatMessages)
        .values({
        chatId,
        turnId,
        messageId,
        role: 'assistant',
        content,
        messageOrder,
        statusId: 1,
    })
        .returning()
        .execute();
};
const isToolCallPart = (item) => {
    return (!!item &&
        typeof item === 'object' &&
        item.type === 'tool-call');
};
const isToolResultPart = (item) => {
    return (!!item &&
        typeof item === 'object' &&
        'type' in item &&
        (item.type === 'tool-result' || item.type === 'dynamic-tool'));
};
const parseMaybeJson = (value) => {
    if (typeof value !== 'string')
        return value;
    const s = value.trim();
    if (!s || (s[0] !== '{' && s[0] !== '['))
        return value;
    try {
        return JSON.parse(s);
    }
    catch {
        return value;
    }
};
const processField = ({ prop, target, toolRow, existing, isNewerMessage, }) => {
    if (!!toolRow[prop]) {
        if (!existing[prop] ||
            (isNewerMessage && toolRow[prop] !== existing[prop])) {
            target[prop] = toolRow[prop];
            return true;
        }
    }
    return false;
};
export const upsertToolMessage = async (tx, chatId, turnId, toolRow) => {
    if (!toolRow.providerId) {
        return null;
    }
    const existingMessages = await tx
        .select({
        chatMessageId: schema.chatMessages.chatMessageId,
        messageId: schema.chatMessages.messageId,
        turnId: schema.chatMessages.turnId,
        toolName: schema.chatMessages.toolName,
        statusId: schema.chatMessages.statusId,
        functionCall: schema.chatMessages.functionCall,
        toolResult: schema.chatMessages.toolResult,
        metadata: schema.chatMessages.metadata,
        optimizedContent: schema.chatMessages.optimizedContent,
    })
        .from(schema.chatMessages)
        .where(and(eq(schema.chatMessages.chatId, chatId), eq(schema.chatMessages.providerId, toolRow.providerId), eq(schema.chatMessages.role, 'tool')))
        .limit(1);
    if (existingMessages.length === 0 || !existingMessages[0]) {
        return null;
    }
    const existing = existingMessages[0];
    const existingMetadata = existing?.metadata || {};
    const lastModifiedTurnId = existingMetadata.modifiedTurnId || 0;
    const isNewerMessage = turnId > lastModifiedTurnId;
    let updated = false;
    const updateData = {
        functionCall: existing.functionCall,
        toolResult: existing.toolResult,
        statusId: existing.statusId,
        metadata: {
            ...existingMetadata,
            providerOptions: {
                ...(('providerOptions' in existingMetadata
                    ? existingMetadata.providerOptions
                    : null) ?? {}),
                ...((typeof toolRow.metadata == 'object' &&
                    toolRow.metadata &&
                    'providerOptions' in toolRow.metadata
                    ? toolRow.metadata.providerOptions
                    : null) ?? {}),
            },
            modifiedTurnId: turnId,
        },
        optimizedContent: null,
    };
    if (toolRow.statusId > (existing.statusId ?? -1)) {
        updateData.statusId = toolRow.statusId;
        updated = true;
    }
    if (processField({
        prop: 'functionCall',
        target: updateData,
        toolRow,
        existing,
        isNewerMessage,
    })) {
        updated = true;
    }
    if (processField({
        prop: 'toolResult',
        target: updateData,
        toolRow,
        existing,
        isNewerMessage,
    })) {
        updated = true;
    }
    if (!updated) {
        return existing.messageId;
    }
    if (updateData.metadata &&
        typeof updateData.metadata == 'object' &&
        'providerOptions' in updateData.metadata &&
        updateData.metadata.providerOptions &&
        Object.keys(updateData.metadata.providerOptions).length === 0) {
        delete updateData.metadata.providerOptions;
    }
    await tx
        .update(schema.chatMessages)
        .set(updateData)
        .where(eq(schema.chatMessages.chatMessageId, existing.chatMessageId));
    log((l) => l.debug(`Updated tool message for providerId ${toolRow.providerId} from turn ${existing.turnId} to ${turnId}`));
    return existing.messageId;
};
const getLastMessageOrder = async (tx, chatId) => {
    const result = await tx
        .select({ maxOrder: schema.chatMessages.messageOrder })
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.chatId, chatId))
        .orderBy(desc(schema.chatMessages.messageOrder))
        .limit(1);
    return result.length > 0 ? result[0].maxOrder : 0;
};
export const importIncomingMessage = async ({ tx, context, params: { prompt, providerOptions: { backoffice = {} } = {} }, }) => {
    const chatId = getChatId(context);
    let currentMessageOrder = 0;
    await upsertChat(tx, chatId, context);
    const thisTurnId = await reserveTurnId(tx, chatId);
    log((l) => l.debug(`Reserved chat turn id: ${thisTurnId} for chat: ${chatId}`));
    const newMessages = await getNewMessages(tx, chatId, prompt, thisTurnId);
    log((l) => l.debug(`Filtered messages for chat ${chatId}: ${prompt.length} total, ${newMessages?.length || 0} new`));
    await insertChatTurn(tx, chatId, thisTurnId, context);
    backoffice.turnId = thisTurnId;
    let lastMessageOrder;
    try {
        lastMessageOrder = await getLastMessageOrder(tx, chatId);
    }
    catch {
        lastMessageOrder = 1;
    }
    currentMessageOrder = lastMessageOrder + 1;
    if (newMessages?.length) {
        const rows = flattenPromptToRows(newMessages);
        if (rows.length > 0) {
            const messageIds = await reserveMessageIds(tx, chatId, thisTurnId, rows.length);
            await insertPromptMessages(tx, chatId, thisTurnId, messageIds, rows, currentMessageOrder);
            currentMessageOrder += rows.length;
        }
    }
    return {
        chatId,
        turnId: thisTurnId,
        messageId: undefined,
        nextMessageOrder: currentMessageOrder,
    };
};
const flattenPromptToRows = (prompt) => {
    const messages = Array.isArray(prompt) ? prompt : [prompt];
    const rows = [];
    let currentContentRow = null;
    const flushContent = () => {
        if (currentContentRow && currentContentRow.content.length > 0) {
            rows.push({
                statusId: 1,
                ...currentContentRow,
            });
        }
        currentContentRow = null;
    };
    const pushToolRow = (info) => {
        let statusId;
        switch (info.status) {
            case 'pending':
                statusId = 1;
                break;
            case 'content':
                statusId = 2;
                break;
            case 'result':
                statusId = 2;
                break;
            case 'error':
                statusId = 3;
                break;
            default:
                statusId = 1;
                break;
        }
        const row = {
            statusId,
            role: 'tool',
            content: info.media ? info.output : null,
            toolName: info.toolName ?? null,
            providerId: info.toolCallId ?? null,
            functionCall: info.input ? parseMaybeJson(info.input) : null,
            toolResult: info.output || info.media
                ? parseMaybeJson(info.media ?? info.output)
                : null,
            metadata: info.providerOptions
                ? { providerOptions: info.providerOptions }
                : undefined,
        };
        rows.push(row);
    };
    const pushContentItem = (role, value) => {
        if (!value) {
            return;
        }
        let item;
        if (typeof value === 'object') {
            if ('text' in value) {
                item = value;
            }
            else if (Array.isArray(value)) {
                for (const part of value) {
                    processContentPart(part, role);
                }
                return;
            }
            else {
                item = { type: 'text', value: JSON.stringify(value) };
            }
        }
        else {
            item = {
                type: 'text',
                text: typeof value === 'string' ? value : JSON.stringify(value),
            };
        }
        if (!currentContentRow || currentContentRow.role !== role) {
            flushContent();
            currentContentRow = { role, content: [item] };
        }
        else {
            currentContentRow.content.push(item);
        }
    };
    const processContentPart = (part, role) => {
        if (!part)
            return;
        if (isToolCallPart(part)) {
            flushContent();
            pushToolRow({
                status: 'pending',
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input != null
                    ? typeof part.input === 'string'
                        ? part.input
                        : JSON.stringify(part.input)
                    : undefined,
                providerOptions: part
                    .providerOptions
                    ? {
                        input: part
                            .providerOptions,
                    }
                    : undefined,
            });
            return;
        }
        if (isToolResultPart(part)) {
            flushContent();
            const parsed = getItemOutput(part);
            pushToolRow({
                ...parsed,
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                providerOptions: part
                    .providerOptions
                    ? {
                        output: part
                            .providerOptions,
                    }
                    : undefined,
            });
            flushContent();
            return;
        }
        pushContentItem(role, part);
    };
    for (const message of messages) {
        const role = message.role ?? 'user';
        if (typeof message.content === 'string') {
            pushContentItem(role, message.content);
            continue;
        }
        if (Array.isArray(message.content)) {
            for (const part of message.content) {
                processContentPart(part, role);
            }
            continue;
        }
        if (!!message.content) {
            processContentPart(message.content, role);
            continue;
        }
        pushContentItem(role, 'value' in message && !!message.value ? message.value : message);
    }
    flushContent();
    return rows;
};
const insertPromptMessages = async (tx, chatId, turnId, messageIds, rows, startOrder) => {
    let messageOrder = startOrder;
    const rowsToInsert = [];
    let messageIdIndex = 0;
    for (const row of rows) {
        if (row.role === 'tool' && row.providerId) {
            const upsertedMessageId = await upsertToolMessage(tx, chatId, turnId, row);
            if (upsertedMessageId !== null) {
                log((l) => l.debug(`Tool message upserted for providerId ${row.providerId}, messageId: ${upsertedMessageId}`));
                continue;
            }
        }
        const messageId = messageIdIndex < messageIds.length ? messageIds[messageIdIndex] : 0;
        messageIdIndex++;
        const rowData = {
            chatId,
            turnId,
            messageId,
            role: row.role,
            content: typeof row.content === 'string'
                ? row.content
                : row.content != null
                    ? JSON.stringify(row.content)
                    : null,
            toolName: row.toolName ?? null,
            functionCall: row.functionCall ?? null,
            toolResult: row.toolResult ?? null,
            providerId: row.providerId ?? null,
            metadata: row.role === 'tool' && row.providerId
                ? { modifiedTurnId: turnId, ...(row.metadata || {}) }
                : row.metadata ?? null,
            messageOrder: messageOrder++,
            statusId: 2,
        };
        rowsToInsert.push(rowData);
    }
    if (rowsToInsert.length > 0) {
        await tx.insert(schema.chatMessages).values(rowsToInsert).execute();
    }
};
//# sourceMappingURL=import-incoming-message.js.map