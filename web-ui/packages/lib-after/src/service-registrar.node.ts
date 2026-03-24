import {
  IServiceRegistrar,
  type IServiceContainer,
  asClass,
  asFunction,
} from '@compliance-theater/types/dependency-injection';

import AfterManager from './after-manager';
import { AppStartupManager } from './app-startup';

export class ServiceRegistrar implements IServiceRegistrar {
   register(container: IServiceContainer): void {
    if (!container.has('after')) {
      container.register('after', asFunction(AfterManager.getInstance));
    }
    if (!container.has('startup')) {
      container.register('startup', asFunction(() => new AppStartupManager()));
    }
  }
}

export default ServiceRegistrar;