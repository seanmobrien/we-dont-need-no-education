export const AzureMonitorSampleRate = 'microsoft.sample_rate';
export const ApplicationInsightsBaseType = '_MS.baseType';
export const ApplicationInsightsCustomEventName = 'microsoft.custom_event.name';
export const ApplicationInsightsMessageName =
  'Microsoft.ApplicationInsights.Message';
export const ApplicationInsightsExceptionName =
  'Microsoft.ApplicationInsights.Exception';
export const ApplicationInsightsPageViewName =
  'Microsoft.ApplicationInsights.PageView';
export const ApplicationInsightsAvailabilityName =
  'Microsoft.ApplicationInsights.Availability';
export const ApplicationInsightsEventName =
  'Microsoft.ApplicationInsights.Event';
export const ApplicationInsightsMessageBaseType = 'MessageData';
export const ApplicationInsightsExceptionBaseType = 'ExceptionData';
export const ApplicationInsightsPageViewBaseType = 'PageViewData';
export const ApplicationInsightsAvailabilityBaseType = 'AvailabilityData';
export const ApplicationInsightsEventBaseType = 'EventData';
/**
 * The exception message.
 *
 * @example Division by zero
 * @example Can't convert 'int' object to str implicitly
 */
export const ATTR_EXCEPTION_MESSAGE = 'exception.message';
/**
 * A stacktrace as a string in the natural representation for the language runtime. The representation is to be determined and documented by each language SIG.
 *
 * @example "Exception in thread "main" java.lang.RuntimeException: Test exception\\n at com.example.GenerateTrace.methodB(GenerateTrace.java:13)\\n at com.example.GenerateTrace.methodA(GenerateTrace.java:9)\\n at com.example.GenerateTrace.main(GenerateTrace.java:5)\\n"
 */
export const ATTR_EXCEPTION_STACKTRACE = 'exception.stacktrace';
/**
 * The type of the exception (its fully-qualified class name, if applicable). The dynamic type of the exception should be preferred over the static type in languages that support it.
 *
 * @example java.net.ConnectException
 * @example OSError
 */
export const ATTR_EXCEPTION_TYPE = 'exception.type';
export enum KnownSeverityLevel {
  /** Verbose */
  Verbose = 'Verbose',
  /** Information */
  Information = 'Information',
  /** Warning */
  Warning = 'Warning',
  /** Error */
  Error = 'Error',
  /** Critical */
  Critical = 'Critical',
}
export const asKnownSeverityLevel = (input: unknown): KnownSeverityLevel => {
  if (typeof input === 'number') {
    if (input < 5){
      switch(input) {
        case 0:
          return KnownSeverityLevel.Verbose;
        case 1:
          return KnownSeverityLevel.Information;
        case 2:
          return KnownSeverityLevel.Warning;
        case 3:
          return KnownSeverityLevel.Error;
        case 4:
          return KnownSeverityLevel.Critical;
      }
    }
    if (input === 0) {
      return KnownSeverityLevel.Verbose;
    }
    if (input < 10) {
      return KnownSeverityLevel.Information;
    }
    if (input < 20) {
      return KnownSeverityLevel.Warning;
    }
    if (input < 30) {
      return KnownSeverityLevel.Error;
    }
    if (input < 40) {
      return KnownSeverityLevel.Critical;
    }      
    return KnownSeverityLevel.Error;
  }
  switch (String(input ?? '').toLocaleLowerCase()) {
    case 'verbose':
      return KnownSeverityLevel.Verbose;
    case 'information':
      return KnownSeverityLevel.Information;
    case 'warning':
      return KnownSeverityLevel.Warning;
    case 'error':
      return KnownSeverityLevel.Error;
    case 'critical':
      return KnownSeverityLevel.Critical;
  }
  return KnownSeverityLevel.Error;
}