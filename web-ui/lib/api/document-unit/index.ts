import { BaseObjectRepository } from '../_baseObjectRepository';
import { ObjectRepository } from '../_types';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter } from '@/lib/typescript';
import {
  DocumentUnit,
  DocumentUnitSummary,
} from '@/data-models/api/document-unit';

/**
 * Maps a record object to a `DocumentUnitSummary` object.
 *
 * @param record - A record object containing key-value pairs representing the document unit data.
 * @returns A `DocumentUnitSummary` object with the mapped properties.
 *
 * - `unitId`: The unit ID, converted to a number.
 * - `emailId`: The email ID, converted to a string if present, otherwise `null`.
 * - `attachmentId`: The attachment ID, converted to a number if present, otherwise `null`.
 * - `emailPropertyId`: The email property ID, converted to a string if present, otherwise `null`.
 * - `documentType`: The document type, cast to the `DocumentUnit['documentType']` type.
 * - `createdOn`: The creation date, converted to a `Date` object.
 */
const mapToDocumentUnitSummary = (
  record: Record<string, unknown>,
): DocumentUnitSummary => ({
  unitId: Number(record.unit_id),
  emailId: record.email_id ? String(record.email_id) : null,
  attachmentId: record.attachment_id ? Number(record.attachment_id) : null,
  emailPropertyId: record.email_property_id
    ? String(record.email_property_id)
    : null,
  documentType: String(record.document_type) as DocumentUnit['documentType'],
  createdOn: new Date(String(record.created_on)),
});

/**
 * Maps a record object to a `DocumentUnit` object.
 *
 * @param record - A record object containing key-value pairs representing the document unit data.
 * @returns A `DocumentUnit` object with the mapped properties.
 */
const mapToDocumentUnit = (record: Record<string, unknown>): DocumentUnit => {
  const ret = mapToDocumentUnitSummary(record);
  return {
    ...ret,
    content: String(record.content),
    embeddingModel: String(record.embedding_model),
    embeddedOn: new Date(String(record.embedded_on)),
  };
};

/**
 * Repository for managing `DocumentUnit` objects.
 */
export class DocumentUnitRepository extends BaseObjectRepository<
  DocumentUnit,
  'unitId'
> {
  /**
   * Initializes a new instance of the `DocumentUnitsRepository` class.
   */
  constructor() {
    super({
      tableName: 'document_units',
      idField: ['unitId', 'unit_id'],
      objectMap: mapToDocumentUnit,
      summaryMap: mapToDocumentUnitSummary,
    });
  }

  /**
   * Validates a `DocumentUnit` object based on the specified method.
   *
   * @param method - The repository method being invoked (e.g., 'create', 'update').
   * @param obj - The object to validate.
   * @throws {ValidationError} If validation fails.
   */
  validate<TMethod extends keyof ObjectRepository<DocumentUnit, 'unitId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<DocumentUnit, 'unitId'>, TMethod>[TMethod]
    >,
  ): void {
    const asModel = obj as DocumentUnit;
    if (!['email', 'attachment', 'property'].includes(asModel.documentType)) {
      throw new ValidationError({
        field: 'documentType',
        value: asModel.documentType,
        source: 'DocumentUnitsRepository',
      });
    }
    if (method === 'create' && !asModel.content) {
      throw new ValidationError({
        field: 'content',
        source: 'DocumentUnitsRepository',
      });
    }
  }

  /**
   * Retrieves the query properties for listing `DocumentUnit` records.
   *
   * @returns A tuple containing the SQL query, parameters, and count query.
   */
  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM document_units ORDER BY unit_id`,
      [],
      `SELECT COUNT(*) as records FROM document_units`,
    ];
  }

  /**
   * Retrieves the query properties for fetching a specific `DocumentUnit` record.
   *
   * @param recordId - The ID of the record to fetch.
   * @returns A tuple containing the SQL query and parameters.
   */
  protected getQueryProperties(recordId: number): [string, Array<unknown>] {
    return [`SELECT * FROM document_units WHERE unit_id = $1`, [recordId]];
  }

  /**
   * Retrieves the query properties for creating a new `DocumentUnit` record.
   *
   * @param documentUnit - The `DocumentUnit` object to create.
   * @returns A tuple containing the SQL query and parameters.
   */
  protected getCreateQueryProperties({
    emailId,
    attachmentId,
    emailPropertyId,
    content,
    documentType,
    embeddingModel,
  }: DocumentUnit): [string, Array<unknown>] {
    return [
      `INSERT INTO document_units (email_id, attachment_id, email_property_id, content, document_type, embedding_model) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        emailId,
        attachmentId,
        emailPropertyId,
        content,
        documentType,
        embeddingModel,
      ],
    ];
  }

  /**
   * Retrieves the query properties for updating an existing `DocumentUnit` record.
   *
   * @param documentUnit - The `DocumentUnit` object to update.
   * @returns An array containing the updated fields and their values.
   */
  protected getUpdateQueryProperties({
    content,
    documentType,
    embeddingModel,
  }: DocumentUnit): [Record<string, unknown>] {
    return [
      {
        content,
        document_type: documentType,
        embedding_model: embeddingModel,
      },
    ];
  }
}
