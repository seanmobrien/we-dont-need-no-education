import { asSql } from '@compliance-theater/database/driver';
export const column_recipient = (sql) => asSql(sql) `(
            
              SELECT COALESCE(json_agg(json_build_object(
                          'recipient_id', recipient.contact_id,
                          'recipient_name', recipient.name,
                          'recipient_email', recipient.email
                      )
                ),'[]')						
                FROM email_recipients er 
                    LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id 
                WHERE e.email_id = er.email_id AND recipient.contact_id IS NOT NULL    
          ) AS recipients`;
export const count_attachments = (sql) => asSql(sql) `(
  SELECT COUNT(*) 
  FROM email_attachments ea 
  WHERE ea.email_id=e.email_id
) AS count_attachments`;
const columnNameForPropertyIdMap = new Map();
columnNameForPropertyIdMap.set(4, 'count_cta');
columnNameForPropertyIdMap.set(5, 'count_responsive_actions');
columnNameForPropertyIdMap.set(9, 'count_kpi');
columnNameForPropertyIdMap.set(1000, 'count_notes');
columnNameForPropertyIdMap.set(102, 'count_notes');
export const count_document_properties = ({ sql, documentPropertyTypeId, columnName, emailOrDocument = 'email', }) => {
    const typeIds = Array.isArray(documentPropertyTypeId)
        ? documentPropertyTypeId
        : [documentPropertyTypeId];
    if (!columnName) {
        columnName = columnNameForPropertyIdMap.get(typeIds[0]);
        if (!columnName) {
            throw new Error(`No column name found for document_property_type_id: ${typeIds[0]}`);
        }
    }
    if (typeIds.length === 0) {
        throw new Error('document_property_type_id must be a number or an array of numbers');
    }
    const sqlDb = asSql(sql);
    return sqlDb `(
    SELECT COUNT(*) FROM document_property dp
    WHERE ${emailOrDocument === 'email' ? sqlDb(`document_unit_email(dp.document_id)=e.email_id `) : sqlDb(`dp.document_id=du.unit_id `)}
      AND dp.document_property_type_id IN (${typeIds.join(',')})
  ) AS ${sqlDb(columnName)})`;
};
export const count_kpi = ({ sql, emailOrDocument = 'email', }) => count_document_properties({
    sql,
    documentPropertyTypeId: 9,
    emailOrDocument,
});
export const count_notes = ({ sql, emailOrDocument = 'email', }) => count_document_properties({
    sql,
    documentPropertyTypeId: [102, 1000],
    emailOrDocument,
});
export const count_cta = ({ sql, emailOrDocument = 'email', }) => count_document_properties({
    sql,
    documentPropertyTypeId: 4,
    emailOrDocument,
});
export const count_responsive_actions = ({ sql, emailOrDocument = 'email', }) => count_document_properties({
    sql,
    documentPropertyTypeId: 5,
    emailOrDocument,
});
//# sourceMappingURL=query-parts.js.map