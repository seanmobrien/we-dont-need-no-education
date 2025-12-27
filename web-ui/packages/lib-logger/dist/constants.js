export const AzureMonitorSampleRate = 'microsoft.sample_rate';
export const ApplicationInsightsBaseType = '_MS.baseType';
export const ApplicationInsightsCustomEventName = 'microsoft.custom_event.name';
export const ApplicationInsightsMessageName = 'Microsoft.ApplicationInsights.Message';
export const ApplicationInsightsExceptionName = 'Microsoft.ApplicationInsights.Exception';
export const ApplicationInsightsPageViewName = 'Microsoft.ApplicationInsights.PageView';
export const ApplicationInsightsAvailabilityName = 'Microsoft.ApplicationInsights.Availability';
export const ApplicationInsightsEventName = 'Microsoft.ApplicationInsights.Event';
export const ApplicationInsightsMessageBaseType = 'MessageData';
export const ApplicationInsightsExceptionBaseType = 'ExceptionData';
export const ApplicationInsightsPageViewBaseType = 'PageViewData';
export const ApplicationInsightsAvailabilityBaseType = 'AvailabilityData';
export const ApplicationInsightsEventBaseType = 'EventData';
export const ATTR_EXCEPTION_MESSAGE = 'exception.message';
export const ATTR_EXCEPTION_STACKTRACE = 'exception.stacktrace';
export const ATTR_EXCEPTION_TYPE = 'exception.type';
export var KnownSeverityLevel;
(function (KnownSeverityLevel) {
    KnownSeverityLevel["Verbose"] = "Verbose";
    KnownSeverityLevel["Information"] = "Information";
    KnownSeverityLevel["Warning"] = "Warning";
    KnownSeverityLevel["Error"] = "Error";
    KnownSeverityLevel["Critical"] = "Critical";
})(KnownSeverityLevel || (KnownSeverityLevel = {}));
export const asKnownSeverityLevel = (input) => {
    if (typeof input === 'number') {
        if (input < 5) {
            switch (input) {
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
};
