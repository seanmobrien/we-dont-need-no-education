/**
 * response
 *
 * WHATWG-compliant Response implementations for Next.js server-side code.
 *
 * This module provides minimal Response-like objects that can be used in Node.js
 * environments where the native Response API may be unavailable or insufficient.
 * Particularly useful for server-side Next.js API routes and middleware.
 *
 * Key features:
 * - FetchResponse: Buffer-backed Response implementation with text(), json(), arrayBuffer()
 * - makeJsonResponse: Drop-in replacement for NextResponse.json() with same signature
 * - makeStreamResponse: Response wrapper around Web API ReadableStream
 * - makeResponse: General-purpose Response factory from raw buffers
 *
 * For usage examples, see the comprehensive test suite:
 * - __tests__/lib/nextjs-util/server/response/index.test.ts
 */

declare module '@/lib/nextjs-util/server/response' {
  /**
   * Minimal WHATWG-like Response implementation for server-side use.
   *
   * FetchResponse provides a lightweight Response implementation backed by a Node.js
   * Buffer, implementing the essential WHATWG Response API methods (text(), json(),
   * arrayBuffer()) along with headers and status code management.
   *
   * This class is particularly useful in server environments where:
   * - Native Response API is unavailable or inconsistent
   * - You need full control over response body buffering
   * - You want to avoid dependencies on fetch polyfills
   *
   * @example
   * ```typescript
   * // Create a simple text response
   * const response = new FetchResponse(
   *   Buffer.from('Hello, World!'),
   *   { status: 200, headers: { 'Content-Type': 'text/plain' } }
   * );
   *
   * // Read as text
   * const text = await response.text(); // "Hello, World!"
   *
   * // Check status
   * if (response.ok()) {
   *   console.log('Success:', response.status); // 200
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Create a JSON response
   * const data = { message: 'Success', count: 42 };
   * const response = new FetchResponse(
   *   Buffer.from(JSON.stringify(data)),
   *   { status: 201, headers: { 'Content-Type': 'application/json' } }
   * );
   *
   * const json = await response.json(); // { message: 'Success', count: 42 }
   * ```
   *
   * @example
   * ```typescript
   * // Work with binary data
   * const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
   * const response = new FetchResponse(binaryData);
   *
   * const arrayBuffer = response.arrayBuffer();
   * const bytes = new Uint8Array(arrayBuffer);
   * console.log(bytes); // Uint8Array [72, 101, 108, 108, 111]
   * ```
   */
  export class FetchResponse {
    /**
     * The response body as a Node.js Buffer.
     * Contains the raw bytes of the response content.
     */
    body: Buffer;

    /**
     * HTTP status code of the response.
     * Defaults to 200 if not specified in constructor.
     */
    status: number;

    /**
     * HTTP headers for the response.
     * Uses the WHATWG Headers API for consistency with fetch.
     */
    headers: Headers;

    /**
     * Creates a new FetchResponse instance.
     *
     * @param body - Buffer containing the response body. If null/undefined, allocates empty buffer.
     * @param init - Optional configuration object
     * @param init.status - HTTP status code (default: 200)
     * @param init.headers - Key-value pairs of HTTP headers to set
     *
     * @example
     * ```typescript
     * // Minimal response
     * const response = new FetchResponse(Buffer.from('OK'));
     *
     * // With status and headers
     * const response = new FetchResponse(
     *   Buffer.from('Not Found'),
     *   {
     *     status: 404,
     *     headers: {
     *       'Content-Type': 'text/plain',
     *       'X-Request-Id': 'abc123'
     *     }
     *   }
     * );
     * ```
     */
    constructor(
      body: Buffer,
      init?: { status?: number; headers?: Record<string, string> },
    );

    /**
     * Checks if the response status indicates success (2xx range).
     *
     * @returns True if status is between 200-299 inclusive, false otherwise
     *
     * @example
     * ```typescript
     * const success = new FetchResponse(Buffer.from('OK'), { status: 200 });
     * console.log(success.ok()); // true
     *
     * const error = new FetchResponse(Buffer.from('Not Found'), { status: 404 });
     * console.log(error.ok()); // false
     * ```
     */
    ok(): boolean;

