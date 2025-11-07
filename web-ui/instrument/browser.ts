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
  initializersAdded: false, // guard against duplicate registration
} as {
  reactPlugin?: ReactPlugin;
  clickPlugin?: ClickAnalyticsPlugin;
  appInsightInstance?: ApplicationInsights;
  initializersAdded: boolean;
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
    env('AZURE_MONITOR_CONNECTION_STRING') &&
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
        connectionString: env('AZURE_MONITOR_CONNECTION_STRING'),
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
            autoCapture: true,
            contentName: callback.contentName.bind(callback),
            pageName: callback.pageName.bind(callback),
            clickEvents: true,
            dropInvalidEvents: false,
            urlCollectQuery: false,
            useDefaultContentNameOrId: false,
          },
        },
      },
    });
    appInsightState.appInsightInstance.loadAppInsights();

    // Add telemetry initializers once
    if (!appInsightState.initializersAdded) {
      const ignoreMessage = ['messageId: 102', '102 message:'];
      const ignoreNames = [
        ...ignoreMessage,
        '/api/auth/session',
        '\\api\\auth\\session',
        '/static/',
        '/_next/',
        '__nextjs_original-stack-frames',
      ];

      appInsightState.appInsightInstance.addTelemetryInitializer(
        (envelope: ITelemetryItem) => {
          if (envelope?.baseData?.name) {
            const lookFor = envelope.baseData.name.toLowerCase();
            if (
              ignoreNames.findIndex(
                (name) => lookFor.lastIndexOf(name) !== -1,
              ) !== -1
            ) {
              return false;
            }
          }

          if (envelope.baseType === 'ExceptionData') {
            const exceptions =
              envelope.baseData && envelope.baseData.exceptions;
            if (exceptions) {
              for (const exception of exceptions) {
                if (
                  exception.message &&
                  ignoreMessage.some((msg) => exception.message.includes(msg))
                ) {
                  return false;
                }
              }
            }
          }

          if (JSON.stringify(envelope).includes('/health')) {
            return false;
          }
          return true;
        },
      );

      appInsightState.appInsightInstance.addTelemetryInitializer((envelope) => {
        envelope.tags ??= {};
        envelope.tags['ai.cloud.role'] = config.serviceName;
        envelope.tags['ai.cloud.roleInstance'] =
          `${config.attributes!['service.instance'] ?? 'service-instance'}-browser`.replace(
            'WebUi--undefined',
            'ObApps.ComplianceTheatre-WebUi',
          );
        envelope.data ??= {};
        envelope.data.baseData ??= {};
        envelope.data.baseData.properties ??= {};
        envelope.data.baseData.properties['service.instance'] =
          envelope.tags['ai.cloud.roleInstance'];
        envelope.data.baseData.properties['service.namespace'] =
          config.attributes['service.namespace'];
        envelope.data.baseData.properties['telemetry.sdk.language'] =
          'javascript';
      });

      appInsightState.initializersAdded = true;
    }
  }
  return appInsightState.appInsightInstance;
};

export { getAppInsights, getReactPlugin, getClickPlugin };

const instrument = () => {
  console.log(
    'Instrumentation is not supported in the browser environment....nothing to do.',
  );
  return Promise.resolve(void 0);
};

export default instrument;
