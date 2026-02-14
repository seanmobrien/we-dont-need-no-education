export const siteMap = {
    api: {
        contact: '',
        email: {
            search: '',
            thread: '',
            stats: '',
            import: {
                google: {
                    message: {
                        status: '',
                    },
                    search: '',
                },
                list: '',
            },
        },
        ai: {
            chat: {
                history: '',
            },
        },
    },
    email: {
        bulkEdit: 'bulk-edit',
        edit: '',
    },
    messages: {
        import: 'import',
        email: {
            callToAction: 'call-to-action',
            keyPoint: 'key-points',
            notes: 'notes',
            responsiveAction: 'call-to-action-response',
        },
        chat: {
            stats: 'stats',
            detail: (chatId) => `/messages/chat/${chatId}`,
        },
        thread: (threadId) => `/messages/email/thread/${threadId}`,
    },
    chat: {
        detail: (chatId) => `/chat/${chatId}`,
    },
};
//# sourceMappingURL=_sitemap.js.map