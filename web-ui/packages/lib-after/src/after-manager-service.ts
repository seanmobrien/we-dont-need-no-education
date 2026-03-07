import type { IAfterManager, TAfterHandler } from '@compliance-theater/types/after';
import AfterManager from './after-manager';

export class AfterManagerService implements IAfterManager {
  readonly #manager: IAfterManager | undefined;

  get manager(): IAfterManager {
    return this.#manager ?? AfterManager.getInstance();
  }

  constructor(manager?: IAfterManager) {
    this.#manager = manager;
  }

  add(queueName: string, handler: TAfterHandler<void>): boolean {
    return this.manager.add(queueName, handler);
  }

  remove(queueName: string, handler: TAfterHandler<void>): boolean {
    return this.manager.remove(queueName, handler);
  }

  queue(queueName: string): Array<TAfterHandler<void>>;
  queue(queueName: string, create: true): Array<TAfterHandler<void>>;
  queue(
    queueName: string,
    create: false,
  ): undefined | Array<TAfterHandler<void>>;
  queue(
    queueName: string,
    create: boolean = false,
  ): undefined | Array<TAfterHandler<void>> {
    if (create) {
      return this.manager.queue(queueName, true);
    }
    return this.manager.queue(queueName, false);
  }

  signal(signalName: string): Promise<void> {
    return this.manager.signal(signalName);
  }
}
