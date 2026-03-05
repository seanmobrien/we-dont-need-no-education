/* global setTimeout */

import { env } from '@compliance-theater/env';
import { LoggedError } from '@compliance-theater/logger';
import type { PostgresSql } from './postgres';
import AfterManager from '@compliance-theater/after';

type TPgDbRecordType = Record<string, unknown>;

export class PgDbDriver<TQueryRecord> {
  static Instance<TRecord>(): PgDbDriver<TRecord> {
    const GLOBAL_KEY = Symbol.for('@noeducation/neondb:PgDbDriver');
    const registry = globalThis as unknown as {
      [key: symbol]: PgDbDriver<TPgDbRecordType> | undefined;
    };
    if (!registry[GLOBAL_KEY]) {
      registry[GLOBAL_KEY] = new PgDbDriver();
    }
    return registry[GLOBAL_KEY] as unknown as PgDbDriver<TRecord>;
  }
  static async teardown(): Promise<void> {
    const GLOBAL_KEY = Symbol.for('@noeducation/neondb:PgDbDriver');
    const registry = globalThis as unknown as {
      [key: symbol]: PgDbDriver<TPgDbRecordType> | undefined;
    };
    const myInstance = registry[GLOBAL_KEY];
    if (myInstance) {
      await Promise.race([
        myInstance.#sql ? myInstance.#sql.end() : Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 6000)),
      ]);
      if (myInstance === registry[GLOBAL_KEY]) {
        registry[GLOBAL_KEY] = undefined;
      }
    }
    AfterManager.getInstance().remove('teardown', PgDbDriver.teardown);
  }

  #sql: PostgresSql<any> | undefined;
  readonly #theSqlThatWasPromised: Promise<PostgresSql<any>>;
  private constructor() {
    this.#theSqlThatWasPromised = new Promise<PostgresSql<any>>(
      (resolve, reject) => {
        AfterManager.getInstance().add('teardown', PgDbDriver.teardown);
        import('postgres')
            .then((x) => x.default)
            .then((postgres) => {
              const db = postgres(env('DATABASE_URL'), {
                ssl: 'verify-full',
                max: 3,
                debug: true,
              });
              return db;
            })
            .then((sql) => {
              this.#sql = sql as unknown as PostgresSql<any>;
              resolve(this.#sql);
            })
            .catch((error) => {
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
              const GLOBAL_KEY = Symbol.for('@noeducation/neondb:PgDbDriver');
              const registry = globalThis as unknown as {
                [key: symbol]: PgDbDriver<TPgDbRecordType> | undefined;
              };
              registry[GLOBAL_KEY] = undefined;
            });
      },
    );
  }
  public getDb(): Promise<PostgresSql<TQueryRecord>> {
    return this.#theSqlThatWasPromised.then(
      (x) => x as PostgresSql<TQueryRecord>,
    );
  }
  public db(): PostgresSql<TQueryRecord> {
    if (!this.#sql) {
      throw new Error(
        'Postgres DB is not initialized yet. Use getDb for async callbacks.',
      );
    }
    return this.#sql;
  }
}

export const pgDbWithInit = async <TRecord = any>() =>
  PgDbDriver.Instance<TRecord>().getDb();

export const pgDb = <TRecord = any>() => PgDbDriver.Instance<TRecord>().db();
