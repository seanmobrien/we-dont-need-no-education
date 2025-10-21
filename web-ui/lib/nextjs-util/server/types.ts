import { Span } from '@opentelemetry/api';

export type ServerErrorResponseType = Response;

export type WrappedResponseContext<TContext extends Record<string, unknown>> = {
  params: Promise<TContext>;
  span: Span;
};
