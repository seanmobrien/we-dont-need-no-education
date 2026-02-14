import siteMap from '@/lib/site-util/url-builder';
import { apiRequestHelperFactory, } from '@compliance-theater/send-api-request';
const apiRequest = (cb) => {
    const apiHelper = apiRequestHelperFactory({ area: 'email/properties' });
    const builder = siteMap.api.email.properties;
    return cb(apiHelper, builder);
};
const listPropertyRequest = ({ api, page, num, emailId, }) => apiRequest((apiHelper, builder) => {
    const b = builder(emailId)[api];
    return apiHelper.get({
        url: b({ page, num }),
        action: 'list',
    });
});
export const getEmailHeaders = (props) => listPropertyRequest({ ...props, api: 'emailHeader' });
export const getKeyPoints = (props) => listPropertyRequest({ ...props, api: 'keyPoints' });
export const getCallToAction = (props) => listPropertyRequest({ ...props, api: 'callToAction' });
export const getCallToActionResponse = (props) => listPropertyRequest({
    ...props,
    api: 'callToActionResponse',
});
export const getComplianceScores = (props) => listPropertyRequest({
    ...props,
    api: 'complianceScores',
});
export const getSentimentAnalysis = (props) => listPropertyRequest({
    ...props,
    api: 'sentimentAnalysis',
});
export const getViolationDetails = (props) => listPropertyRequest({ ...props, api: 'violationDetails' });
export const getNotes = (props) => listPropertyRequest({ ...props, api: 'notes' });
//# sourceMappingURL=client.js.map