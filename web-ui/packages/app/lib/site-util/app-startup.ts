import { createStartupAccessors } from '@compliance-theater/after/app-startup';
import { state } from '@compliance-theater/after/app-startup-state';
import { configureAppStartupAccessor } from '@compliance-theater/nextjs/server/app-startup-accessor';

/**
 * Application-specific startup configuration.
 * The AppStartup class will discover and call initAppStartup exports
 * from the configured modules during initialization.
 */
const { startup } = createStartupAccessors({
  initializerModules: [
    '@compliance-theater/logger/errors/logged-error-reporter/init',
    '@/lib/ai/aiModelFactory/init',
  ],
  singletonKey: '@noeducation/site-util/appstartup',
});
configureAppStartupAccessor(startup);

/**
 * Performs any necessary startup initialization.
 * @returns The current state of the app startup process.
 */
export { startup, state };

/**
 * Re-export types for compatibility
 */
export type { AppStartupState } from '@compliance-theater/after/app-startup-state';
