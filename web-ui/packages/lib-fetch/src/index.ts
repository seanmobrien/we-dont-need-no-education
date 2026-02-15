/**
 * @fileoverview Main entry point for @compliance-theater/fetch package
 *
 * This package provides fetch utilities with configurable behavior for both
 * client-side and server-side environments.
 */

// Export types
export type {
  FetchConfig,
  RequestInfo,
  RequestInit,
  FetchConfigManager,
  FetchConfigManagerFactory,
} from './types';

// Export configuration management
export { SimpleFetchConfigManager } from './fetch-config';
export {
  getFetchConfigFactory,
  setFetchConfigFactory,
} from './fetch-config-factory';

// Export client-side fetch
export { fetch as clientFetch } from './client-fetch';