    /**
     * Returns the response body as a UTF-8 string.
     *
     * @returns Promise resolving to the response body text
     *
     * @example
     * ```typescript
     * const response = new FetchResponse(Buffer.from('Hello 世界'));
     * const text = await response.text();
     * console.log(text); // "Hello 世界"
     * ```
     */
    text(): Promise<string>;

    /**
     * Parses the response body as JSON.
     *
     * @returns Promise resolving to the parsed JSON value
     * @throws {SyntaxError} If the body is not valid JSON
     *
     * @example
     * ```typescript
     * const data = { message: 'Hello', items: [1, 2, 3] };
     * const response = new FetchResponse(Buffer.from(JSON.stringify(data)));
     *
     * const json = await response.json();
     * console.log(json.message); // "Hello"
     * console.log(json.items); // [1, 2, 3]
     * ```
     */
    json(): Promise<unknown>;

    /**
     * Returns the response body as an ArrayBuffer.
     *
     * Creates an independent slice of the underlying buffer's memory,
     * so modifications to the original buffer won't affect the returned ArrayBuffer.
     *
     * @returns ArrayBuffer containing a copy of the response body
     *
     * @example
     * ```typescript
     * const response = new FetchResponse(Buffer.from([1, 2, 3, 4, 5]));
     * const arrayBuffer = response.arrayBuffer();
     * const view = new Uint8Array(arrayBuffer);
     * console.log(view); // Uint8Array [1, 2, 3, 4, 5]
     * ```
     */
    arrayBuffer(): ArrayBuffer;

    /**
     * Returns a Web API ReadableStream of the response body.
     *
     * Creates a new stream that enqueues the entire body buffer and then closes.
     * Useful for piping the response to writable streams or for chunk processing.
     * Compatible with Next.js edge runtime.
     *
     * @returns ReadableStream containing the response body
     *
     * @example
     * ```typescript
     * const response = new FetchResponse(Buffer.from('Stream content'));
     * const stream = response.stream();
     *
     * // Read the stream
     * const reader = stream.getReader();
     * const { done, value } = await reader.read();
     *
     * // Or collect chunks
     * const chunks: Uint8Array[] = [];
     * const reader = stream.getReader();
     * while (true) {
     *   const { done, value } = await reader.read();
     *   if (done) break;
     *   chunks.push(value);
     * }
     * ```
     */
    stream(): ReadableStream<Uint8Array>;
  }

  /**
   * Default export of FetchResponse class for convenience.
   */
  export default FetchResponse;

  /**
   * Convert a Node.js Readable stream to a Web API ReadableStream.
   * Useful for adapting Node.js streams to edge-compatible APIs.
   *
   * This utility function bridges the gap between Node.js stream ecosystem
   * and Web API streams, enabling use of Node.js libraries in edge runtimes
   * and ensuring compatibility with Next.js edge functions.
   *
   * @param nodeStream - Node.js Readable stream to convert
   * @returns Web API ReadableStream that mirrors the Node stream
   *
   * @example
   * ```typescript
   * import { Readable } from 'stream';
   * import { nodeStreamToReadableStream, makeStreamResponse } from '@/lib/nextjs-util/server/response';
   *
   * const nodeStream = Readable.from(['chunk1', 'chunk2']);
   * const webStream = nodeStreamToReadableStream(nodeStream);
   * const response = makeStreamResponse(webStream);
   * ```
   *
   * @example
   * ```typescript
   * // Convert file stream to edge-compatible stream
   * import { createReadStream } from 'fs';
   * const fileStream = createReadStream('./data.json');
   * const webStream = nodeStreamToReadableStream(fileStream);
   * return makeStreamResponse(webStream, {
   *   headers: { 'Content-Type': 'application/json' }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Convert PassThrough stream
   * import { PassThrough } from 'stream';
   * const pass = new PassThrough();
   * pass.write('Hello ');
   * pass.write('World');
   * pass.end();
   * const webStream = nodeStreamToReadableStream(pass);
   * ```
   */
  export const nodeStreamToReadableStream: (
    nodeStream: NodeJS.ReadableStream,
  ) => ReadableStream<Uint8Array>;

