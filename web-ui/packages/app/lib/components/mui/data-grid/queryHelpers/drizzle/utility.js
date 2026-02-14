import { schema } from '@compliance-theater/database/orm';
import { isKeyOf } from '@compliance-theater/typescript';
import { toCamelCase } from 'drizzle-orm/casing';
export const DefaultDrizzleEmailColumnMap = {
    propertyValue: 'property_value',
    propertyName: 'property_name',
};
export const getEmailColumn = ({ columnName, table, }) => {
    switch (columnName) {
        case 'email_id':
            return schema.documentUnits.emailId;
        case 'property_id':
            return schema.documentProperty.propertyId;
        case 'property_value':
        case 'value':
            return schema.documentProperty.propertyValue;
        case 'document_property_type_id':
        case 'typeId':
            return schema.documentProperty.documentPropertyTypeId;
        case 'document_id':
            return schema.documentProperty.documentId;
        case 'created_on':
            return schema.documentProperty.createdOn;
        case 'policy_basis':
            return schema.documentProperty.policyBasis;
        case 'tags':
            return schema.documentProperty.tags;
        case 'property_name':
            return schema.emailPropertyType.propertyName;
        case 'description':
            return schema.emailPropertyCategory.description;
        case 'email_property_category_id':
            return schema.emailPropertyCategory.emailPropertyCategoryId;
        case 'compliance_chapter_13_reasons':
            return isKeyOf('complianceChapter13Reasons', table)
                ? table['complianceChapter13Reasons']
                : isKeyOf('compliance_chapter_13_reasons', table)
                    ? table['compliance_chapter_13_reasons']
                    : isKeyOf('complianceChapter13Reasons', table)
                        ? table['complianceChapter13Reasons']
                        : undefined;
        case 'compliance_average_chapter_13':
            return isKeyOf('compliance_average_chapter_13', table)
                ? table['compliance_average_chapter_13']
                : isKeyOf('compliance_chapter_13', table)
                    ? table['compliance_chapter_13']
                    : isKeyOf('complianceAverageChapter13', table)
                        ? table['complianceAverageChapter13']
                        : undefined;
        default:
            if (isKeyOf(columnName, table)) {
                return table[columnName];
            }
            const camelCase = toCamelCase(String(columnName));
            if (isKeyOf(camelCase, table)) {
                return table[camelCase];
            }
            return undefined;
    }
};
//# sourceMappingURL=utility.js.map