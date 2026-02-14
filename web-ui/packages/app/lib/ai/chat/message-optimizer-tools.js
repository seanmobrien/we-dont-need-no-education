import { generateObject } from 'ai';
import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { log, LoggedError } from '@compliance-theater/logger';
import { createHash } from 'crypto';
import { appMeters, hashUserId } from '@/lib/site-util/metrics';
import { createAgentHistoryContext } from '../middleware/chat-history/create-chat-history-context';
import z from 'zod';
import { drizDbWithInit, schema } from '@compliance-theater/database/orm';
import { and, eq, not } from 'drizzle-orm';
import { isKeyOf } from '@compliance-theater/typescript';
import { countTokens } from '../core/count-tokens';
import { ToolMap } from '../services/model-stats/tool-map';
const hasLegacyParts = (m) => 'parts' in m && Array.isArray(m.parts);
const readParts = (m) => {
    if (hasLegacyParts(m))
        return m.parts;
    const content = m.content;
    return Array.isArray(content) ? content : [];
};
const writeParts = (m, parts) => {
    if (hasLegacyParts(m))
        return { ...m, parts };
    return { ...m, content: parts };
};
const createChatToolCallRecord = async (tx, chatToolId, chatMessageId, providerId, toolRequest, toolResult) => {
    const input = toolRequest.length > 0
        ? JSON.stringify(toolRequest.map((req) => ({
            type: req.type,
            state: 'state' in req ? req.state : undefined,
            toolName: 'toolName' in req ? req.toolName : undefined,
            args: 'args' in req ? req.args : undefined,
            input: 'input' in req ? req.input : undefined,
        })))
        : null;
    const output = toolResult.length > 0
        ? JSON.stringify(toolResult.map((res) => ({
            type: res.type,
            state: 'state' in res ? res.state : undefined,
            toolName: 'toolName' in res ? res.toolName : undefined,
            result: 'result' in res ? res.result : undefined,
            output: 'output' in res ? res.output : undefined,
            errorText: 'errorText' in res ? res.errorText : undefined,
        })))
        : null;
    const result = await tx
        .insert(schema.chatToolCalls)
        .values({
        chatToolId,
        chatMessageId,
        providerId,
        input,
        output,
        timestamp: new Date().toISOString(),
        providerOptions: null,
    })
        .returning({ chatToolCallId: schema.chatToolCalls.chatToolCallId })
        .execute();
    if (!result || result.length === 0) {
        throw new Error('Failed to create chat tool call record');
    }
    return result[0].chatToolCallId;
};
const optimizationCounter = appMeters.createCounter('ai_tool_message_optimization_total', {
    description: 'Total number of tool message optimization operations',
    unit: '1',
});
const messageReductionHistogram = appMeters.createHistogram('ai_tool_message_reduction_ratio', {
    description: 'Distribution of tool message reduction ratios (0-1)',
    unit: '1',
});
const characterReductionHistogram = appMeters.createHistogram('ai_tool_character_reduction_ratio', {
    description: 'Distribution of tool character reduction ratios (0-1)',
    unit: '1',
});
const optimizationDurationHistogram = appMeters.createHistogram('ai_tool_optimization_duration_ms', {
    description: 'Duration of tool message optimization operations',
    unit: 'ms',
});
const toolCallSummariesCounter = appMeters.createCounter('ai_tool_call_summaries_total', {
    description: 'Total number of tool call summaries generated',
    unit: '1',
});
const cacheHitsCounter = appMeters.createCounter('ai_tool_summary_cache_hits_total', {
    description: 'Total number of tool summary cache hits',
    unit: '1',
});
const cacheMissesCounter = appMeters.createCounter('ai_tool_summary_cache_misses_total', {
    description: 'Total number of tool summary cache misses',
    unit: '1',
});
const summaryGenerationDurationHistogram = appMeters.createHistogram('ai_tool_summary_generation_duration_ms', {
    description: 'Duration of individual tool summary generation operations',
    unit: 'ms',
});
const originalMessageCountHistogram = appMeters.createHistogram('ai_tool_original_message_count', {
    description: 'Distribution of original message counts in optimization',
    unit: '1',
});
const optimizedMessageCountHistogram = appMeters.createHistogram('ai_tool_optimized_message_count', {
    description: 'Distribution of optimized message counts after optimization',
    unit: '1',
});
const cacheHitRateHistogram = appMeters.createHistogram('ai_tool_summary_cache_hit_rate', {
    description: 'Distribution of cache hit rates for tool summary cache',
    unit: '1',
});
const toolSummaryCache = new Map();
const cacheStats = {
    hits: 0,
    misses: 0,
};
export const cacheManager = {
    getStats() {
        return {
            size: toolSummaryCache.size,
            keys: Array.from(toolSummaryCache.keys()).map((k) => k.substring(0, 8)),
            hitRate: this.getHitRate(),
        };
    },
    clear() {
        toolSummaryCache.clear();
        cacheStats.hits = 0;
        cacheStats.misses = 0;
        log((l) => l.info('Tool summary cache cleared'));
    },
    getHitRate() {
        const total = cacheStats.hits + cacheStats.misses;
        return total > 0 ? cacheStats.hits / total : 0;
    },
    updateMetrics() {
        cacheHitRateHistogram.record(this.getHitRate(), {
            cache_type: 'tool_summary',
        });
    },
    export() {
        return Object.fromEntries(toolSummaryCache.entries());
    },
    import(data) {
        toolSummaryCache.clear();
        Object.entries(data).forEach(([key, value]) => {
            toolSummaryCache.set(key, value);
        });
        log((l) => l.info('Tool summary cache imported', { size: toolSummaryCache.size }));
    },
};
const createToolRecordsForToolCall = async (record, toolCallId) => {
    if (record.chatToolCallId) {
        return;
    }
    const toolData = record.toolResult[0] || record.toolRequest[0];
    if (!toolData || !('type' in toolData)) {
        throw new Error(`Unable to determine tool type for tool call ${toolCallId}`);
    }
    const toolName = toolData.type.startsWith('tool-')
        ? toolData.type.substring(5)
        : toolData.type;
    await drizDbWithInit((db) => db.transaction(async (tx) => {
        try {
            const chatToolId = await ToolMap.getInstance().then((x) => x.idOrThrow(toolName));
            record.chatToolId = chatToolId;
            const chatMessageId = record.messageId;
            const chatToolCallId = await createChatToolCallRecord(tx, chatToolId, chatMessageId, toolCallId, record.toolRequest, record.toolResult);
            record.chatToolCallId = chatToolCallId;
            log((l) => l.info('Created tool records for tool call', {
                toolCallId,
                chatToolId,
                chatToolCallId,
                toolName,
                messageId: record.messageId,
            }));
        }
        catch (error) {
            log((l) => l.error('Failed to create tool records', {
                error,
                toolCallId,
                messageId: record.messageId,
            }));
            throw error;
        }
    }));
};
const hashToolCallSequence = (toolMessages) => {
    const toHashFriendly = (p) => {
        const toolName = p.toolName || (p.type.startsWith('tool-') ? p.type.substring(5) : p.type);
        if (p.type === 'text') {
            return {
                type: p.type,
                state: p.state ?? 'state',
                text: p.text,
            };
        }
        return {
            type: p.type,
            state: p.state ?? 'unknown',
            toolName,
            input: p.input,
            output: p.output ??
                p.result,
            errorText: p.errorText,
        };
    };
    const contentToHash = toolMessages.map(toHashFriendly).sort((a, b) => {
        if (a.type !== b.type)
            return (a.type || '').localeCompare(b.type || '');
        return String(a.text ?? a.input ?? '').localeCompare(String(b.text ?? b.input ?? ''));
    });
    const hashInput = JSON.stringify(contentToHash);
    return createHash('sha256').update(hashInput).digest('hex');
};
const InputToolStateValues = ['input-streaming', 'input-available'];
const OutputToolStateValues = ['output-error', 'output-available'];
const ToolStateValues = [
    ...InputToolStateValues,
    ...OutputToolStateValues,
];
const isInputToolState = (state) => !!state && InputToolStateValues.includes(state.toString());
const isOutputToolState = (state) => !!state &&
    OutputToolStateValues.includes(state.toString());
