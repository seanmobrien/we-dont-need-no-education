import { config } from './common';
import { env } from '@/lib/site-util/env';
import {
  ApplicationInsights,
  DistributedTracingModes,
  ITelemetryItem,
} from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ClickAnalyticsPlugin } from '@microsoft/applicationinsights-clickanalytics-js';
import ClickCallbackProcessor from './click-callback-processor';

const appInsightState = {
  reactPlugin: undefined,
  clickPlugin: undefined,
  appInsightInstance: undefined,
} as {
  reactPlugin?: ReactPlugin;
  clickPlugin?: ClickAnalyticsPlugin;
  appInsightInstance?: ApplicationInsights;
};

const getReactPlugin = (): ReactPlugin => {
  getAppInsights();
  return appInsightState.reactPlugin!;
};

const getClickPlugin = () => {
  getAppInsights();
  return appInsightState.clickPlugin;
};

const getAppInsights = () => {
  if (
    env('NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING') &&
    typeof window !== 'undefined' &&
    (!appInsightState.appInsightInstance ||
      !appInsightState.appInsightInstance?.core?.isInitialized)
  ) {
    appInsightState.clickPlugin ??= new ClickAnalyticsPlugin();
    appInsightState.reactPlugin ??= new ReactPlugin();

    const callback = new ClickCallbackProcessor();

    appInsightState.appInsightInstance ??= new ApplicationInsights({
      config: {
        appId: config.serviceName,
        connectionString: env(
          'NEXT_PUBLIC_AZURE_MONITOR_CONNECTION_STRING',
        ),
        enableDebug: true,
        enableAutoRouteTracking: true,
        enableAjaxErrorStatusText: true,
        enableAjaxPerfTracking: true,
        disableAjaxTracking: false,
        distributedTracingMode: DistributedTracingModes.AI_AND_W3C,
        autoTrackPageVisitTime: true,
        enableUnhandledPromiseRejectionTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        extensions: [appInsightState.reactPlugin, appInsightState.clickPlugin],
        extensionConfig: {
          [appInsightState.reactPlugin.identifier]: { history: null },
          [appInsightState.clickPlugin.identifier]: {
            autoCapture: true, // Enable automatic capture of click events
            contentName: callback.contentName.bind(callback),
            pageName: callback.pageName.bind(callback),
            clickEvents: true, // Enable click events tracking
            dropInvalidEvents: false,
            urlCollectQuery: false,
            useDefaultContentNameOrId: false, // Disable default to force callback usage
          },
        },
      },
    });
    appInsightState.appInsightInstance.loadAppInsights();
      
    const ignoreMessage = ['messageId: 102', '102 message:'];
    const ignoreNames = [
      ...ignoreMessage,
      '/api/auth/session',
      '\\api\\auth\\session',
      '/static/',
      '/_next/',
      '__nextjs_original-stack-frames',
    ];
    
    appInsightState.appInsightInstance.addTelemetryInitializer((envelope: ITelemetryItem) => {

      if (envelope && envelope.baseData && envelope.baseData.name) {
        const lookFor = envelope.baseData.name.toLowerCase();
        if (ignoreNames.findIndex((name) => lookFor.lastIndexOf(name) !== -1) !== -1) {
          return false; // Filter out telemetry items with ignored names
        }
      }
            
      if (envelope.baseType === "ExceptionData") {
        // If the telemetry 'message' field contains any of the strings in ignoreMessage, return false  
        if (envelope.baseData && envelope.baseData.exceptions) {
          const exceptions = envelope.baseData.exceptions;
          for (const exception of exceptions) {
            if (exception.message && ignoreMessage.some(msg => exception.message.includes(msg))) {
              return false;
            }
          }
        }
      }      
      // Pass the telemetry item to the next processor in the chain
      return true; 
    });
    appInsightState.appInsightInstance.addTelemetryInitializer((envelope) => {
      envelope.tags ??= {};
      envelope.tags['ai.cloud.role'] = config.serviceName;
      envelope.tags['ai.cloud.roleInstance'] =
        (`${config.attributes!['service.instance'] ?? 'service-instance'}-browser`).replace("WebUi--undefined", "ObApps.ComplianceTheatre-WebUi");
      envelope.data ??= {};
      envelope.data.baseData ??= {};
      envelope.data.baseData.properties ??= {};
      envelope.data.baseData.properties['service.namespace'] =
        config.attributes['service.namespace'];
      envelope.data.baseData.properties['telemetry.sdk.language'] =
        'javascript';
    });
  }
  return appInsightState.appInsightInstance;
};

export { getAppInsights, getReactPlugin, getClickPlugin };

const instrument = () => {
  console.error(
    'Instrumentation is not supported in the browser environment....Why are we getting here?',
  );
};

export default instrument;
