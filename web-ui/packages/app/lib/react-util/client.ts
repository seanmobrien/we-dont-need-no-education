/**
 * @module react-util/client
 *
 * This module serves as a central point to access various client-centric utility functions used
 * across the React application.
 */
export * from './utility-methods';
export { ValidationError } from '@compliance-theater/logger/errors/validation-error';
export { AggregateError } from '@compliance-theater/logger/errors/aggregate-error';
export { DataIntegrityError } from '@compliance-theater/logger/errors/data-integrity-error';
export {
	isConsoleError,
	type NextConsoleError,
	type NextConsoleErrorType,
} from '@compliance-theater/logger/errors/next-console-error';
export {
	asErrorLike,
	isErrorLike,
	isStringOrErrorLike,
	type AsErrorLikeOptions,
	type ErrorLike,
	type StringOrErrorLike,
} from '@compliance-theater/logger/errors/error-like';
export * from './hooks';
