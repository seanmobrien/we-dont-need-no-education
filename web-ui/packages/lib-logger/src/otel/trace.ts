export { tracer } from './metrics-recorder';

// OTEL Configuration
export const OTEL_MODE = process.env.MCP_OTEL_MODE?.toUpperCase() || 'WARNING';
export const DEBUG_MODE = OTEL_MODE === 'DEBUG';