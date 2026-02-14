import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ClickAnalyticsPlugin } from '@microsoft/applicationinsights-clickanalytics-js';
declare const getReactPlugin: () => ReactPlugin;
declare const getClickPlugin: () => ClickAnalyticsPlugin | undefined;
declare const getAppInsights: () => ApplicationInsights | undefined;
export { getAppInsights, getReactPlugin, getClickPlugin };
declare const instrument: () => Promise<undefined>;
export default instrument;
//# sourceMappingURL=browser.d.ts.map