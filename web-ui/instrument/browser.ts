import { config } from './common';
import { env } from '@/lib/site-util/env';
import {
  ApplicationInsights,
  DistributedTracingModes,
} from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ClickAnalyticsPlugin } from '@microsoft/applicationinsights-clickanalytics-js';

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
    env('NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING') &&
    typeof window !== 'undefined' &&
    (!appInsightState.appInsightInstance ||
      !appInsightState.appInsightInstance?.core?.isInitialized)
  ) {
    appInsightState.clickPlugin ??= new ClickAnalyticsPlugin();
    appInsightState.reactPlugin ??= new ReactPlugin();

    appInsightState.appInsightInstance ??= new ApplicationInsights({
      config: {
        appId: config.serviceName,
        connectionString: env(
          'NEXT_PUBLIC_AZURE_APPLICATIONINSIGHTS_CONNECTION_STRING',
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
            clickEvents: true, // Enable click events tracking
            dropInvalidEvents: false,
            urlCollectQuery: false,
            customDataPrefix: 'data-ai-',
            useDefaultContentNameOrId: true, // Allow using standard HTML attributes for contentName and id
          },
        },
      },
    });
    appInsightState.appInsightInstance.loadAppInsights();
    appInsightState.appInsightInstance.addTelemetryInitializer((envelope) => {
      envelope.tags ??= {};
      envelope.tags['ai.cloud.role'] = config.serviceName;
      envelope.tags['ai.cloud.roleInstance'] =
        `${config.attributes!['service.instance'] ?? 'service-instance'}-browser`;
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
