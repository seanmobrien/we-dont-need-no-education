import { EmailPropertyCategoryTypeIdValues, EmailPropertyCategoryTypeValues, EmailPropertyTypeTypeIdValues, EmailPropertyTypeTypeValues, } from './api/email-properties/property-type';
export const normalizeNullableNumeric = (value, defaultValue = null, minValue = 1) => ((value ?? 0) > minValue - 1 ? value ?? null : defaultValue);
export const isPaginationStats = (check) => {
    if (check && typeof check === 'object') {
        const { page, num } = check;
        return (typeof page === 'number' && typeof num === 'number' && page > 0 && num > 0);
    }
    return false;
};
export const normalizeDateAndTime = (input, defaultValue) => {
    let date;
    try {
        date = new Date(input);
        if (isNaN(date.valueOf())) {
            date = defaultValue ?? new Date();
        }
    }
    catch {
        date = defaultValue ?? new Date();
    }
    return date.toISOString().slice(0, 16);
};
export const lookupEmailPropertyType = (propertyType) => {
    const index = typeof propertyType === 'number'
        ? propertyType
        : EmailPropertyTypeTypeValues.indexOf(propertyType);
    return index === -1 ? -1 : EmailPropertyTypeTypeIdValues[index];
};
export const isEmailPropertyType = (check) => typeof check === 'string' && lookupEmailPropertyType(check) !== -1;
export const lookupEmailPropertyCategory = (propertyCategory) => {
    const index = typeof propertyCategory === 'number'
        ? propertyCategory
        : EmailPropertyCategoryTypeValues.indexOf(propertyCategory);
    return index === -1 ? -1 : EmailPropertyCategoryTypeIdValues[index];
};
export const isEmailPropertyCategory = (check) => {
    const isValidCategory = typeof check === 'string' && lookupEmailPropertyCategory(check) !== -1;
    return isValidCategory;
};
//# sourceMappingURL=_utilities.js.map