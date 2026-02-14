import { errorResponseFactory } from './error-response/index';
import { env } from '@compliance-theater/env';
import { log, safeSerialize, LoggedError } from '@compliance-theater/logger';
import { startup } from '@/lib/site-util/app-startup';
import { SpanKind, SpanStatusCode, trace, context as otelContext, propagation, } from '@opentelemetry/api';
import { isPromise } from '@compliance-theater/typescript';
export const EnableOnBuild = Symbol('ServiceEnabledOnBuild');
export const buildFallbackGrid = { rows: [], rowCount: 0 };
const globalBuildFallback = {
    __status: 'Service disabled during build.',
};
export const extractParams = async (req) => {
    if (!req.params) {
        throw new Error('No params found');
    }
    if (isPromise(req.params)) {
        return await req.params;
    }
    return req.params;
};
export const wrapRouteRequest = (fn, options = {}) => {
    const { log: shouldLog = env('NODE_ENV') !== 'production', buildFallback, errorCallback, } = options ?? {};
    return async (...args) => {
        const req = args[0];
        const context = args[1];
        const { attributes, parentCtx } = await getRequestSpanInit(req, context);
        const tracer = trace.getTracer('noeducation/server-utils');
        return await tracer.startActiveSpan('route.request', {
            kind: SpanKind.SERVER,
            attributes,
        }, parentCtx, async (span) => {
            try {
                if (buildFallback !== EnableOnBuild &&
                    process.env.NEXT_PHASE === 'phase-production-build') {
                    const res = Response.json(buildFallback ?? globalBuildFallback, {
                        status: 200,
                        statusText: 'OK-BUILD-FALLBACK',
                    });
                    span.setAttribute('http.status_code', res.status);
                    span.setStatus({ code: SpanStatusCode.OK });
                    return res;
                }
                const appStartupState = await tracer.startActiveSpan('app.startup.check', async (startupSpan) => {
                    try {
                        const state = await startup();
                        startupSpan.setAttribute('app.startup_state', state);
                        return state;
                    }
                    finally {
                        startupSpan.end();
                    }
                });
                if (appStartupState === 'done') {
                    const res = Response.json(buildFallback ?? globalBuildFallback, {
                        status: 503,
                        statusText: 'ERR-APP-SHUTDOWN',
                        headers: {
                            'Content-Type': 'application/json',
                            'Retry-After': '60',
                        },
                    });
                    span.setAttribute('http.status_code', res.status);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    return res;
                }
                if (shouldLog) {
                    const extractedParams = await (!!context?.params
                        ? context.params
                        : Promise.resolve({}));
                    const url = req?.url ?? '<no-req>';
                    span.setAttribute('request.url', url);
                    span.setAttribute('route.params', safeSerialize(extractedParams));
                    log((l) => l.info(`Processing route request [${url}]`, {
                        args: JSON.stringify(extractedParams),
                    }));
                }
                const result = await fn(req, {
                    ...context,
                    span,
                });
                try {
                    if (typeof result === 'object' && 'status' in result) {
                        span.setAttribute('http.status_code', result.status);
                    }
                }
                catch {
                }
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                try {
                    span.recordException(error);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                }
                catch {
                }
                if (shouldLog) {
                    const extractedParams = await (!!context?.params
                        ? context.params
                        : Promise.resolve({}));
                    error = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'wrapRouteRequest:catch',
                        data: {
                            params: extractedParams,
                            req,
                        },
                    });
                }
                if (errorCallback) {
                    try {
                        const maybePromise = errorCallback(error);
                        if (maybePromise instanceof Promise) {
                            await maybePromise;
                        }
                    }
                    catch (callbackError) {
                        LoggedError.isTurtlesAllTheWayDownBaby(callbackError, {
                            log: true,
                            source: 'wrapRouteRequest:errorCallback',
                        });
                    }
                }
                const errResponse = errorResponseFactory('An unexpected error occurred', {
                    cause: error,
                });
                try {
                    span.setAttribute('http.status_code', errResponse.status);
                    span.setAttribute('error.response', JSON.stringify({
                        status: errResponse.status,
                        statusText: errResponse.statusText,
                    }));
                }
                catch {
                }
                return errResponse;
            }
            finally {
                try {
                    span.end();
                }
                catch {
                }
            }
        });
    };
};
const getRequestSpanInit = async (req, ctx) => {
    const { path, query, method } = getPathQueryAndMethod(req);
    const routeParams = await (!!ctx?.params
        ? ctx.params
        : Promise.resolve({}));
    const headersObj = getHeadersObject(req);
    const sanitizedHeaders = sanitizeHeaders(headersObj);
    const headerGetter = {
        keys: (carrier) => Object.keys(carrier ?? {}),
        get: (carrier, key) => {
            if (!carrier)
                return undefined;
            const lower = key.toLowerCase();
            return carrier[lower];
        },
    };
    const extracted = propagation.extract(otelContext.active(), headersObj, headerGetter);
    const attributes = {
        'request.path': path,
        'request.query': query,
        'http.method': method,
        'route.params': safeSerialize(routeParams),
        'request.headers': safeSerialize(sanitizedHeaders),
    };
    return { attributes, parentCtx: extracted };
};
const getPathQueryAndMethod = (req) => {
    let path = '<no-req>';
    let query = '';
    let method = 'UNKNOWN';
    try {
        if (req) {
            const maybeNext = req;
            method = req.method ?? method;
            if ('nextUrl' in maybeNext && maybeNext.nextUrl instanceof URL) {
                path = maybeNext.nextUrl.pathname;
                query = maybeNext.nextUrl.searchParams.toString();
            }
            else if (req.url) {
                const u = new URL(req.url);
                path = u.pathname;
                query = u.searchParams.toString();
            }
        }
    }
    catch {
    }
    return { path, query, method };
};
const getHeadersObject = (req) => {
    const out = {};
    try {
        if (!req)
            return out;
        const headers = req.headers;
        if (!headers)
            return out;
        for (const [key, value] of headers) {
            out[String(key).toLowerCase()] = String(value);
        }
    }
    catch {
    }
    return out;
};
const sanitizeHeaders = (headers) => {
    const redacted = new Set([
        'authorization',
        'proxy-authorization',
        'cookie',
        'set-cookie',
        'x-api-key',
    ]);
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        out[k] = redacted.has(k) ? '***' : v;
    }
    return out;
};
export const createInstrumentedSpan = async ({ spanName, attributes, tracerName = 'app-instrumentation', autoLog = true, kind, }) => {
    let span;
    try {
        const tracer = trace.getTracer(tracerName);
        const parentContext = otelContext.active();
        span = tracer.startSpan(spanName, kind !== undefined || attributes !== undefined
            ? { kind, attributes }
            : undefined, parentContext);
        const contextWithSpan = trace.setSpan(parentContext, span);
        return {
            parentContext,
            tracerName: tracerName,
            contextWithSpan,
            span,
            executeWithContext: async (fn) => {
                try {
                    const result = await otelContext.with(contextWithSpan, () => fn(span));
                    span.setStatus({ code: SpanStatusCode.OK });
                    return result;
                }
                catch (error) {
                    const err = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: autoLog !== false,
                        source: spanName,
                    });
                    span.recordException(err);
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: err.message || 'Unknown error',
                    });
                    span.setAttributes({
                        'error.message': err.message || 'Unknown error',
                        'error.name': err.name || 'Error',
                        'error.stack': err.stack || '',
                    });
                    throw error;
                }
                finally {
                    try {
                        span.end();
                    }
                    catch {
                    }
                }
            },
        };
    }
    catch {
        return {
            parentContext: undefined,
            contextWithSpan: undefined,
            span: undefined,
            otel: undefined,
            executeWithContext: async (fn) => {
                const noOpSpan = {
                    setAttributes: () => { },
                    setStatus: () => { },
                    recordException: () => { },
                    end: () => { },
                    spanContext: () => ({}),
                    setAttribute: () => { },
                    addEvent: () => { },
                    addLink: () => { },
                    addLinks: () => { },
                    isRecording: () => false,
                    updateName: () => { },
                };
                return fn(noOpSpan);
            },
        };
    }
};
export const reportEvent = async ({ eventName, tracerName = 'noeducation/telemetry', additionalData = {}, }) => {
    const instrumented = await createInstrumentedSpan({
        spanName: `client.event.${eventName}`,
        attributes: {
            'telemetry.event_name': eventName,
        },
        tracerName: tracerName,
    });
    await instrumented.executeWithContext(async (span) => {
        try {
            const eventData = {
                method: eventName,
                timestamp: new Date().toISOString(),
                client_version: 'server-v1',
                keys: additionalData.keys || [],
                success: additionalData.success ?? true,
                ...additionalData,
            };
            if (eventData.success === false) {
                span.setAttribute('telemetry.error', true);
                span.setAttribute('telemetry.error_message', String(additionalData.error || 'Unknown error'));
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: String(additionalData.error || 'Unknown error'),
                });
            }
            log((l) => l.silly(`Client event captured: ${eventName}`, {
                method: eventData.method,
                success: eventData.success,
                keys: JSON.stringify(eventData.keys),
            }));
            try {
                span.addEvent('client.event', {
                    'event.name': eventName,
                    'event.success': String(eventData.success),
                    'event.keys': JSON.stringify(eventData.keys ?? []),
                });
                const { logs } = await import('@opentelemetry/api-logs');
                const logger = logs.getLogger('noeducation/telemetry');
                const spanCtx = span.spanContext();
                const severityText = eventData.success ? 'Information' : 'Error';
                const severityNumber = eventData.success ? 9 : 17;
                const logAttributes = {
                    'telemetry.event_name': eventName,
                    'telemetry.success': eventData.success !== false,
                    'telemetry.keys': JSON.stringify(eventData.keys ?? []),
                    'telemetry.timestamp': eventData.timestamp,
                    'telemetry.client_version': eventData.client_version,
                    'telemetry.trace_id': spanCtx.traceId,
                    'telemetry.span_id': spanCtx.spanId,
                };
                if ('method' in eventData && eventData.method) {
                    logAttributes['telemetry.method'] = String(eventData.method);
                }
                if ('host' in eventData && eventData.host) {
                    logAttributes['telemetry.host'] = String(eventData.host);
                }
                if ('args_count' in eventData && !!eventData.args_count) {
                    logAttributes['telemetry.args_count'] = Number(eventData.args_count);
                }
                if ('error' in eventData && eventData.error) {
                    logAttributes['telemetry.error_message'] = LoggedError.buildMessage(eventData.error);
                }
                logger.emit({
                    body: `client.event.${eventName}`,
                    severityText,
                    severityNumber,
                    attributes: logAttributes,
                    timestamp: Date.now(),
                });
            }
            catch {
            }
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'captureClientEvent',
                data: { eventName },
            });
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Telemetry capture failed',
            });
        }
    });
};
//# sourceMappingURL=utils.js.map