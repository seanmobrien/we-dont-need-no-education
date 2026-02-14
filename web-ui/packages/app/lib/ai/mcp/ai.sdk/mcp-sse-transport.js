import { EventSourceParserStream, } from '@ai-sdk/provider-utils';
import { MCPError } from '../mcp-error';
import { JSONRPCMessageSchema } from './json-rpc-message';
import { log, safeSerialize, LoggedError, isAbortError } from '@compliance-theater/logger';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
import { fetch } from '@/lib/nextjs-util/server/fetch';
const MCP_CONNECTION_TIMEOUT = {
    socket: 5 * 60 * 1000,
    connect: 90 * 1000,
    request: 15 * 60 * 1000,
    lookup: 400,
};
export class SseMCPTransport {
    endpoint;
    abortController;
    url;
    connected = false;
    connecting = false;
    connectionPromise;
    sseConnection;
    headers;
    _onclose;
    get onclose() {
        return this._onclose;
    }
    set onclose(handler) {
        this._onclose = handler;
    }
    _onerror;
    get onerror() {
        return this._onerror;
    }
    set onerror(handler) {
        this._onerror = handler;
    }
    _onmessage;
    get onmessage() {
        return this._onmessage;
    }
    set onmessage(handler) {
        this._onmessage = handler;
    }
    constructor({ url, headers, }) {
        this.url = new URL(url);
        this.headers = headers;
    }
    async start() {
        if (this.connected) {
            log((l) => l.info('SSE Transport already connected, resolving immediately'));
            return Promise.resolve();
        }
        if (this.connecting && this.connectionPromise) {
            log((l) => l.info('SSE Transport connection already in progress, waiting...'));
            return this.connectionPromise;
        }
        this.connecting = true;
        this.connectionPromise = new Promise(async (resolve, reject) => {
            log((l) => l.info('SSE Transport starting connection', { url: this.url.href }));
            this.abortController = new AbortController();
            let reader;
            try {
                log((l) => l.info('SSE Transport: Fetching SSE endpoint', {
                    url: this.url.href,
                }));
                const response = await fetch(this.url.href, {
                    headers: await this.resolveHeaders(),
                    signal: this.abortController?.signal,
                    timeout: MCP_CONNECTION_TIMEOUT,
                });
                log((l) => l.info('SSE Transport: Received response', {
                    status: response.status,
                    ok: response.ok,
                    hasBody: !!response.body,
                }));
                if (!response.ok || !response.body) {
                    const error = new MCPError({
                        code: response.status,
                        message: `MCP SSE Transport Error: ${response.status} ${response.statusText}`,
                    });
                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        source: 'MCP SSE Transport::establishConnection',
                    });
                    this.onerror?.(error);
                    this.connecting = false;
                    return reject(error);
                }
                const stream = response.body
                    .pipeThrough(new TextDecoderStream())
                    .pipeThrough(new EventSourceParserStream());
                const reader = stream.getReader();
                const maybeStream = stream;
                const getErrorCode = (err) => {
                    if (err && typeof err === 'object') {
                        const c = err.code;
                        return typeof c === 'string' ? c : undefined;
                    }
                    return undefined;
                };
                let destroyingPromise;
                const doDestroy = async () => {
                    if (destroyingPromise)
                        return destroyingPromise;
                    destroyingPromise = (async () => {
                        try {
                            try {
                                await reader.cancel('Connection destroyed');
                                log((l) => l.verbose('SSE reader cancelled by destroy'));
                            }
                            catch (e) {
                                if (!isAbortError(e) &&
                                    getErrorCode(e) !== 'ERR_INVALID_STATE') {
                                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                                        message: 'Error cancelling SSE reader during destroy',
                                        log: true,
                                        source: 'MCP SSE Transport::doDestroy',
                                    });
                                }
                            }
                            try {
                                if (typeof maybeStream.destroy === 'function') {
                                    maybeStream.destroy();
                                    log((l) => l.verbose('Underlying SSE stream destroyed by destroy()'));
                                }
                                else if (maybeStream.cancel) {
                                    await maybeStream.cancel('Connection destroyed');
                                    log((l) => l.verbose('Underlying SSE stream cancelled by destroy()'));
                                }
                            }
                            catch (e) {
                                if (!isAbortError(e) &&
                                    getErrorCode(e) !== 'ERR_INVALID_STATE') {
                                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                                        message: 'Error destroying/cancelling underlying stream during destroy',
                                        log: true,
                                        source: 'MCP SSE Transport::doDestroy',
                                    });
                                }
                            }
                        }
                        finally {
                            this.connected = false;
                        }
                    })();
                    return destroyingPromise;
                };
                this.sseConnection = {
                    close: async () => {
                        try {
                            await doDestroy();
                        }
                        catch (e) {
                            LoggedError.isTurtlesAllTheWayDownBaby(e, {
                                message: 'Error closing SSE connection',
                                log: true,
                                severity: 'warn',
                                source: 'MCP SSE Transport::sseConnection.close',
                            });
                        }
                    },
                    destroy: doDestroy,
                };
                const processEvents = async () => {
                    try {
                        log((l) => l.info('SSE Transport: Entering event processing loop'));
                        while (true) {
                            log((l) => l.verbose('SSE Transport: Waiting for next event'));
                            const { done, value } = await reader.read();
                            log((l) => l.info(`SSE Transport (Done: ${done}): Received [${safeSerialize(value?.event)}] event.\n\tData: ${safeSerialize(value?.data)}`, {
                                attribs: {
                                    done,
                                    hasValue: !!value,
                                    event: safeSerialize(value?.event),
                                    dataLength: value?.data?.length,
                                },
                            }));
                            if (done) {
                                if (this.connected) {
                                    this.connected = false;
                                    log((l) => l.warn(`SSE connection closed unexpectedly!`));
                                }
                                return;
                            }
                            const { event, data } = value;
                            log((l) => l.info('SSE Transport: Processing event', {
                                event,
                                dataPreview: data?.substring(0, 100),
                            }));
                            if (event === 'endpoint') {
                                log((l) => l.info('SSE Transport: Received endpoint event', { data }));
                                this.endpoint = new URL(data, this.url);
                                if (this.endpoint.origin !== this.url.origin) {
                                    throw new MCPError({
                                        code: response.status,
                                        message: `MCP SSE Transport Error: Endpoint origin does not match connection origin: ${this.endpoint.origin}`,
                                    });
                                }
                                this.connected = true;
                                this.connecting = false;
                                log((l) => l.info('SSE Transport: Connection established, endpoint set', { endpoint: this.endpoint?.href }));
                                resolve();
                            }
                            else if (event === 'message') {
                                try {
                                    const message = JSONRPCMessageSchema.parse(JSON.parse(data));
                                    this.onmessage?.(message);
                                }
                                catch (error) {
                                    LoggedError.isTurtlesAllTheWayDownBaby(error, {
                                        log: true,
                                        source: 'MCP SSE Transport::processEvents',
                                    });
                                    const e = new MCPError({
                                        message: 'MCP SSE Transport Error: Failed to parse message',
                                        code: response.status,
                                    });
                                    e.cause = error;
                                    this.onerror?.(e);
                                    resolve();
                                }
                            }
                        }
                    }
                    catch (error) {
                        if ((error instanceof Error && error.name === 'AbortError') ||
                            (error instanceof TypeError && error.message === 'terminated')) {
                            resolve();
                            return;
                        }
                        LoggedError.isTurtlesAllTheWayDownBaby(error, {
                            message: `MCP SSE Transport: Connection error - ${LoggedError.buildMessage(error)}`,
                            log: true,
                            source: 'MCP SSE Transport::processEvents',
                        });
                        this.onerror?.(error);
                        this.connecting = false;
                        reject(error);
                    }
                };
                log((l) => l.info('SSE Transport: Starting event processing'));
                await processEvents();
            }
            catch (error) {
                if (isAbortError(error)) {
                    this.sseConnection?.close();
                    resolve();
                    return;
                }
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    message: `MCP SSE Transport: Connection error - ${LoggedError.buildMessage(error)}`,
                    log: true,
                    source: 'MCP SSE Transport::establishConnection',
                });
                this.sseConnection?.close();
                (reader?.cancel(error) ?? Promise.resolve()).catch((e) => {
                    log((l) => l.verbose('Error cancelling reader after connection failure', e));
                });
                this.onerror?.(error);
                this.connecting = false;
                reject(error);
            }
        });
        return this.connectionPromise;
    }
    async resolveHeaders() {
        const headerRecord = typeof this.headers === 'function' ? await this.headers() : this.headers;
        const headers = new Headers(headerRecord);
        headers.set('Accept', 'text/event-stream');
        return headers;
    }
    async close() {
        await this.withSpan('mcp.transport.sse.close', async () => {
            this.connected = false;
            this.connecting = false;
            this.connectionPromise = undefined;
            const connection = this.sseConnection
                ?.close()
                .catch((e) => {
                LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    message: 'Error closing SSE connection',
                    log: true,
                    severity: 'warn',
                    source: 'MCP SSE Transport::close',
                });
            })
                .finally(() => {
                this.sseConnection = undefined;
            });
            this.abortController?.abort();
            await connection;
            this.onclose?.();
        });
    }
    async withSpan(spanName, callback, attributes) {
        const instrumented = await createInstrumentedSpan({
            spanName,
            attributes,
            tracerName: 'mcp-transport',
            autoLog: true,
        });
        return await instrumented.executeWithContext(callback);
    }
    async send(message) {
        if (!this.endpoint || !this.connected) {
            throw new MCPError({
                code: 400,
                message: 'MCP SSE Transport Error: Not connected',
            });
        }
        await this.withSpan('mcp.transport.sse.send', async (span) => {
            span.setAttribute('mcp.send.message', safeSerialize(message));
            try {
                const headers = await this.resolveHeaders();
                headers.set('Content-Type', 'application/json');
                const init = {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(message),
                    signal: this.abortController?.signal,
                    timeout: MCP_CONNECTION_TIMEOUT,
                };
                const response = await fetch(this.endpoint, init);
                if (!response.ok) {
                    const text = await response.text().catch(() => null);
                    const error = new MCPError({
                        code: response.status,
                        message: `MCP SSE Transport Error: POSTing to endpoint (HTTP ${response.status}): ${text}`,
                    });
                    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                        log: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            body: text,
                            url: this.endpoint?.href,
                            response: safeSerialize(response),
                        },
                        source: 'MCP SSE Transport::send',
                    });
                    span.recordException(le);
                    this.onerror?.(le);
                    return;
                }
                log((l) => l.info('MCP SSE Transport: Message sent successfully'));
            }
            catch (error) {
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    message: `MCP SSE Transport: Send error - ${LoggedError.buildMessage(error)}`,
                    log: true,
                    source: 'MCP SSE Transport::send',
                });
                span.recordException(le);
                this.onerror?.(le);
                return;
            }
        });
    }
}
export const deserializeMessage = (line) => JSONRPCMessageSchema.parse(JSON.parse(line));
//# sourceMappingURL=mcp-sse-transport.js.map