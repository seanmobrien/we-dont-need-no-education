export type EmailPropertyCategory = {
    categoryId: number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId;
    description: string;
    createdOn: Date;
};
export type EmailPropertySummary = {
    typeId: number | EmailPropertyTypeType | EmailPropertyTypeTypeId;
    propertyId: string;
    propertyUnitId?: number;
    documentId: number;
    createdOn: Date;
    categoryId?: number;
    typeName?: string;
    categoryName?: string;
    tags?: string[];
    policy_basis?: string[];
};
export type EmailProperty = EmailPropertySummary & {
    value: string;
};
export declare const EmailPropertyCategoryTypeValues: readonly ["Email Header", "Key Point", "Note", "Call to Action", "Compliance Scores", "Sentiment Analysis"];
export type EmailPropertyCategoryType = (typeof EmailPropertyCategoryTypeValues)[number];
export declare enum EmailPropertyCategoryTypeId {
    EmailHeader = 1,
    KeyPoint = 2,
    Note = 3,
    CallToAction = 4,
    ComplianceScores = 5,
    SentimentAnalysis = 6
}
export declare const EmailPropertyCategoryTypeIdValues: readonly [EmailPropertyCategoryTypeId.EmailHeader, EmailPropertyCategoryTypeId.KeyPoint, EmailPropertyCategoryTypeId.Note, EmailPropertyCategoryTypeId.CallToAction, EmailPropertyCategoryTypeId.ComplianceScores, EmailPropertyCategoryTypeId.SentimentAnalysis];
export declare const EmailPropertyTypeTypeValues: readonly ["From", "To", "Cc", "Call to Action", "Call to Action Response", "Compliance Score", "Violation Details", "Sentiment Analysis", "Key Points"];
export type EmailPropertyTypeType = (typeof EmailPropertyTypeTypeValues)[number];
export declare enum EmailPropertyTypeTypeId {
    From = 1,
    To = 2,
    Cc = 3,
    CallToAction = 4,
    CallToActionResponse = 5,
    ComplianceScore = 6,
    ViolationDetails = 7,
    SentimentAnalysis = 8,
    KeyPoints = 9,
    Note = 102,
    ManualReview = 1000
}
export declare const EmailPropertyTypeTypeIdValues: readonly [EmailPropertyTypeTypeId.From, EmailPropertyTypeTypeId.To, EmailPropertyTypeTypeId.Cc, EmailPropertyTypeTypeId.CallToAction, EmailPropertyTypeTypeId.CallToActionResponse, EmailPropertyTypeTypeId.ComplianceScore, EmailPropertyTypeTypeId.ViolationDetails, EmailPropertyTypeTypeId.SentimentAnalysis, EmailPropertyTypeTypeId.KeyPoints];
export type EmailPropertyType = {
    typeId: number | EmailPropertyTypeType | EmailPropertyTypeTypeId;
    categoryId: number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId;
    name: string;
    createdOn: Date;
};
//# sourceMappingURL=property-type.d.ts.map