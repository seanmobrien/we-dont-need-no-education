export const createContactSummary = (overrides) => ({
    contactId: -1,
    email: '',
    name: '',
    ...(overrides ?? {}),
});
export const createContact = (overrides) => ({
    ...createContactSummary(overrides),
    jobDescription: '',
    phoneNumber: '',
    isDistrictStaff: false,
    ...(overrides ?? {}),
});
export const createEmailMessage = (overrides) => ({
    emailId: '',
    subject: '',
    body: '',
    sentOn: new Date().toISOString(),
    threadId: null,
    parentEmailId: null,
    recipients: [],
    ...overrides,
    sender: createContact(overrides?.sender),
});
//# sourceMappingURL=factories.js.map