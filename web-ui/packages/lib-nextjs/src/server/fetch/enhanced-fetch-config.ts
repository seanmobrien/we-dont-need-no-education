/**
 * Timeout configuration for the enhanced fetch implementation.
 * Extracted from site-util to avoid circular dependency
 *
 * @property {number} [lookup] - DNS lookup timeout.
 * @property {number} [connect] - Connection timeout.
 * @property {number} [secureConnect] - SSL handshake timeout.
 * @property {number} [socket] - Socket timeout; resets when data is transferred.
 * @property {number} [send] - Send timeout: from connect until all data is written to the stream.
 * @property {number} [response] - Response timeout: from send until headers are received.
 * @property {number} [request] - Request timeout: from request initiation to response end (global timeout).
 */
type EnhancedFetchConfigTimeout = {
  lookup?: number;
  connect?: number;
  secureConnect?: number;
  socket?: number;
  send?: number;
  response?: number;
  request?: number;
};

export type EnhancedFetchConfig = {
  timeout: EnhancedFetchConfigTimeout;
};

/**
 * Default configuration for enhanced fetch
 */
export const DEFAULT_ENHANCED_FETCH_CONFIG: EnhancedFetchConfig = {
  timeout: {
    lookup: 200,
    connect: 1000,
    secureConnect: 1000,
    socket: 60000,
    send: 10000,
    response: 30000,
    request: 60000,
  },
};