  /**
   * Creates a Response-like object from raw components.
   *
   * This is a general-purpose factory function that wraps a FetchResponse
   * with explicit body, headers, and status code. Useful when you have
   * raw response data and need to convert it to a Response-compatible object.
   *
   * @param v - Object containing response components
   * @param v.body - Buffer containing the response body
   * @param v.headers - Key-value pairs of HTTP headers
   * @param v.statusCode - HTTP status code
   * @returns Response object compatible with WHATWG Response API
   *
   * @example
   * ```typescript
   * const response = makeResponse({
   *   body: Buffer.from('Hello'),
   *   headers: { 'Content-Type': 'text/plain', 'X-Custom': 'value' },
   *   statusCode: 200
   * });
   *
   * console.log(response.status); // 200
   * console.log(response.headers.get('Content-Type')); // 'text/plain'
   * const text = await response.text(); // "Hello"
   * ```
   */
  export const makeResponse: (v: {
    body: Buffer;
    headers: Record<string, string>;
    statusCode: number;
  }) => Response;

  /**
   * Creates a JSON Response similar to NextResponse.json().
   *
   * This function provides a server-side implementation that mirrors the signature
   * and behavior of Next.js's NextResponse.json(). It automatically serializes
   * the provided data as JSON, sets the Content-Type header to application/json,
   * and supports custom status codes and headers.
   *
   * **Key Features:**
   * - Drop-in replacement for NextResponse.json() in server contexts
   * - Automatic JSON serialization with proper Content-Type header
   * - Support for custom status codes (200, 201, 400, 404, 500, etc.)
   * - Header merging with Content-Type preservation
   * - Works with any JSON-serializable data (objects, arrays, primitives, null)
   *
   * @param data - Any JSON-serializable value (object, array, string, number, boolean, null)
   * @param init - Optional ResponseInit configuration
   * @param init.status - HTTP status code (default: 200)
   * @param init.statusText - HTTP status text (currently not used)
   * @param init.headers - Additional headers to include (merged with Content-Type)
   * @returns Response object with JSON body and application/json Content-Type
   *
   * @example
   * ```typescript
   * // Simple success response
   * const response = makeJsonResponse({ message: 'Success', data: [1, 2, 3] });
   * // Status: 200, Content-Type: application/json
   * ```
   *
   * @example
   * ```typescript
   * // Error response with custom status
   * const response = makeJsonResponse(
   *   { error: 'Not found', details: 'User does not exist' },
   *   { status: 404 }
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Created response with custom headers
   * const response = makeJsonResponse(
   *   { id: '123', name: 'New Resource' },
   *   {
   *     status: 201,
   *     headers: {
   *       'Location': '/api/resources/123',
   *       'X-Request-Id': 'abc-def-ghi'
   *     }
   *   }
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Next.js API route usage (drop-in replacement)
   * export async function GET(request: NextRequest) {
   *   const data = await fetchData();
   *
   *   // Instead of: return NextResponse.json(data);
   *   return makeJsonResponse(data);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Handle various data types
   * makeJsonResponse('string'); // JSON string
   * makeJsonResponse(42); // JSON number
   * makeJsonResponse(true); // JSON boolean
   * makeJsonResponse(null); // JSON null
   * makeJsonResponse([1, 2, 3]); // JSON array
   * makeJsonResponse({ nested: { deep: 'value' } }); // JSON object
   * ```
   *
   * @example
   * ```typescript
   * // Override Content-Type for specialized JSON formats
   * const response = makeJsonResponse(
   *   { data: { type: 'users', id: '1' } },
   *   { headers: { 'Content-Type': 'application/vnd.api+json' } }
   * );
   * ```
   */
  export const makeJsonResponse: (
    data: unknown,
    init?: ResponseInit,
  ) => Response;

