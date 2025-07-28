import dynamic from 'next/dynamic';
import type { ClientErrorManagerConfig } from './ClientErrorManager';

/**
 * Server-safe error manager that can be imported into server components
 * without causing them to become client components
 */
const ServerSafeErrorManager = dynamic(
  () => import('./ErrorManagerProvider').then(mod => ({ 
    default: mod.DefaultErrorManager 
  })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * Server-safe error manager with custom configuration
 */
const ConfigurableServerSafeErrorManager = dynamic(
  () => import('./ErrorManagerProvider').then(mod => ({ 
    default: mod.ErrorManagerProvider 
  })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * Development-specific error manager (shows more details)
 */
const DevServerSafeErrorManager = dynamic(
  () => import('./ErrorManagerProvider').then(mod => ({ 
    default: mod.DevErrorManager 
  })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * Production-specific error manager (more conservative)
 */
const ProdServerSafeErrorManager = dynamic(
  () => import('./ErrorManagerProvider').then(mod => ({ 
    default: mod.ProdErrorManager 
  })),
  {
    ssr: false,
    loading: () => null,
  }
);

// Default export for easy importing
export default ServerSafeErrorManager;

// Named exports for specific configurations
export { 
  ConfigurableServerSafeErrorManager as ConfigurableErrorManager,
  DevServerSafeErrorManager as DevErrorManager,
  ProdServerSafeErrorManager as ProdErrorManager,
};

// Export config type for TypeScript
export type { ClientErrorManagerConfig as ErrorManagerConfig };