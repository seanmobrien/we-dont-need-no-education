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
    lookup: 5000,      // 5 seconds
    connect: 10000,    // 10 seconds
    secureConnect: 10000, // 10 seconds
    socket: 30000,     // 30 seconds
    send: 30000,       // 30 seconds
    response: 30000,   // 30 seconds
    request: 60000,    // 60 seconds
  },
};
