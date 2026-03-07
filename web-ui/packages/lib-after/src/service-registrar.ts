import { IServiceRegistrar, type IServiceContainer, asFunction, asClass } from '@compliance-theater/types/dependency-injection';
import AfterManager from './after-manager';
import { AppStartupManager } from "./app-startup";

export class ServiceRegistrar implements IServiceRegistrar {
    constructor() { }

    register(container: IServiceContainer): void {
        container.register('after', asFunction(AfterManager.getInstance));
        container.register('start', asClass(AppStartupManager));
    }
}

export default ServiceRegistrar;
