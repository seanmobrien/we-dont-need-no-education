import { IServiceRegistrar, type IServiceContainer, asFunction, asClass } from '@compliance-theater/types/dependency-injection';

export class ServiceRegistrar implements IServiceRegistrar {
  constructor() { }

  register(container: IServiceContainer): void {
    if (process.env.NEXTJS_RUNTIME === 'node') {
      const AfterManager = require('./after-manager');
      container.register('after', asFunction(AfterManager.getInstance));
      const { AppStartupManager } = require("./app-startup");
      container.register('start', asClass(AppStartupManager));
    } else {
      const { NoopAfterManager, NoopAppStartupManager } = require('./noop-implementations');
      container.register('after', asFunction(NoopAfterManager));
      container.register('start', asFunction(NoopAppStartupManager));
    }
  }
}

export default ServiceRegistrar;
