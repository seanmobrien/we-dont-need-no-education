/**
 * Logger constants and known severity levels
 * @module @/lib/logger/constants
 */

declare module '@/lib/logger/constants' {
  /**
   * Azure Monitor sample rate attribute key
   */
  export const AzureMonitorSampleRate: string;

  /**
   * Application Insights base type key
   */
  export const ApplicationInsightsBaseType: string;

  export const ApplicationInsightsCustomEventName: string;
  export const ApplicationInsightsMessageName: string;
  export const ApplicationInsightsExceptionName: string;

  export const ApplicationInsightsPageViewName: string;
  export const ApplicationInsightsAvailabilityName: string;
  export const ApplicationInsightsEventName: string;
  export const ApplicationInsightsMessageBaseType: string;
  export const ApplicationInsightsExceptionBaseType: string;
  export const ApplicationInsightsPageViewBaseType: string;
  export const ApplicationInsightsAvailabilityBaseType: string;
  export const ApplicationInsightsEventBaseType: string;

  /**
   * The exception message.
   *
   * @example Division by zero
   * @example Can't convert 'int' object to str implicitly
   */
  export const ATTR_EXCEPTION_MESSAGE: string;

  /**
   * A stacktrace as a string in the natural representation for the language runtime.
   * The representation is to be determined and documented by each language SIG.
   */
  export const ATTR_EXCEPTION_STACKTRACE: string;

  /**
   * The type of the exception (its fully-qualified class name, if applicable).
   * The dynamic type of the exception should be preferred over the static type in languages that support it.
   *
   * @example java.net.ConnectException
   * @example OSError
   */
  export const ATTR_EXCEPTION_TYPE: string;

  /**
   * Known severity levels for logging.
   */
  export enum KnownSeverityLevel {
    Verbose = 'Verbose',
    Information = 'Information',
    Warning = 'Warning',
    Error = 'Error',
    Critical = 'Critical',
  }

  /**
   * Converts an input to a KnownSeverityLevel.
   * Accepts numeric or string representations and maps to a KnownSeverityLevel.
   */
  export const asKnownSeverityLevel: (input: unknown) => KnownSeverityLevel;
}
