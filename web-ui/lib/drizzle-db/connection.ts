import { drizzle } from 'drizzle-orm/postgres-js';
import schema, { DbDatabaseType } from './schema';
import { isPromise } from "@/lib/typescript"

export { schema };

let _drizDbPromise: Promise<DbDatabaseType> | undefined;
let _drizDb: DbDatabaseType | undefined;

export const drizDbWithInit = async () => {
  if (_drizDb !== undefined) {
    return _drizDb;
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
          })));
      return theDb;
    })();
    _drizDbPromise.then(
      (value) => (_drizDb = value),
      () => (_drizDbPromise = undefined),
    );
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
    throw new Error('Drizzle DB is being initialized; please try your call again later.', { 
      cause: {
        code: 'DB_INITIALIZING',
        retry: true,
        enqueue: _drizDbPromise!.then
      }
    });
  };


