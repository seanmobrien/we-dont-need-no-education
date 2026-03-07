export type TAfterHandler<T = unknown | void> = () => Promise<T>;

export type IAfterManager = {
  add: (queueName: string, handler: TAfterHandler<void>) => boolean;
  remove: (queueName: string, handler: TAfterHandler<void>) => boolean;
  queue: {
    (queueName: string): Array<TAfterHandler<void>>;
    (queueName: string, create: true): Array<TAfterHandler<void>>;
    (queueName: string, create: false): undefined | Array<TAfterHandler<void>>;
  };
  signal: (signalName: string) => Promise<void>;
};
