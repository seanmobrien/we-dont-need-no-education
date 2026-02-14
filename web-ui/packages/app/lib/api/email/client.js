import siteMap from '@/lib/site-util/url-builder';
import { apiRequestHelperFactory, } from '@compliance-theater/send-api-request';
const apiRequest = (cb) => {
    const apiHelper = apiRequestHelperFactory({ area: 'email' });
    const builder = siteMap.api.email;
    return cb(apiHelper, builder);
};
export const getEmailList = ({ page, num, }) => apiRequest((apiHelper, builder) => apiHelper.get({
    url: builder.page({ page, num }),
    action: 'list',
}));
export const getEmail = (id) => apiRequest((apiHelper, builder) => apiHelper.get({
    url: builder.page(id),
    action: 'load',
}));
export const createEmailRecord = (email) => apiRequest((apiHelper, builder) => apiHelper.post({
    url: builder.page(),
    action: 'create',
    input: email,
}));
export const updateEmailRecord = (email) => apiRequest((apiHelper, builder) => apiHelper.put({
    url: builder.page(),
    action: 'update',
    input: email,
}));
export const writeEmailRecord = (email) => email.emailId ?? 0 > 0
    ? updateEmailRecord(email)
    : createEmailRecord(email);
export const deleteEmailRecord = (id) => apiRequest((apiHelper, builder) => apiHelper.delete({
    url: builder.page(id),
    action: 'delete',
}));
export const getEmailStats = () => apiRequest((apiHelper, builder) => apiHelper.get({
    url: builder.stats(),
    action: 'stats',
}));
export const getEmailSearchResults = (ops) => apiRequest((apiHelper, builder) => apiHelper.get({
    url: builder.search(ops),
    action: 'search',
}));
//# sourceMappingURL=client.js.map