const isTool = (check) => {
    if (!check || typeof check !== 'object')
        return false;
    const part = check;
    if (!('type' in part))
        return false;
    if (!('state' in part))
        return false;
    return isKeyOf(part.state, ToolStateValues);
};
export async function optimizeMessagesWithToolSummarization(messages, model, userId, chatHistoryId) {
    const msgs = messages;
    const startTime = Date.now();
    const originalCharacterCount = calculateMessageCharacterCount(msgs);
    originalMessageCountHistogram.record(messages.length, {
        model,
        user_id: userId ? hashUserId(userId) : 'anonymous',
    });
    log((l) => l.verbose('Starting enterprise tool message optimization', {
        originalMessageCount: messages.length,
        originalCharacterCount,
        model,
        userId,
    }));
    const { cutoffIndex, preservedToolIds } = findUserInteractionCutoff(msgs);
    if (cutoffIndex === 0) {
        log((l) => l.verbose('No optimization needed - all messages are recent'));
        optimizationCounter.add(1, {
            model,
            user_id: userId ? hashUserId(userId) : 'anonymous',
            optimization_type: 'no_optimization_needed',
        });
        optimizationDurationHistogram.record(Date.now() - startTime, {
            model,
            user_id: userId ? hashUserId(userId) : 'anonymous',
            optimization_type: 'no_optimization_needed',
        });
        return messages;
    }
    const chatHistoryContext = createAgentHistoryContext({
        model,
        originatingUserId: userId ?? '-1',
        operation: 'context.summarize',
        metadata: {
            targetChatId: chatHistoryId,
            cutoffIndex,
            preservedToolIds: Array.from(preservedToolIds),
        },
    });
    try {
        const { optimizedMessages, toolCallDict } = await processOlderMessagesForSummarization(msgs, cutoffIndex, preservedToolIds);
        await generateToolCallSummaries(toolCallDict, chatHistoryContext, msgs);
        const processingTime = Date.now() - startTime;
        const optimizedCharacterCount = calculateMessageCharacterCount(optimizedMessages);
        const characterReduction = Math.round(((originalCharacterCount - optimizedCharacterCount) /
            originalCharacterCount) *
            100);
        const messageReduction = Math.round(((messages.length - optimizedMessages.length) / messages.length) * 100);
        const attributes = {
            model,
            user_id: userId ? hashUserId(userId) : 'anonymous',
            optimization_type: 'tool_summarization',
        };
        optimizationCounter.add(1, attributes);
        optimizationDurationHistogram.record(processingTime, attributes);
        optimizedMessageCountHistogram.record(optimizedMessages.length, attributes);
        messageReductionHistogram.record((msgs.length - optimizedMessages.length) / msgs.length, attributes);
        characterReductionHistogram.record((originalCharacterCount - optimizedCharacterCount) /
            originalCharacterCount, attributes);
        toolCallSummariesCounter.add(toolCallDict.size, attributes);
        log((l) => l.info('Enterprise tool optimization completed', {
            originalMessages: msgs.length,
            optimizedMessages: optimizedMessages.length,
            originalCharacterCount,
            optimizedCharacterCount,
            characterReduction: `${characterReduction}%`,
            toolCallsProcessed: toolCallDict.size,
            messageReduction: `${messageReduction}%`,
            processingTimeMs: processingTime,
            model,
            userId,
        }));
        return optimizedMessages;
    }
    catch (error) {
        chatHistoryContext.error = error;
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'processOlderMessagesForSummarization',
        });
    }
    finally {
        chatHistoryContext.dispose();
    }
}
const findUserInteractionCutoff = (messages) => {
    const preservedToolIds = new Set();
    let userPromptCount = 0;
    let cutoffIndex = messages.length;
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.role === 'user') {
            userPromptCount++;
            if (userPromptCount >= 2) {
                cutoffIndex = i;
                break;
            }
        }
        if (message.role === 'assistant' &&
            'toolInvocations' in message &&
            Array.isArray(message.toolInvocations)) {
            for (const invocation of message.toolInvocations) {
                if ('toolCallId' in invocation &&
                    typeof invocation.toolCallId === 'string') {
                    preservedToolIds.add(invocation.toolCallId);
                }
            }
        }
    }
    return { cutoffIndex, preservedToolIds };
};
export const summarizeMessageRecord = async ({ tx, chatId, turnId, messageId, write = false, deep = false, }) => {
    try {
        const qp = (await (tx
            ? Promise.resolve(tx)
            : drizDbWithInit()));
        const isThisMessage = and(eq(schema.chatMessages.chatId, chatId), eq(schema.chatMessages.turnId, turnId), eq(schema.chatMessages.messageId, messageId));
        const prevMessages = await qp.query.chatMessages
            .findMany({
            where: and(eq(schema.chatMessages.chatId, chatId), not(isThisMessage)),
            columns: {
                content: deep === true,
                optimizedContent: deep !== true,
            },
            orderBy: [schema.chatMessages.turnId, schema.chatMessages.messageId],
        })
            .execute()
            .then((q) => q
            .map(deep
            ? (m) => m.content
            : (m) => m.optimizedContent)
            .filter((content) => typeof content === 'string' && content.trim().length > 0));
        const thisMessage = await qp.query.chatMessages.findFirst({
            where: isThisMessage,
            columns: {
                content: true,
                optimizedContent: true,
            },
            with: {
                chat: {
                    columns: {
                        title: true,
                    },
                },
            },
        });
        if (!thisMessage) {
            throw new Error('Message not found');
        }
        if (!thisMessage.content || typeof thisMessage.content !== 'string') {
            throw new Error('Message content is invalid or missing');
        }
        const prompt = `You are an expert at summarizing message output for AI conversation context.

  CONVERSATIONAL CONTEXT:
  ${prevMessages.join('\n----\n')}

  CURRENT MESSAGE:
  ${typeof thisMessage.content === 'string'
            ? thisMessage.content
            : JSON.stringify(thisMessage.content, null, 2)}

  CURRENT CHAT TITLE:
  ${thisMessage.chat.title || 'Untitled Chat'}

  Create a short, concise summary that:
  1. Maintains context for ongoing conversation flow
  2. Extracts the key findings that might be relevant for future conversation
  3. Notes any important patterns, insights, errors, or ommissions
  4. Maintains high-fidelity context for ongoing conversation flow

  Additionally,
  5. Provide a short (4-5 word max) title that accurately describes the conversation as a whole - this will be used as the new Chat Title.

  Keep the summary as short as possible while preserving essential meaning.`;
        if (!prompt.trim() || prompt.length > 50000) {
            throw new Error('Generated prompt is invalid (empty or too long)');
        }
        const model = await aiModelFactory('lofi');
        const summarized = (await generateObject({
            model,
            prompt,
            schema: z.object({
                messageSummary: z.string(),
                chatTitle: z.string(),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: 'completion-message-summarization',
            },
        })).object;
        const ret = {
            optimizedContent: summarized.messageSummary,
            chatTitle: summarized.chatTitle,
            newTitle: summarized.chatTitle !== thisMessage.chat.title,
        };
        if (write) {
            (await drizDbWithInit())
                .update(schema.chatMessages)
                .set({ optimizedContent: ret.optimizedContent })
                .where(isThisMessage)
                .execute();
            await qp
                .update(schema.chats)
                .set({ title: ret.chatTitle })
                .where(eq(schema.chats.id, chatId))
                .execute();
        }
        return ret;
    }
    catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
            source: 'tools-optimizer -  summarizeMessageRecord',
            log: true,
        });
    }
};
const processOlderMessagesForSummarization = async (messages, cutoffIndex, preservedToolIds) => {
    const toolCallDict = new Map();
    const optimizedMessages = [
        ...messages.slice(cutoffIndex),
    ];
    for (let i = cutoffIndex - 1; i >= 0; i--) {
        const message = messages[i];
        const processedParts = [];
        const getParts = readParts;
        const setParts = writeParts;
        let messageDirtyFlag = false;
        const summaryInsertedFor = new Set();
        const messageParts = getParts(message);
        for (let j = messageParts.length - 1; j >= 0; j--) {
            const invocation = messageParts[j];
            if (!isTool(invocation) ||
                !invocation.toolCallId ||
                preservedToolIds.has(invocation.toolCallId)) {
                processedParts.unshift(invocation);
                continue;
            }
            if (toolCallDict.has(invocation.toolCallId)) {
                const record = toolCallDict.get(invocation.toolCallId);
                if (isInputToolState(invocation.state)) {
                    if (invocation.state === 'input-available') {
                        record.toolRequest.push({ ...invocation });
                        if (!summaryInsertedFor.has(invocation.toolCallId)) {
                            processedParts.unshift(record.toolSummary);
                            summaryInsertedFor.add(invocation.toolCallId);
                            messageDirtyFlag = true;
                        }
                    }
                    else {
                    }
                }
                else if (isOutputToolState(invocation.state)) {
                    processedParts.unshift(invocation);
                }
                else {
                    log((l) => l.warn('Encountered existing tool invocation with unrecognized or missing state - preserving as-is', { invocation }));
                    processedParts.unshift(invocation);
                }
            }
            else {
                if (isOutputToolState(invocation.state)) {
                    const record = {
                        messageId: message.id ?? `msg-${i} `,
                        toolResult: [{ ...invocation }],
                        toolRequest: [],
                        toolSummary: {
                            type: 'text',
                            text: '[TOOL SUMMARY LOADING...]',
                        },
                        summarizedResult: {
                            ...invocation,
                            preliminary: true,
                            input: '[SUMMARIZED - (input) See summary message]',
                            output: '[SUMMARIZED - (output) See summary message]',
                        },
                        tools: [],
                        toolCalls: [],
                    };
                    toolCallDict.set(invocation.toolCallId, record);
                    processedParts.unshift(invocation);
                    messageDirtyFlag = true;
                }
                else if (isInputToolState(invocation.state)) {
                    preservedToolIds.add(invocation.toolCallId);
                    processedParts.unshift(invocation);
                }
                else {
                    log((l) => l.warn('Encountered new tool invocation with unrecognized or missing state - preserving as-is', { invocation }));
                    processedParts.unshift(invocation);
                }
            }
        }
        if (messageDirtyFlag) {
            optimizedMessages.unshift(setParts(message, processedParts));
        }
        else {
            optimizedMessages.unshift(message);
        }
    }
    return { optimizedMessages, toolCallDict };
};
const generateToolCallSummaries = async (toolCallDict, chatHistoryContext, allMessages) => {
    if (toolCallDict.size === 0) {
        return;
    }
    log((l) => l.debug(`Generating AI summaries for ${toolCallDict.size} tool call sequences`));
    const summaryPromises = Array.from(toolCallDict.entries()).map(async ([toolCallId, record]) => {
        try {
            await createToolRecordsForToolCall(record, toolCallId);
            const summary = await generateSingleToolCallSummary(record, chatHistoryContext, allMessages);
            const summaryWithId = record.chatToolCallId
                ? `${summary} [ID: ${record.chatToolCallId}]`
                : summary;
            record.toolSummary.text = summaryWithId;
            log((l) => l.debug(`Generated summary for tool call ${toolCallId} `, {
                originalLength: record.toolResult.reduce((acc, msg) => acc + JSON.stringify(msg).length, 0),
                summaryLength: summary.length,
            }));
        }
        catch (error) {
            log((l) => l.error(`Failed to generate summary for tool call ${toolCallId} `, {
                error,
            }));
            const fallbackText = `[TOOL CALL COMPLETED]ID: ${toolCallId} - Summary generation failed, see logs for details.`;
            const fallbackWithId = record.chatToolCallId
                ? `${fallbackText}[ID: ${record.chatToolCallId}]`
                : fallbackText;
            record.toolSummary.text = fallbackWithId;
        }
    });
    await Promise.all(summaryPromises);
    log((l) => l.info(`Completed AI summary generation for ${toolCallDict.size} tool sequences`));
};
const generateSingleToolCallSummary = async (record, chatHistoryContext, allMessages) => {
    const allToolMessages = [...record.toolRequest, ...record.toolResult];
    const cacheKey = hashToolCallSequence(allToolMessages);
    const cachedSummary = toolSummaryCache.get(cacheKey);
    if (cachedSummary) {
        cacheStats.hits++;
        cacheHitsCounter.add(1, {
            cache_type: 'tool_summary',
        });
        cacheManager.updateMetrics();
        log((l) => l.debug('Using cached tool summary', {
            cacheKey: cacheKey.substring(0, 8),
        }));
        return cachedSummary;
    }
    cacheStats.misses++;
    cacheMissesCounter.add(1, {
        cache_type: 'tool_summary',
    });
    cacheManager.updateMetrics();
    const toolRequests = record.toolRequest.flatMap((msg) => 'toolInvocations' in msg && Array.isArray(msg.toolInvocations)
        ? msg.toolInvocations.map((inv) => ({
            tool: 'toolName' in inv ? inv.toolName : 'unknown',
            args: 'args' in inv ? inv.args : {},
        }))
        : []);
    const toolResults = record.toolResult.flatMap((msg) => 'toolInvocations' in msg && Array.isArray(msg.toolInvocations)
        ? msg.toolInvocations.map((inv) => ({
            result: 'result' in inv ? inv.result : 'No result',
            tool: 'toolName' in inv ? inv.toolName : 'unknown',
        }))
        : []);
    const conversationalContext = extractConversationalContext(record, allMessages);
    const prompt = `You are an expert at summarizing tool execution results for AI conversation context.

CONVERSATIONAL CONTEXT:
${conversationalContext}

TOOL REQUESTS:
${JSON.stringify(toolRequests, null, 2)}

TOOL RESULTS:
${JSON.stringify(toolResults.map((r) => ({
        tool: r.tool,
        result: typeof r.result === 'string' &&
            r.result,
    })), null, 2)}

Create a concise summary that:
    1. Identifies what tools were executed and why(based on the conversational context)
    2. Extracts the key findings that might be relevant for future conversation
3. Notes any important patterns, insights, or errors
    4. Maintains context for ongoing conversation flow

Keep the summary under 300 characters while preserving essential meaning.
Respond with just the summary text, no additional formatting.`;
    if (!prompt.trim() || prompt.length > 50000) {
        throw new Error('Generated prompt is invalid (empty or too long)');
    }
    const startSummaryTime = Date.now();
    try {
        const lofiModel = await aiModelFactory('lofi');
        const result = await generateObject({
            model: lofiModel,
            prompt,
            schema: z.object({
                messageSummary: z.string(),
                chatTitle: z.string(),
            }),
            experimental_telemetry: {
                isEnabled: true,
                functionId: 'completion-message-tool-summarization',
            },
        });
        const summaryDuration = Date.now() - startSummaryTime;
        summaryGenerationDurationHistogram.record(summaryDuration, {
            model: 'lofi',
            status: 'success',
        });
        const summary = result.object?.messageSummary;
        if (summary) {
            toolSummaryCache.set(cacheKey, summary);
            log((l) => l.debug('Generated and cached new tool summary', {
                cacheKey: cacheKey.substring(0, 8),
                summaryLength: summary.length,
                cacheSize: toolSummaryCache.size,
                durationMs: summaryDuration,
            }));
        }
        return summary;
    }
    catch (error) {
        const summaryDuration = Date.now() - startSummaryTime;
        summaryGenerationDurationHistogram.record(summaryDuration, {
            model: 'lofi',
            status: 'error',
        });
        log((l) => l.error('Tool summarization failed', { error }));
        const toolNames = toolRequests.map((r) => r.tool).join(', ');
        const fallbackSummary = `Tool execution completed: ${toolNames}. Data processed successfully.`;
        toolSummaryCache.set(cacheKey, fallbackSummary);
        return fallbackSummary;
    }
};
const extractConversationalContext = (record, allMessages) => {
    if (!allMessages || allMessages.length === 0) {
        return 'No conversational context available.';
    }
    const contextParts = [];
    record.toolRequest.forEach((msg) => {
        if ('parts' in msg && Array.isArray(msg.parts)) {
            msg.parts.forEach((part) => {
                if (part.type === 'text' &&
                    typeof part.text === 'string' &&
                    part.text.trim()) {
                    contextParts.push(`Assistant reasoning: ${part.text.trim()} `);
                }
            });
        }
    });
    if (record.toolRequest.length > 0) {
        const toolRequestIndex = allMessages.findIndex((msg) => {
            const legacy = msg;
            return legacy.id === record.messageId;
        });
        if (toolRequestIndex > 0) {
            for (let i = toolRequestIndex - 1; i >= 0 && i >= toolRequestIndex - 5; i--) {
                const prevMessage = allMessages[i];
                if (prevMessage.role === 'user') {
                    const prevContent = prevMessage.content;
                    const prevParts = hasLegacyParts(prevMessage)
                        ? prevMessage.parts
                        : Array.isArray(prevContent)
                            ? prevContent
                            : [];
                    const userContent = prevParts
                        .filter((part) => part.type === 'text')
                        .map((part) => part.text ?? '')
                        .join(' ');
                    if (userContent.trim()) {
                        const truncatedContent = userContent.length > 200
                            ? userContent.substring(0, 200) + '...'
                            : userContent;
                        contextParts.unshift(`User request: ${truncatedContent.trim()} `);
                        break;
                    }
                }
            }
        }
    }
    return contextParts.length > 0
        ? contextParts.join('\n')
        : 'No specific conversational context found.';
};
export function extractToolCallIds(message) {
    if (!message || typeof message !== 'object')
        return [];
    const m = message;
    if (m.role !== 'assistant' || !Array.isArray(m.parts))
        return [];
    return Array.from(new Set(m.parts
        .map((inv) => inv && typeof inv === 'object' && 'toolCallId' in inv
        ? inv.toolCallId
        : null)
        .filter((id) => typeof id === 'string' && id.length > 0)));
}
export function hasToolCalls(message) {
    if (!message || typeof message !== 'object')
        return false;
    const m = message;
    if (m.role !== 'assistant' || !Array.isArray(m.parts))
        return false;
    return m.parts.some((p) => !!(p &&
        typeof p === 'object' &&
        'toolCallId' in p &&
        p.toolCallId));
}
const calculateMessageCharacterCount = (messages) => {
    const promptMessages = messages.map((msg) => {
        if (msg.role === 'system') {
            const systemContent = msg.content;
            return {
                role: 'system',
                content: typeof systemContent === 'string' ? systemContent : '',
            };
        }
        const parts = readParts(msg);
        return {
            role: msg.role,
            content: parts,
        };
    });
    return countTokens({ prompt: promptMessages });
};
export const exportMessageOptimizerMetrics = () => {
    cacheManager.updateMetrics();
    return {
        optimization_counters: {
            total_optimizations: 'ai_message_optimization_total',
            tool_summaries_generated: 'ai_tool_call_summaries_total',
            cache_hits: 'ai_tool_summary_cache_hits_total',
            cache_misses: 'ai_tool_summary_cache_misses_total',
        },
        histograms: {
            message_reduction_ratio: 'ai_message_reduction_ratio',
            character_reduction_ratio: 'ai_character_reduction_ratio',
            optimization_duration: 'ai_optimization_duration_ms',
            summary_generation_duration: 'ai_summary_generation_duration_ms',
            original_message_count: 'ai_original_message_count',
            optimized_message_count: 'ai_optimized_message_count',
        },
        gauges: {
            cache_hit_rate: 'ai_tool_summary_cache_hit_rate',
        },
        cache_stats: cacheManager.getStats(),
    };
};
export const startPeriodicMetricsUpdate = (intervalMs = 30000) => {
    const updateInterval = setInterval(() => {
        try {
            cacheManager.updateMetrics();
        }
        catch (error) {
            log((l) => l.error('Failed to update periodic metrics', { error }));
        }
    }, intervalMs);
    return () => {
        clearInterval(updateInterval);
        log((l) => l.debug('Stopped periodic metrics updates for message optimizer'));
    };
};
//# sourceMappingURL=message-optimizer-tools.js.map