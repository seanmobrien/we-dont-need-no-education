import { schema } from '@compliance-theater/database/orm';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { eq, desc } from 'drizzle-orm';
export const getNextSequence = async ({ chatId, tableName, count = 1, tx, ...props }) => {
    const turnId = 'turnId' in props ? props.turnId : 0;
    const scopedIds = await (tx ? Promise.resolve(tx) : drizDbWithInit()).then((db) => db.execute(`SELECT * FROM allocate_scoped_ids('${tableName}', '${chatId}', ${turnId}, ${count})`));
    const ret = scopedIds.map((x) => x.allocate_scoped_ids);
    return ret;
};
export const normalizeOutput = (value) => {
    if (typeof value === 'string') {
        return value;
    }
    return JSON.stringify(value ?? 'null');
};
export const getItemOutput = (item) => {
    if (!item || !item.output) {
        return { status: 'pending' };
    }
    switch (item.output.type) {
        case 'text':
        case 'json': {
            const parsedValue = typeof item.output.value === 'string'
                ? (() => {
                    try {
                        return JSON.parse(item.output.value);
                    }
                    catch {
                        return item.output.value;
                    }
                })()
                : item.output.value;
            const isError = parsedValue &&
                typeof parsedValue === 'object' &&
                'isError' in parsedValue &&
                parsedValue.isError === true;
            return {
                status: isError ? 'error' : 'result',
                output: normalizeOutput(item.output.value),
            };
        }
        case 'content':
            return item.output.value.reduce((acc, curr) => {
                if ('data' in curr) {
                    acc.media = (acc.media ?? '') + normalizeOutput(curr.data);
                }
                if ('value' in curr) {
                    acc.output = (acc.output ?? '') + normalizeOutput(curr.value);
                }
                return acc;
            }, { status: 'result' });
        case 'error-json':
        case 'error-text':
            return { status: 'error', output: normalizeOutput(item.output) };
        default:
            break;
    }
    return { status: 'result', output: normalizeOutput(item.output) };
};
export const getNewMessages = async (tx, chatId, incomingMessages, currentTurnId) => {
    if (!incomingMessages || incomingMessages.length === 0) {
        return [];
    }
    const existingMessages = await tx
        .select({
        role: schema.chatMessages.role,
        content: schema.chatMessages.content,
        messageOrder: schema.chatMessages.messageOrder,
        providerId: schema.chatMessages.providerId,
        metadata: schema.chatMessages.metadata,
        toolName: schema.chatTool.toolName,
        input: schema.chatToolCalls.input,
        output: schema.chatToolCalls.output,
    })
        .from(schema.chatMessages)
        .leftJoin(schema.chatToolCalls, eq(schema.chatMessages.chatMessageId, schema.chatToolCalls.chatMessageId))
        .leftJoin(schema.chatTool, eq(schema.chatToolCalls.chatToolId, schema.chatTool.chatToolId))
        .where(eq(schema.chatMessages.chatId, chatId))
        .orderBy(desc(schema.chatMessages.messageOrder))
        .then((results) => (results ?? []).filter(Boolean).map((record) => {
        if (!record.content || typeof record.content !== 'string') {
            return record;
        }
        try {
            const parsed = JSON.parse(record.content);
            record.content = parsed;
        }
        catch {
        }
        return record;
    }));
    if (existingMessages.length === 0) {
        return incomingMessages;
    }
    const normalizeContentForComparison = (input, { skipTools = false } = {}) => {
        if (!input) {
            return '';
        }
        if (typeof input === 'string') {
            return input ?? '';
        }
        if (typeof input === 'object' && !!input) {
            let content = '';
            if (Array.isArray(input)) {
                return input
                    .map((x) => normalizeContentForComparison(x, { skipTools }))
                    .filter(Boolean)
                    .join('\n');
            }
            if ('content' in input && !input.content) {
                if (typeof input.content === 'object') {
                    if (Array.isArray(input.content)) {
                        content += input.content
                            .map((x) => normalizeContentForComparison(x, { skipTools }))
                            .filter(Boolean)
                            .join('\n');
                    }
                    else {
                        content += normalizeContentForComparison(input.content, {
                            skipTools,
                        });
                    }
                }
                else {
                    content += input?.content?.toString()?.trim() ?? '';
                }
            }
            if ('text' in input) {
                content += input?.text?.toString()?.trim() ?? '';
            }
            else if ('type' in input) {
                switch (input.type) {
                    case 'text':
                        content += input.text?.toString() ?? '';
                        break;
                    case 'tool-call':
                    case 'tool-result':
                        if (!skipTools) {
                            const fnInput = 'input' in input && input.input
                                ? `(${JSON.stringify(input.input)})`
                                : '';
                            const fnOutput = 'output' in input && input.output
                                ? ` => ${JSON.stringify(input.output)}`
                                : '';
                            const fnName = 'toolName' in input && input.toolName ? input.toolName : '';
                            const fnId = 'toolCallId' in input && input.toolCallId
                                ? ` [${input.toolCallId}]`
                                : '';
                            content += (fnName + fnId + fnInput + fnOutput).trim();
                        }
                        break;
                    default:
                        break;
                }
            }
            return content;
        }
        return '';
    };
    const existingMessageSignatures = new Set(existingMessages.map((msg) => {
        const normalizedContent = normalizeContentForComparison(msg.content);
        return `${msg.role}:${normalizedContent}`;
    }));
    const existingToolProviderIds = new Map(existingMessages
        .filter((msg) => msg.role === 'tool' && msg.providerId)
        .map((msg) => [
        msg.providerId,
        {
            modifiedTurnId: msg.metadata
                ?.modifiedTurnId || 0,
        },
    ]));
    const newMessages = incomingMessages.filter((incomingMsg) => {
        if (incomingMsg.role === 'tool') {
            let toolCallId;
            if (Array.isArray(incomingMsg.content)) {
                for (const part of incomingMsg.content) {
                    if (part &&
                        typeof part === 'object' &&
                        'toolCallId' in part &&
                        part.toolCallId) {
                        toolCallId = part.toolCallId;
                        break;
                    }
                }
            }
            if (toolCallId && existingToolProviderIds.has(toolCallId)) {
                const existingMeta = existingToolProviderIds.get(toolCallId);
                if (currentTurnId && currentTurnId > existingMeta.modifiedTurnId) {
                    return true;
                }
                return false;
            }
        }
        if (incomingMsg.role === 'assistant' &&
            Array.isArray(incomingMsg.content)) {
            const toolCalls = incomingMsg.content.filter((part) => part?.type === 'tool-call' && part?.toolCallId);
            if (toolCalls.length > 0 &&
                toolCalls.length === incomingMsg.content.length) {
                const hasUpdatableCall = toolCalls.some((call) => {
                    if (!('toolCallId' in call)) {
                        return false;
                    }
                    if (!existingToolProviderIds.has(call.toolCallId)) {
                        return true;
                    }
                    const existingMeta = existingToolProviderIds.get(call.toolCallId);
                    return currentTurnId && currentTurnId > existingMeta.modifiedTurnId;
                });
                return hasUpdatableCall;
            }
        }
        const normalizedIncomingContent = normalizeContentForComparison(incomingMsg.content);
        const incomingSignature = `${incomingMsg.role}:${normalizedIncomingContent}`;
        return !existingMessageSignatures.has(incomingSignature);
    });
    return newMessages;
};
//# sourceMappingURL=utility.js.map