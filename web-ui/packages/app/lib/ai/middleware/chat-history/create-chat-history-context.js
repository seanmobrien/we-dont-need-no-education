import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { generateChatId } from '@/lib/ai/core';
import { tracer } from '@/lib/ai/mcp/instrumented-sse-transport/metrics/otel-metrics';
import { isError } from '@compliance-theater/logger';
export const AgentUserId = -1;
const getOperationIds = () => {
    const span = trace.getActiveSpan();
    if (!span)
        return null;
    const { traceId, spanId, traceFlags } = span.spanContext();
    return {
        operationId: traceId,
        parentId: spanId,
        traceFlags,
        span,
    };
};
const hydrateContext = (context) => {
    const attributes = Object.entries(context).reduce((acc, [key, value]) => {
        if (!!value) {
            acc[`chat.${key}`] = String(typeof value === 'object' ? JSON.stringify(value) : value);
        }
        return acc;
    }, {});
    const span = tracer.startSpan('chat_history.context', {
        kind: SpanKind.CLIENT,
        attributes,
    });
    let error;
    const dispose = async () => {
        try {
            if (!!context.error) {
                const ex = isError(error) ? error : new Error(String(error));
                span.recordException(ex);
                span.setStatus({ code: SpanStatusCode.ERROR, message: ex.message });
            }
            else {
                span.setStatus({ code: SpanStatusCode.OK });
            }
            span.end();
        }
        catch (_e) {
        }
    };
    return {
        iteration: 1,
        beganAt: new Date(),
        ...context,
        span,
        dispose,
        get error() {
            return error;
        },
        set error(v) {
            error = v;
        },
    };
};
export const createAgentHistoryContext = ({ model = 'lofi', chatId: chatIdFromProps, iteration, operation, originatingUserId = '-1', opTags = {}, metadata, }) => {
    const { operationId, parentId, traceFlags } = getOperationIds() ?? {};
    const requestMetadata = {
        ...(metadata ?? {}),
        operation,
        originatingUserId,
        iteration,
        ...(opTags ?? {}),
        traceparent: {
            traceId: operationId,
            parentId,
            traceFlags,
        },
    };
    const secureRandomId = generateChatId().id;
    const chatId = chatIdFromProps ?? `agent-${operation}-${secureRandomId}`;
    return hydrateContext({
        userId: String(AgentUserId),
        chatId: chatId,
        metadata: requestMetadata,
        model,
    });
};
export const createUserChatHistoryContext = ({ userId, requestId, chatId, model, }) => {
    return hydrateContext({
        userId,
        requestId,
        chatId,
        model,
    });
};
//# sourceMappingURL=create-chat-history-context.js.map