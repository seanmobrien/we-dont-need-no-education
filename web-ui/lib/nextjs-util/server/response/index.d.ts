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
 * - makeStreamResponse: Response wrapper around Node.js Readable streams
 * - makeResponse: General-purpose Response factory from raw buffers
 *
 * For usage examples, see the comprehensive test suite:
 * - __tests__/lib/nextjs-util/server/response/index.test.ts
 */

declare module '@/lib/nextjs-util/server/response' {
  import type { Readable } from 'stream';

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
     * Returns a Node.js Readable stream of the response body.
     *
     * Creates a new stream that pushes the entire body buffer and then ends.
     * Useful for piping the response to writable streams or for chunk processing.
     *
     * @returns Readable stream containing the response body
     *
     * @example
     * ```typescript
     * const response = new FetchResponse(Buffer.from('Stream content'));
     * const stream = response.stream();
     *
     * // Pipe to stdout
     * stream.pipe(process.stdout);
     *
     * // Or collect chunks
     * const chunks: Buffer[] = [];
     * for await (const chunk of stream) {
     *   chunks.push(chunk);
     * }
     * ```
     */
    stream(): Readable;
  }

  /**
   * Default export of FetchResponse class for convenience.
   */
  export default FetchResponse;

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
   * Creates a Response wrapper around a Node.js Readable stream.
   *
   * This function wraps a Node.js stream in a Response-like interface, allowing
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
   *
   * **Important:** The stream can only be consumed once. After reading via text(),
   * json(), or arrayBuffer(), the stream is exhausted. Use stream() for direct
   * access when you need fine-grained control over consumption.
   *
   * @param stream - Node.js Readable stream to wrap
   * @param init - Optional configuration object
   * @param init.status - HTTP status code (default: 200)
   * @param init.headers - HTTP headers to include
   * @returns Response-like object with stream access and consumption methods
   *
   * @example
   * ```typescript
   * // Create a simple streaming response
   * const stream = Readable.from(['chunk1', 'chunk2', 'chunk3']);
   * const response = makeStreamResponse(stream, {
   *   status: 200,
   *   headers: { 'Content-Type': 'text/plain' }
   * });
   *
   * const text = await response.text(); // "chunk1chunk2chunk3"
   * ```
   *
   * @example
   * ```typescript
   * // Server-Sent Events (SSE) streaming
   * const eventStream = new Readable({
   *   read() {
   *     this.push('data: {"message":"Hello"}\n\n');
   *     this.push('data: {"message":"World"}\n\n');
   *     this.push(null); // End stream
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
   * // Stream large JSON data in chunks
   * import { createReadStream } from 'fs';
   * const fileStream = createReadStream('./large-data.json');
   * const response = makeStreamResponse(fileStream);
   *
   * const json = await response.json(); // Parses after consuming all chunks
   * ```
   *
   * @example
   * ```typescript
   * // Process stream chunks manually
   * const dataStream = Readable.from(['{"chunk":', '1}']);
   * const response = makeStreamResponse(dataStream);
   *
   * const stream = response.stream();
   * for await (const chunk of stream) {
   *   console.log('Received:', chunk.toString());
   *   // Process each chunk as it arrives
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Stream binary data
   * const binaryStream = Readable.from([
   *   Buffer.from([0x48, 0x65]),
   *   Buffer.from([0x6c, 0x6c, 0x6f])
   * ]);
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
   * // Database result streaming (conceptual)
   * const queryStream = database.createQueryStream('SELECT * FROM large_table');
   * const response = makeStreamResponse(queryStream, {
   *   headers: {
   *     'Content-Type': 'application/x-ndjson',
   *     'Transfer-Encoding': 'chunked'
   *   }
   * });
   *
   * // Client receives rows progressively without buffering entire result
   * return response;
   * ```
   *
   * @example
   * ```typescript
   * // Handle stream errors
   * const errorStream = new Readable({
   *   read() {
   *     this.emit('error', new Error('Stream failed'));
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
    stream: Readable,
    init?: { status?: number; headers?: Record<string, string> },
  ) => Response;
}
