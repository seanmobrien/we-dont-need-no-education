import { UrlBuilder } from './_impl';
export const mappedPageOverloadFactory = (builder, page) => {
    const ret = (slug, params) => {
        if (typeof slug === 'object') {
            return builder.page(page, slug).pathname;
        }
        else if (typeof slug === 'string' || typeof slug === 'number') {
            return builder.page(page, slug, params).pathname;
        }
        else {
            return builder.page(page, params).pathname;
        }
    };
    return ret;
};
export const mappedUrlBuilderFactory = () => {
    const ret = new UrlBuilder({
        parent: null,
        segment: '',
    });
    ret.api = ret.child('api');
    ret.api.attachment = ret.child('attachment');
    ret.api.contact = mappedPageOverloadFactory(ret.api, 'contact');
    ret.api.documentUnit = mappedPageOverloadFactory(ret.api, 'document-unit');
    ret.api.email = ret.api.child('email');
    ret.api.email.search = mappedPageOverloadFactory(ret.api.email, 'search');
    ret.api.email.thread = mappedPageOverloadFactory(ret.api.email, 'thread');
    ret.api.email.stats = mappedPageOverloadFactory(ret.api.email, 'stats');
    ret.api.email.import = ret.api.email.child('import');
    ret.api.email.import.google = ret.api.email.import.child('google');
    ret.api.email.import.google.message = ret.api.email.import.google.child('message');
    ret.api.email.import.google.message.status = mappedPageOverloadFactory(ret.api.email.import.google.message, 'status');
    ret.api.email.import.google.search = mappedPageOverloadFactory(ret.api.email.import.google, 'search');
    ret.api.email.import.list = mappedPageOverloadFactory(ret.api.email.import, 'list');
    ret.api.email.properties = (emailId) => {
        const properties = new UrlBuilder({
            parent: ret.api.email,
            segment: emailId,
            slug: 'properties',
        });
        properties.callToAction = mappedPageOverloadFactory(properties, 'call-to-action');
        properties.callToActionResponse = mappedPageOverloadFactory(properties, 'call-to-action-response');
        properties.complianceScores = mappedPageOverloadFactory(properties, 'compliance-scores');
        properties.keyPoints = mappedPageOverloadFactory(properties, 'key-points');
        properties.sentimentAnalysis = mappedPageOverloadFactory(properties, 'sentiment-analysis');
        properties.violationDetails = mappedPageOverloadFactory(properties, 'violation-details');
        properties.emailHeader = mappedPageOverloadFactory(properties, 'email-header');
        properties.notes = mappedPageOverloadFactory(properties, 'notes');
        return properties;
    };
    ret.api.ai = ret.api.child('ai');
    ret.api.ai.chat = ret.api.ai.child('chat');
    ret.api.ai.chat.history = mappedPageOverloadFactory(ret.api.ai.chat, 'history');
    ret.api.ai.chat.stats = mappedPageOverloadFactory(ret.api.ai.chat, 'stats');
    ret.api.ai.chat.rateRetry = ret.api.ai.chat.child('rate-retry');
    ret.api.ai.chat.rateRetry.response = mappedPageOverloadFactory(ret.api.ai.chat.rateRetry, 'response');
    ret.email = ret.child('messages').child('email');
    ret.email.bulkEdit = mappedPageOverloadFactory(ret.email, 'bulk-edit');
    ret.email.edit = mappedPageOverloadFactory(ret.email, 'edit');
    ret.messages = ret.child('messages');
    ret.messages.import = mappedPageOverloadFactory(ret.messages, 'import');
    ret.messages.email = mappedPageOverloadFactory(ret.messages, 'email');
    ret.messages.todoLists = mappedPageOverloadFactory(ret.messages, 'todo-lists');
    ret.messages.chat = ret
        .child('messages')
        .child('chat');
    ret.messages.chat.stats = mappedPageOverloadFactory(ret.messages.chat, 'stats');
    ret.messages.chat.detail = mappedPageOverloadFactory(ret.messages.chat, '');
    ret.chat = ret.messages.chat;
    return ret;
};
//# sourceMappingURL=_from-map.js.map