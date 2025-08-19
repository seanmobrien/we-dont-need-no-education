import { isError } from "../react-util/_utility-methods";
import { drizDbWithInit } from "./connection";
import { DbDatabaseType } from "./schema"; 

export class NotReadyError extends Error {
  
  constructor(message?: string) {
    super(
      message ??
        'Drizzle DB is being initialized; please try your call again later.',
      {
        cause: {
          code: 'DB_INITIALIZING',
          retry: true,
        },
      },
    );
    this.name = 'NotReadyError';
  }

  enqueue(cb: (db: DbDatabaseType) => void) {
    return drizDbWithInit().then(cb);
  }
}

export const isNotReadyError = (error: unknown): error is NotReadyError => {
  return (
    error instanceof NotReadyError ||
    (isError(error) && (error.cause as { code: string; })?.code === 'DB_INITIALIZING')
  );
};
