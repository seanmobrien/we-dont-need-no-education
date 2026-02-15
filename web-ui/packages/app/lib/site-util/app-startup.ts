import { createStartupAccessors } from '@compliance-theater/after';

/**
 * Application-specific startup configuration.
 * The AppStartup class will discover and call initAppStartup exports
 * from the configured modules during initialization.
 */
const { startup, state, getInstance } = createStartupAccessors({
  initializerModules: [
    '@/lib/react-util/errors/logged-error-reporter/init',
    '@/lib/ai/aiModelFactory/init',
  ],
  singletonKey: '@noeducation/site-util/appstartup',
});

/**
 * Performs any necessary startup initialization.
 * @returns The current state of the app startup process.
 */
export { startup, state };

/**
 * Re-export types for compatibility
 */
export type { AppStartupState } from '@compliance-theater/after';
