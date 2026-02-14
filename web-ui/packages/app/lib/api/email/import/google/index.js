import { apiRequestHelperFactory } from '@compliance-theater/send-api-request';
import siteMap from '@/lib/site-util/url-builder';
const apiRequest = (cb) => {
    const apiHelper = apiRequestHelperFactory({ area: 'email/import/google' });
    const builder = siteMap.api.email.import.google;
    return cb(apiHelper, builder);
};
export const searchEmails = ({ from, to, label, page = 1, limit = 100, }, params) => {
    if (from === 'm.sean.o@gmail.com') {
        to = '@plsas.org';
    }
    return apiRequest((api, builder) => api.get({
        url: builder.search({
            from,
            to,
            label,
            page,
            limit,
        }),
        action: 'search',
    }, params));
};
export const loadEmail = (emailId, params) => apiRequest((api, builder) => api.get({
    url: builder.page('message', emailId),
    action: 'load',
}, params));
export const queueEmailImport = (emailId, params) => apiRequest((api, builder) => {
    return api.post({
        url: builder.page('message', emailId),
        action: 'queue',
        input: {},
    }, params);
});
export const createStagingRecord = (emailId, params) => apiRequest((api, builder) => api.put({
    url: builder.message.page(emailId),
    action: 'stage',
    input: {},
}, params));
export const importEmailRecord = (emailId, params) => apiRequest((api, builder) => api.post({
    url: builder.message.page(emailId),
    action: 'import',
    input: {},
}, params));
export const queryImportStatus = (emailId, params) => apiRequest((api, builder) => api.get({
    url: builder.child('message', emailId).page('status'),
    action: 'status',
}, params));
//# sourceMappingURL=index.js.map