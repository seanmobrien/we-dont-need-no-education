export type { LoggedErrorOptions, TurtleRecursionParams } from './types';

export { LoggedError, dumpError } from './logged-error-class';

// re-export isAbortError guard for convenience
export { isAbortError } from '../../utility-methods';
