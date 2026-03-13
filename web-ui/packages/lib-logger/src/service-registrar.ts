import type {
  IServiceContainer,
  IServiceRegistrar,
} from '@compliance-theater/types/dependency-injection';

const loadRegistrar = (): IServiceRegistrar => {
  const isNodeRuntime = process.env.NEXTJS_RUNTIME === 'node'
    || (typeof process !== 'undefined' && !!process.versions?.node);

  const modulePath = isNodeRuntime
    ? './service-registrar.node'
    : './service-registrar.browser';

  const registrarModule = require(modulePath) as {
    ServiceRegistrar: new () => IServiceRegistrar;
  };

  return new registrarModule.ServiceRegistrar();
};

export class ServiceRegistrar implements IServiceRegistrar {
  readonly #registrar = loadRegistrar();

  register(container: IServiceContainer): void {
    this.#registrar.register(container);
  }
}

export default ServiceRegistrar;