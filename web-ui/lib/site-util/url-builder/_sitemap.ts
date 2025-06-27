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
    thread: (threadId: string) => `/messages/email/thread/${threadId}`,
  },
};
