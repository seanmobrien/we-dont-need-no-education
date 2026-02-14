import type { NextRequest, NextResponse } from 'next/server';
import { SpanKind, type Context as OtelContext, type Span } from '@opentelemetry/api';
import { WrappedResponseContext } from './types';
export declare const EnableOnBuild: unique symbol;
export declare const buildFallbackGrid: {
    rows: never[];
    rowCount: number;
};
export declare const extractParams: <T extends object>(req: {
    params: T | Promise<T>;
}) => Promise<T>;
export declare const wrapRouteRequest: <A extends [] | [NextRequest] | [Request] | [NextRequest, Pick<WrappedResponseContext<TContext>, "params">] | [NextRequest, WrappedResponseContext<TContext>] | [Request, Pick<WrappedResponseContext<TContext>, "params">] | [Request, WrappedResponseContext<TContext>], TContext extends Record<string, unknown> = Record<string, unknown>>(fn: (...args: A) => Promise<Response | NextResponse | undefined>, options?: {
    log?: boolean;
    buildFallback?: object | typeof EnableOnBuild;
    errorCallback?: (error: unknown) => void | Promise<void>;
}) => ((...args: A) => Promise<Response | NextResponse>);
export declare const createInstrumentedSpan: ({ spanName, attributes, tracerName, autoLog, kind, }: {
    tracerName?: string;
    spanName: string;
    attributes?: Record<string, string | number | boolean>;
    autoLog?: boolean;
    kind?: SpanKind;
}) => Promise<{
    parentContext: OtelContext;
    tracerName: string;
    contextWithSpan: OtelContext;
    span: Span;
    executeWithContext: <TResult>(fn: (span: Span) => Promise<TResult>) => Promise<TResult>;
    otel?: undefined;
} | {
    parentContext: unknown;
    contextWithSpan: unknown;
    span: unknown;
    otel: undefined;
    executeWithContext: <TResult>(fn: (span: Span) => Promise<TResult>) => Promise<TResult>;
    tracerName?: undefined;
}>;
export declare const reportEvent: ({ eventName, tracerName, additionalData, }: {
    eventName: string;
    tracerName?: string;
    additionalData?: Record<string, unknown>;
}) => Promise<void>;
//# sourceMappingURL=utils.d.ts.map