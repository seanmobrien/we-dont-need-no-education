import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { generateChatId } from '../../core';
import type { ChatHistoryContext } from './types';
import { tracer } from '../../mcp';
import { isError } from '@/lib/react-util/utility-methods';

export const AgentUserId = -1;

type CreateAgentHistoryContextProps = Omit<
  ChatHistoryContext,
  | 'span'
  | 'error'
  | 'dispose'
  | 'userId'
  | 'requestId'
  | 'beganAt'
  | 'iteration'
  | 'temperature'
  | 'topP'
> & {
  iteration?: number;
  operation: string;
  originatingUserId: string;
  opTags?: Record<string, unknown>;
};

const getOperationIds = () => {
  const span = trace.getActiveSpan(); // equivalent to trace.getSpan(context.active())
  if (!span) return null;

  const { traceId, spanId, traceFlags } = span.spanContext();

  return {
    operationId: traceId, // Azure Application Insights operation_Id
    parentId: spanId, // operation_parentId (App Insights)
    traceFlags,
    span, // the span instance if you want to add attributes
  };
};

const hydrateContext = (
  context: Partial<ChatHistoryContext> & { userId: string },
): ChatHistoryContext => {
  const attributes = Object.entries(context).reduce(
    (acc, [key, value]) => {
      if (!!value) {
        acc[`chat.${key}`] = String(
          typeof value === 'object' ? JSON.stringify(value) : value,
        );
      }
      return acc;
    },
    {} as Record<string, string>,
  );
  const span = tracer.startSpan('chat_history.context', {
    kind: SpanKind.CLIENT,
    attributes,
  });
  let error: unknown;
  const dispose = async () => {
    if (!!context.error) {
      const ex = isError(error) ? error : new Error(String(error));
      span.recordException(ex);
      span.setStatus({ code: SpanStatusCode.ERROR, message: ex.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    span.end();
  };
  return {
    iteration: 1,
    beganAt: new Date(),
    ...context,
    span,
    dispose,
    get error(): unknown {
      return error;
    },
    set error(v: unknown) {
      error = v;
    },
  };
};

export const createAgentHistoryContext = ({
  model = 'lofi',
  chatId: chatIdFromProps,
  iteration,
  operation,
  originatingUserId = '-1',
  opTags = {},
  metadata,
}: CreateAgentHistoryContextProps): ChatHistoryContext => {
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
  const chatId =
    chatIdFromProps ?? generateChatId(`agent-${operation}-${Date.now()}`).id;
  return hydrateContext({
    userId: String(AgentUserId),
    chatId: chatId,
    metadata: requestMetadata,
    model,
  });
};

export const createUserChatHistoryContext = ({
  userId,
  requestId,
  chatId,
  model,
}: {
  userId: string;
  requestId?: string;
  chatId?: string;
  turnId?: string;
  model?: string;
}): ChatHistoryContext => {
  return hydrateContext({
    userId,
    requestId,
    chatId,
    model,
  });
};