  /**
   * Creates a Response wrapper around a Web API ReadableStream.
   *
   * This function wraps a ReadableStream in a Response-like interface, allowing
   * streaming data to be handled consistently with other Response objects. The
   * returned object exposes methods to consume the stream as text, JSON, or
   * ArrayBuffer, as well as direct stream access.
   *
   * **Use Cases:**
   * - Server-Sent Events (SSE) / real-time data streams
   * - Large file downloads with streaming
   * - Chunked data processing from databases or APIs
   * - Piping data between services without buffering
   * - Long-running operations with progressive output
   * - Edge runtime compatible streaming (Next.js edge functions)
   *
   * **Important:** The stream can only be consumed once. After reading via text(),
   * json(), or arrayBuffer(), the stream is exhausted. Use stream() for direct
   * access when you need fine-grained control over consumption.
   *
   * @param stream - Web API ReadableStream to wrap
   * @param init - Optional configuration object
   * @param init.status - HTTP status code (default: 200)
   * @param init.headers - HTTP headers to include
   * @returns Response-like object with stream access and consumption methods
   *
   * @example
   * ```typescript
   * // Create a simple streaming response
   * const stream = new ReadableStream({
   *   start(controller) {
   *     controller.enqueue(new TextEncoder().encode('chunk1'));
   *     controller.enqueue(new TextEncoder().encode('chunk2'));
   *     controller.close();
   *   }
   * });
   * const response = makeStreamResponse(stream, {
   *   status: 200,
   *   headers: { 'Content-Type': 'text/plain' }
   * });
   *
   * const text = await response.text(); // "chunk1chunk2"
   * ```
   *
   * @example
   * ```typescript
   * // Server-Sent Events (SSE) streaming
   * const eventStream = new ReadableStream({
   *   start(controller) {
   *     controller.enqueue(new TextEncoder().encode('data: {"message":"Hello"}\n\n'));
   *     controller.enqueue(new TextEncoder().encode('data: {"message":"World"}\n\n'));
   *     controller.close();
   *   }
   * });
   *
   * const response = makeStreamResponse(eventStream, {
   *   status: 200,
   *   headers: {
   *     'Content-Type': 'text/event-stream',
   *     'Cache-Control': 'no-cache',
   *     'Connection': 'keep-alive'
   *   }
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Process stream chunks manually
   * const dataStream = new ReadableStream({
   *   start(controller) {
   *     controller.enqueue(new TextEncoder().encode('{"chunk":'));
   *     controller.enqueue(new TextEncoder().encode('1}'));
   *     controller.close();
   *   }
   * });
   * const response = makeStreamResponse(dataStream);
   *
   * const stream = response.stream();
   * const reader = stream.getReader();
   * while (true) {
   *   const { done, value } = await reader.read();
   *   if (done) break;
   *   console.log('Received:', new TextDecoder().decode(value));
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Stream binary data
   * const binaryStream = new ReadableStream({
   *   start(controller) {
   *     controller.enqueue(new Uint8Array([0x48, 0x65]));
   *     controller.enqueue(new Uint8Array([0x6c, 0x6c, 0x6f]));
   *     controller.close();
   *   }
   * });
   * const response = makeStreamResponse(binaryStream, {
   *   headers: { 'Content-Type': 'application/octet-stream' }
   * });
   *
   * const arrayBuffer = await response.arrayBuffer();
   * const bytes = new Uint8Array(arrayBuffer); // [72, 101, 108, 108, 111] = "Hello"
   * ```
   *
   * @example
   * ```typescript
   * // Handle stream errors
   * const errorStream = new ReadableStream({
   *   start(controller) {
   *     controller.error(new Error('Stream failed'));
   *   }
   * });
   * const response = makeStreamResponse(errorStream);
   *
   * try {
   *   await response.text();
   * } catch (error) {
   *   console.error('Stream error:', error.message); // "Stream failed"
   * }
   * ```
   */
  export const makeStreamResponse: (
    stream: ReadableStream<Uint8Array>,
    init?: { status?: number; headers?: Record<string, string> },
  ) => Response;
}
