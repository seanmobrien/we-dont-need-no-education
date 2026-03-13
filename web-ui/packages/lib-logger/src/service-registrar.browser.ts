import {
  IServiceRegistrar,
  type IServiceContainer,
  asValue,
} from '@compliance-theater/types/dependency-injection';

import { singletonProviderFactory } from './singleton-provider';

export class ServiceRegistrar implements IServiceRegistrar {
  register(container: IServiceContainer): void {
    if (container.has('singleton')) {
      return;
    }

    const singletonProvider = singletonProviderFactory();
    if (!singletonProvider) {
      throw new Error('Singleton provider is not available');
    }

    container.register('singleton', asValue(singletonProvider));
  }
}

export default ServiceRegistrar;