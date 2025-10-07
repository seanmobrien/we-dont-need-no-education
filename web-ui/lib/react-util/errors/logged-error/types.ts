export type LoggedErrorOptions = ErrorOptions & {
  error: Error;
  critical?: boolean;
};

export type TurtleRecursionParams = Record<string, unknown> & {
  log: boolean;
  relog?: boolean;
  source?: string;
  message?: string;
  critical?: boolean;
  logCanceledOperation?: boolean;
};
