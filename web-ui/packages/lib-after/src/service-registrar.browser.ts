import {
  IServiceRegistrar,
  type IServiceContainer,
  asFunction,
} from '@compliance-theater/types/dependency-injection';

import {
  NoopAfterManager,
  NoopAppStartupManager,
} from './noop-implementations';

export class ServiceRegistrar implements IServiceRegistrar {
  register(container: IServiceContainer): void {
    if (!container.has('after')) {
      container.register('after', asFunction(NoopAfterManager));
    }
    if (!container.has('startup')) {
      container.register('startup', asFunction(NoopAppStartupManager));
    }
  }
}

export default ServiceRegistrar;