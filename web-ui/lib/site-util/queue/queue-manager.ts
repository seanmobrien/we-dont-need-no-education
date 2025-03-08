/**
 * Manages queue instances and provides methods to interact with them.
 *
 * @template T - The type of job data.
 */

import Queue, { Job } from 'bee-queue';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';
import { errorLogFactory } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import {
  BaseJob,
  QueueManager,
  QueueEventEmitter,
  QueueEventHandler,
  QueueEventType,
} from './types';
import { newUuid } from '@/lib/typescript';

const EXIT_PROCESS_TIMEOUT = 30 * 1000;

/**
 * @class QueueManagerInstance
 * The {@link QueueManagerInstance} class implements the {@link QueueManager} interface and provides
 * queue instance management and interaction.
 */
class QueueManagerInstance<T extends BaseJob> implements QueueManager<T> {
  private static queues: { [key: string]: Queue } = {};

  /**
   * Gets an instance of the QueueManager.
   *
   * @template U - The type of job data.
   * @template TResult - The type of the result returned by the processor.
   * @param name - The name of the queue.
   * @param settings - The settings for the queue.
   * @returns A promise that resolves to a QueueManager instance.
   */
  public static getInstance<U extends BaseJob, TResult = unknown>(
    name: string,
    settings: Partial<Queue.QueueSettings> & {
      processor?: (job: Job<U>) => Promise<TResult>;
    } = {}
  ): Promise<QueueManager<U>> {
    return new Promise(async (resolve, reject) => {
      const { processor } = settings ?? {};
      try {
        const ret = new QueueManagerInstance<U>(
          name,
          this.getSettings(settings)
        );
        if (processor) {
          ret.process(processor);
        }
        let timer: NodeJS.Timeout | null = setTimeout(() => {
          timer = null;
          reject(new Error('Queue failed to start'));
        }, 30000);
        await ret.#queue.ready(() => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
            log((l) => l.info({ message: `Queue [${name}] is ready`, name }));
            resolve(ret);
          } else {
            log((l) =>
              l.warn({
                message: `Queue [${name}] signalled ready after timeout elapsed`,
                name,
              })
            );
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Gets the settings for the queue.
   *
   * @param options - The partial settings for the queue.
   * @returns The complete settings for the queue.
   */
  private static getSettings(
    options: Partial<Queue.QueueSettings>
  ): Queue.QueueSettings {
    const ops = { ...(options ?? {}) };
    if ('processor' in ops) {
      delete ops.processor;
    }
    return {
      removeOnFailure: true,
      removeOnSuccess: true,
      redis: {
        password: process.env.REDIS_PASSWORD,
        url: env('REDIS_URL'),
        options: {
          password: env('REDIS_PASSWORD'),
        },
      },
      ...ops,
    };
  }
  /**
   * Sets up event listeners for the queue.
   *
   * @param queue - The queue instance.
   * @param name - The name of the queue.
   */
  private static setupEventListeners(queue: Queue, name: string): void {
    process.on('SIGINT', async () => {
      await QueueManagerInstance.shutdown('attachment-download');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await QueueManagerInstance.shutdown('attachment-download');
      process.exit(0);
    });
    process.on('uncaughtException', async () => {
      // Queue#close is idempotent - no need to guard against duplicate calls.
      try {
        await queue.close(EXIT_PROCESS_TIMEOUT);
      } catch (err) {
        console.error('bee-queue failed to shut down gracefully', err);
      }
    });

    queue
      .on('error', (error) => {
        log((l) =>
          l.error(
            errorLogFactory({
              error,
              source: `Queue [${name}]`,
              queueName: name,
            })
          )
        );
      })
      .on('failed', (job, error) => {
        log((l) =>
          l.warn({
            message: 'Queued job failed',
            source: `Queue [${name}]`,
            job,
            error,
            queueName: name,
          })
        );
      })
      .on('succeeded', (job) => {
        log((l) =>
          l.info({
            message: 'Queued job succeeded',
            source: `Queue [${name}]`,
            job,
            queueName: name,
          })
        );
      })
      .on('retrying', (job, error) => {
        log((l) =>
          l.warn({
            message: 'Queued job retrying',
            source: `Queue [${name}]`,
            job,
            error,
            queueName: name,
          })
        );
      })
      .on('stalled', (job) => {
        log((l) =>
          l.warn({
            message: 'Queued job stalled',
            source: `Queue [${name}]`,
            job,
            queueName: name,
          })
        );
      })
      .on('job progress', (job, progress) => {
        log((l) =>
          l.info({
            message: 'Queued job progress',
            source: `Queue [${name}]`,
            job,
            progress,
            queueName: name,
          })
        );
      })
      .on('job succeeded', (job, result) => {
        log((l) =>
          l.info({
            message: 'Queued job succeeded',
            source: `Queue [${name}]`,
            job,
            result,
            queueName: name,
          })
        );
      })
      .on('job failed', (job, err) => {
        log((l) =>
          l.error({
            message: 'Queued job failed',
            source: `Queue [${name}]`,
            job,
            err,
            queueName: name,
          })
        );
      })
      .on('job retrying', (job, err) => {
        log((l) =>
          l.warn({
            message: 'Queued job retrying',
            source: `Queue [${name}]`,
            job,
            err,
            queueName: name,
          })
        );
      });
  }
  /**
   * Shuts down the queue with the given name.
   *
   * @param name - The name of the queue.
   * @returns A promise that resolves to a boolean indicating whether the shutdown was successful.
   */
  public static async shutdown(name: string): Promise<boolean> {
    const queue = this.queues[name];
    if (!queue) {
      return false;
    }
    try {
      await queue.close(EXIT_PROCESS_TIMEOUT);
      queue.removeAllListeners();
      delete this.queues[name];
      return true;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'queue-utility',
      });
    }
    return false;
  }

  readonly #queue: Queue;

  private constructor(
    name: string,
    settings: Partial<Queue.QueueSettings> = {}
  ) {
    if (!QueueManagerInstance.queues[name]) {
      const queue = new Queue(name, QueueManagerInstance.getSettings(settings));
      QueueManagerInstance.setupEventListeners(queue, name);
      QueueManagerInstance.queues[name] = queue;
    }
    this.#queue = QueueManagerInstance.queues[name];
  }
  /**
   * Registers an event handler for the specified event.
   *
   * @template E - The type of the event.
   * @param event - The event type.
   * @param handler - The event handler.
   * @returns The QueueEventEmitter instance.
   */
  public on<E extends QueueEventType>(
    event: E,
    handler: QueueEventHandler<T, E>
  ): QueueEventEmitter<T> {
    switch (event) {
      case 'ready':
        this.#queue.on('ready', handler);
        break;
      case 'error':
        this.#queue.on('error', handler);
        break;
      case 'succeeded':
        this.#queue.on('succeeded', handler);
        break;
      case 'retrying':
        this.#queue.on(event, handler);
        break;
      case 'failed':
        this.#queue.on(event, handler);
        break;
      case 'stalled':
        this.#queue.on(event, handler);
        break;
      case 'job retrying':
        this.#queue.on(event, handler);
        break;
      case 'job failed':
        this.#queue.on(event, handler);
        break;
      case 'job succeeded':
        this.#queue.on(event, handler);
        break;
      case 'job progress':
        this.#queue.on(event, handler);
        break;
      case 'job failed':
        this.#queue.on(event, handler);
        break;
      case 'job succeeded':
        this.#queue.on(event, handler);
        break;
      default:
        throw new TypeError('unrecognized queue event');
    }
    return this;
  }
  /**
   * Unregisters an event handler for the specified event.
   *
   * @template E - The type of the event.
   * @param event - The event type.
   * @param handler - The event handler.
   * @returns The QueueEventEmitter instance.
   */
  public off<E extends QueueEventType>(
    event: E,
    handler: QueueEventHandler<T, E>
  ): QueueEventEmitter<T> {
    switch (event) {
      case 'ready':
        this.#queue.off('ready', handler);
        break;
      case 'error':
        this.#queue.off('error', handler);
        break;
      case 'succeeded':
        this.#queue.off('succeeded', handler);
        break;
      case 'retrying':
        this.#queue.off(event, handler);
        break;
      case 'failed':
        this.#queue.off(event, handler);
        break;
      case 'stalled':
        this.#queue.off(event, handler);
        break;
      case 'job retrying':
        this.#queue.off(event, handler);
        break;
      case 'job failed':
        this.#queue.off(event, handler);
        break;
      case 'job succeeded':
        this.#queue.off(event, handler);
        break;
      case 'job progress':
        this.#queue.off(event, handler);
        break;
      case 'job failed':
        this.#queue.off(event, handler);
        break;
      case 'job succeeded':
        this.#queue.off(event, handler);
        break;
      default:
        throw new TypeError('unrecognized queue event');
    }
    return this;
  }
  /**
   * Removes all listeners for the specified event.
   *
   * @param event - The event type.
   * @returns The QueueEventEmitter instance.
   */
  public removeAllListeners(event?: QueueEventType) {
    this.#queue.removeAllListeners(event);
    return this;
  }
  /**
   * Submits a job to the queue.
   *
   * @param jobData - The job data.
   * @returns A promise that resolves to the job instance.
   */
  public async submit(jobData: T): Promise<Job<T>> {
    if (!jobData.id) {
      const work = jobData;
      work.id = newUuid();
    }
    const sanitizedJob: Partial<T> = {};
    Object.keys(jobData).forEach((tk) => {
      const key = tk as keyof T;
      if (jobData[key] || typeof jobData[key] === 'string') {
        sanitizedJob[key] = jobData[key];
      }
    });
    return this.#queue
      .createJob(sanitizedJob as T)
      .setId(jobData.id)
      .save();
  }
  /**
   * Processes jobs in the queue using the specified handler.
   *
   * @template TResult - The type of the result returned by the handler.
   * @param handler - The job handler.
   */
  public process<TResult>(handler: (job: Job<T>) => Promise<TResult>): void {
    this.#queue.process(handler);
  }
  /**
   * Retrieves a job by its ID.
   *
   * @param jobId - The ID of the job.
   * @returns A promise that resolves to the job instance or null if not found.
   */
  public async getJob(jobId: string): Promise<Job<T> | null> {
    try {
      const job = await this.#queue.getJob(jobId);
      return job;
    } catch (error) {
      log((l) =>
        l.error(
          errorLogFactory({
            message: `Failed to retrieve job with ID ${jobId}`,
            error,
            source: 'QueueManager',
          })
        )
      );
      return null;
    }
  }
}
/**
 * Factory function to create a QueueManager instance.
 *
 * @template U - The type of job data.
 * @template TResult - The type of the result returned by the processor.
 * @param name - The name of the queue.
 * @param settings - The settings for the queue.
 * @returns A promise that resolves to a QueueManager instance.
 */
export const queueManagerFactory = <U extends BaseJob, TResult = unknown>(
  name: string,
  settings: Partial<Queue.QueueSettings> & {
    processor?: (job: Job<U>) => Promise<TResult>;
  } = {}
): Promise<QueueManager<U>> =>
  QueueManagerInstance.getInstance<U, TResult>(name, settings);

export const shutdown = (name: string): Promise<boolean> =>
  QueueManagerInstance.shutdown(name);
