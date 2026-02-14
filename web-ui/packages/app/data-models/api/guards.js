export const isContactSummary = (check) => {
    const candidate = check;
    return (typeof candidate?.contactId === 'number' &&
        typeof candidate?.name === 'string' &&
        typeof candidate?.email === 'string');
};
export const isContact = (check) => {
    const candidate = check;
    return (isContactSummary(check) &&
        ((typeof candidate?.jobDescription === 'string' &&
            candidate.jobDescription.length > 0) ||
            typeof candidate?.isDistrictStaff === 'boolean'));
};
export const isEmailPropertyDataModel = (check) => {
    if (!check || typeof check !== 'object') {
        return false;
    }
    return ('categoryId' in check &&
        (typeof check.categoryId === 'number' ||
            typeof check.categoryId === 'string') &&
        'typeId' in check &&
        (typeof check.typeId === 'number' || typeof check.typeId === 'string') &&
        'name' in check &&
        typeof check.name === 'string');
};
export const isMessageImportStatus = (check) => typeof check === 'object' &&
    !!check &&
    'emailId' in check &&
    (typeof check.emailId === 'string' || check.emailId === null) &&
    'providerId' in check &&
    typeof check.providerId === 'string' &&
    'status' in check &&
    typeof check.status === 'string';
export const isMessageImportWithChildrenStatus = (check) => isMessageImportStatus(check) && 'references' in check && 'subject' in check;
//# sourceMappingURL=guards.js.map