import { drizzle } from 'drizzle-orm/postgres-js';
import schema, { DbDatabaseType } from './schema';
import { isPromise } from "@/lib/typescript"
import { LoggedError } from '../react-util';

export { schema };

let _drizDbPromise: Promise<DbDatabaseType> | undefined;
let _drizDb: DbDatabaseType | undefined;

export const drizDbWithInit = async () => {
  if (!!_drizDb) {
    return Promise.resolve(_drizDb);
  }
  if (!_drizDbPromise) {
    _drizDbPromise = (async () => {
      const pgDbWithInit = await (import('../neondb/connection').then(
        (x) => x.pgDbWithInit,
      ));
      const theDb = (await pgDbWithInit()
        .then((sql) => drizzle({
            client: sql,
            casing: 'snake_case',
            schema,
          })).then((value) => {
            _drizDb = value;
            return value;
          }));
      return theDb;
    })();
    _drizDbPromise.catch(      
      (err) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          message: 'Error initializing Drizzle DB',
          extra: {
            cause: err,
          },
          source: 'drizDbWithInit',
        });
        _drizDbPromise = undefined; // Reset promise on error
        throw le;
      });
  }
  return _drizDbPromise;
};

interface DrizDbOverloads {
  (): DbDatabaseType;  
  <T>(fn: (driz: DbDatabaseType) => T): T extends Promise<infer R> ? Promise<R> : Promise<T>;  
}

export const drizDb: DrizDbOverloads = 
  <T>(fn?: (driz: DbDatabaseType) => T) => {
    if (_drizDb) {
      if (fn) {
        const fnRet = fn(_drizDb);
        return isPromise(fnRet) ? fnRet : Promise.resolve(fnRet);        
      }
      return _drizDb;
    }
    // Queue up intialization if not already, otherwise get a promise
    // we can tack onto enqueue
    const dbWithInit = drizDbWithInit();
    dbWithInit.catch((err) => {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        message: 'Error initializing Drizzle DB',
        extra: {
          cause: err,
        },
        source: 'drizDb initialize',
      });
      return Promise.resolve();
    });
    throw new Error(
      'Drizzle DB is being initialized; please try your call again later.',
      {
        cause: {
          code: 'DB_INITIALIZING',
          retry: true,
          enqueue: dbWithInit.then,
        },
      },
    );
  };


