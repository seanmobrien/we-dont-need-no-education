import { Span } from '@opentelemetry/sdk-trace-base';

export type ServerErrorResponseType = Response;

export type WrappedResponseContext<TContext extends Record<string, unknown>> = {
  params: Promise<TContext>;
  span: Span;
};
