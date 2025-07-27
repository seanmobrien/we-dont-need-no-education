import { env } from '@/lib/site-util/env';
import { LoggedError } from '../react-util/errors/logged-error';
import type { PostgresSql } from './postgres';
import AfterManager from '../site-util/after';

type TPgDbRecordType = Record<string, unknown>;

class PgDbDriver<TQueryRecord extends TPgDbRecordType> {
  static #instance: PgDbDriver<TPgDbRecordType> | undefined;
  static Instance<TRecord extends TPgDbRecordType>(): PgDbDriver<TRecord> {
    if (this.#instance) {
      return this.#instance as unknown as PgDbDriver<TRecord>;
    }
    this.#instance = new PgDbDriver();
    return this.#instance as unknown as PgDbDriver<TRecord>;
  }
  static async teardown(): Promise<void> {
    const myInstance = PgDbDriver.#instance;
    if (myInstance) {
      await Promise.race([
        myInstance.#sql ? myInstance.#sql.end() : Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ]);
      if (myInstance == PgDbDriver.#instance) {
        PgDbDriver.#instance = undefined;
      }
    }
    AfterManager.getInstance().remove('teardown', PgDbDriver.teardown);
  }

  #sql: PostgresSql | undefined;
  readonly #theSqlThatWasPromised: Promise<PostgresSql>;
  private constructor() {
    this.#theSqlThatWasPromised = new Promise<PostgresSql>(
      async (resolve, reject) => {
        AfterManager.getInstance().add('teardown', PgDbDriver.teardown);
        try {
          const sql = await import('postgres')
            .then((x) => x.default)
            .then((postgres) => {
              const db = postgres(env('DATABASE_URL'), {
                ssl: 'verify-full',
                max: 3,
                debug: true,
              });
              return db;
            });
          this.#sql = sql as unknown as PostgresSql;
          resolve(this.#sql);
        } catch (error) {
          // If we fail to initialize the database, we should reject the promise
          // and log the error for observability.
          reject(
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              message: 'Error initializing Postgres DB',
              extra: {
                cause: error,
              },
              source: 'PgDbDriver constructor',
              critical: true,
            }),
          );
          PgDbDriver.#instance = undefined;
        }
      },
    );
  }
  public getDb(): Promise<PostgresSql<TQueryRecord>> {
    return this.#theSqlThatWasPromised.then(
      (x) => x as PostgresSql<TQueryRecord>,
    );
  }
  public db(): PostgresSql {
    if (!this.#sql) {
      throw new Error(
        'Postgres DB is not initialized yet. Use getDb for async callbacks.',
      );
    }
    return this.#sql;
  }
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pgDbWithInit = async <TRecord extends Record<string, unknown> = any>() =>
  PgDbDriver.Instance<TRecord>().getDb();;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pgDb = <TRecord extends Record<string, unknown> = any>() =>
  PgDbDriver.Instance<TRecord>().db();

