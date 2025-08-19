import { documentProperty } from '@/drizzle/schema';
import { schema, sql, DatabaseType } from '@/lib/drizzle-db/';
import { count, inArray } from 'drizzle-orm';

export const column_recipient = () =>
    sql`((SELECT COALESCE(json_agg(json_build_object(
              'recipient_id', recipient.contact_id,
              'recipient_name', recipient.name,
              'recipient_email', recipient.email
          )
        ),'[]')						
        FROM email_recipients er 
            LEFT JOIN contacts recipient ON er.recipient_id = recipient.contact_id 
        WHERE emails.email_id = er.email_id AND recipient.contact_id IS NOT NULL    
    ) as r1)`.as('recipients');

export const count_attachments = ({
  db,
  tableAlias = 'attachments',
  columnAlias = 'count_attachments',
}: {
  db: DatabaseType;
  tableAlias?: string;
  columnAlias?: string;
}) =>
  db
    .select({
      emailId: schema.emailAttachments.emailId,
      countAttachments: count().as(columnAlias),
    })
    .from(schema.emailAttachments)
    .groupBy(schema.emailAttachments.emailId)
    .as(tableAlias);


const columnNameForPropertyIdMap = new Map<number, string>();
columnNameForPropertyIdMap.set(4, 'count_cta');
columnNameForPropertyIdMap.set(5, 'count_responsive_actions');
columnNameForPropertyIdMap.set(9, 'count_kpi');
columnNameForPropertyIdMap.set(1000, 'count_notes');
columnNameForPropertyIdMap.set(102, 'count_notes');

export const count_document_properties = ({
  db,
  documentPropertyTypeId,
  columnAlias,
  tableAlias,
  emailOrDocument = 'email',
}: {
  db: DatabaseType;
  documentPropertyTypeId: number | Array<number>;
  columnAlias?: string;
  tableAlias?: string;
  emailOrDocument?: 'email' | 'document';
}) => {
  const typeIds = Array.isArray(documentPropertyTypeId)
    ? documentPropertyTypeId
    : [documentPropertyTypeId];
  if (typeIds.length === 0) {
    throw new Error(
      'document_property_type_id must be a number or an array of numbers',
    );
  }  
  if (!columnAlias) {
    columnAlias = columnNameForPropertyIdMap.get(typeIds[0]);
    if (!columnAlias) {
      throw new Error(
        `No column name found for document_property_type_id: ${typeIds[0]}`,
      );
    }
  }
  tableAlias ??= `tbl_${columnAlias}`;
  const targetIdAlias = `id_${columnAlias}`;
  const targetId =
    (emailOrDocument === 'email'
      ? sql`document_unit_email(${documentProperty.documentId})`
      : sql`${documentProperty.documentId}`).as(targetIdAlias);
  const select = db.select({
      targetCount: count().as(columnAlias),
      targetId: targetId,
    }).from(schema.documentProperty)
    .where(inArray(documentProperty.documentPropertyTypeId, typeIds))
    .groupBy(targetId) 
    .as(tableAlias);

  return select;
};

export const count_kpi =({
  emailOrDocument = 'email',
  db 
}: {
  db: DatabaseType;
  emailOrDocument?: 'email' | 'document';
}) =>
  count_document_properties({
    db,
    documentPropertyTypeId: 9,
    emailOrDocument,
  });

export const count_notes = ({
  emailOrDocument = 'email',
  db
}: {
  emailOrDocument?: 'email' | 'document';
  db: DatabaseType;
}) =>
  count_document_properties({
    db,
    documentPropertyTypeId: [102, 1000],
    emailOrDocument,
  });

export const count_cta = ({
  emailOrDocument = 'email',
  db,
}: {
  emailOrDocument?: 'email' | 'document';
  db: DatabaseType;
}) =>
  count_document_properties({
    db,
    documentPropertyTypeId: 4,
    emailOrDocument,
  });

export const count_responsive_actions = ({
  emailOrDocument = 'email',
  db,
}: {
  emailOrDocument?: 'email' | 'document';
  db: DatabaseType;
}) =>
  count_document_properties({
    db,
    documentPropertyTypeId: 5,
    emailOrDocument,
  });
