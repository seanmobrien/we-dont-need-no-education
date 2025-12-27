import { BaseObjectRepository } from '../_baseObjectRepository';
import { ObjectRepository } from '../_types';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { FirstParameter } from '@repo/lib-typescript';
import {
  DocumentUnit,
  DocumentUnitSummary,
  isDocumentUnitType,
} from '@/data-models/api/document-unit';
import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  generateAccountSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { env } from '@/lib/site-util/env';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
import { pgDbWithInit } from '@/lib/neondb/connection';

/**
 * Repository for managing `DocumentUnit` objects.
 */
export class DocumentUnitRepository extends BaseObjectRepository<
  DocumentUnit,
  'unitId'
> {
  #sasKey: string | undefined = undefined;
  #generateDownloadKey: boolean = false;
  #pendingEmbed: boolean = false;
  /**
   * Initializes a new instance of the `DocumentUnitsRepository` class.
   */
  constructor({
    generateDownloadKey = false,
    alwaysReturnContent = false,
    pendingEmbed = false,
  }: {
    generateDownloadKey?: boolean;
    alwaysReturnContent?: boolean;
    pendingEmbed?: boolean;
  } = {}) {
    super({
      tableName: 'document_units',
      idField: ['unitId', 'unit_id'],
      objectMap: 'mapToDocumentUnit',
      summaryMap:
        (alwaysReturnContent ?? false)
          ? 'mapToDocumentUnit'
          : 'mapToDocumentUnitSummary',
    });
    this.#generateDownloadKey = generateDownloadKey ?? false;
    this.#pendingEmbed = pendingEmbed ?? false;
  }
  protected get SasKey(): string {
    if (!this.#generateDownloadKey) {
      return '';
    }
    if (this.#sasKey === undefined) {
      const sasOptions = {
        services: AccountSASServices.parse('b').toString(), // blobs, tables, queues, files
        resourceTypes: AccountSASResourceTypes.parse('sco').toString(), // service, container, object
        permissions: AccountSASPermissions.parse('r'), // permissions
        protocol: SASProtocol.Https,
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 3 * 60 * 60 * 1000), // 3 hours
      };

      const sasToken = generateAccountSASQueryParameters(
        sasOptions,
        new StorageSharedKeyCredential(
          env('AZURE_STORAGE_ACCOUNT_NAME'),
          env('AZURE_STORAGE_ACCOUNT_KEY'),
        ),
      ).toString();
      this.#sasKey = sasToken[0] === '?' ? sasToken : `?${sasToken}`;
    }
    return this.#sasKey;
  }

  /**
   * Validates a `DocumentUnit` object based on the specified method.
   *
   * @param method - The repository method being invoked (e.g., 'create', 'update').
   * @param obj - The object to validate.
   * @throws {ValidationError} If validation fails.
   */
  async validate<TMethod extends keyof ObjectRepository<DocumentUnit, 'unitId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<DocumentUnit, 'unitId'>, TMethod>[TMethod]
    >,
  ): Promise<void> {

    switch (method) {
      case 'create':
        break;
      case 'get':
      case 'delete':
        if (Array.isArray(obj)) {
          if (obj.length < 1 || isNaN(Number.parseInt(obj[0]))) {
            throw new ValidationError({
              field: 'unitId',
              value: obj,
              source: 'DocumentUnitsRepository',
            });
          }
        } else if (isNaN(Number.parseInt(String(obj)))) {
          throw new ValidationError({
            field: 'unitId',
            value: obj,
            source: 'DocumentUnitsRepository',
          });
        }

        break;
      case 'create':
        const asCreateModel = obj as DocumentUnit;
        if (!isDocumentUnitType(asCreateModel.documentType)) {
          throw new ValidationError({
            field: 'documentType',
            value: asCreateModel.documentType,
            source: 'DocumentUnitsRepository',
          });
        }
        if (!asCreateModel.content) {
          throw new ValidationError({
            field: 'content',
            source: 'DocumentUnitsRepository',
          });
        }
        break;
      default:
        const asModel = obj as DocumentUnit;
        if (asModel.documentType && !isDocumentUnitType(asModel.documentType)) {
          throw new ValidationError({
            field: 'documentType',
            value: asModel.documentType,
            source: 'DocumentUnitsRepository',
          });
        }
    }
  }

  /**
   * Retrieves the query properties for listing `DocumentUnit` records.
   *
   * @returns A tuple containing the SQL query, parameters, and count query.
   */
  protected async getListQueryProperties(): Promise<[string, Array<unknown>, string]> {
    const wherePendingEmbed = this.#pendingEmbed
      ? ' AND du.embedded_on IS NULL'
      : '';
    const availableCaseFiles = await getAccessibleUserIds(undefined) ?? [];
    const whereAvailableCaseFiles = availableCaseFiles.length > 0
      ? ` AND du.user_id IN (${availableCaseFiles.join(',')})`
      : ' AND 1=-1';
    return [
      `SELECT du.*, ea.file_path, e.thread_id,
  ARRAY(
    SELECT e.email_id
    FROM document_property ep
    JOIN emails e ON ep.property_value = e.global_message_id
    WHERE ep.email_id = du.email_id
      AND ep.document_property_type_id = 22
  ) AS related_email_ids,
  (
    SELECT e.email_id
    FROM document_property ep
    JOIN emails e ON ep.property_value = e.global_message_id
    WHERE ep.email_id = du.email_id
      AND ep.document_property_type_id = 26
  ) AS parent_email_id
    FROM document_units du
    LEFT JOIN email_attachments ea ON du.attachment_id = ea.attachment_id
    LEFT JOIN emails e ON du.email_id = e.email_id
    WHERE 1=1
    ${wherePendingEmbed} 
    ${whereAvailableCaseFiles}
    ORDER BY du.unit_id`.toString(),
      [],
      `SELECT COUNT(*) as records FROM document_units du ${wherePendingEmbed} ${whereAvailableCaseFiles}`.toString(),
    ];
  }

  /**
   * Retrieves the query properties for fetching a specific `DocumentUnit` record.
   *
   * @param recordId - The ID of the record to fetch.
   * @returns A tuple containing the SQL query and parameters.
   */
  protected async getQueryProperties(recordId: number): Promise<[string, Array<unknown>]> {
    const sql = await pgDbWithInit();

    const availableCaseFiles = await getAccessibleUserIds(undefined) ?? [];
    const whereAvailableCaseFiles = availableCaseFiles.length > 0
      ? sql` du.user_id IN ${sql('(' + availableCaseFiles.join(',') + ')')}`
      : sql` 1=-1`;
    return [
      `SELECT du.*, ea.file_path, e.thread_id,
  ARRAY(
    SELECT e.email_id
    FROM document_property ep
    JOIN emails e ON ep.property_value = e.global_message_id
    WHERE ep.email_id = du.email_id    
      AND ep.document_property_type_id = 22
  ) AS related_email_ids,
  (
    SELECT e.email_id
    FROM document_property ep
    JOIN emails e ON ep.property_value = e.global_message_id
    WHERE ep.email_id = du.email_id
      AND ep.document_property_type_id = 26
  ) AS parent_email_id
    FROM document_units du
    LEFT JOIN emails e ON du.email_id = e.email_id
    LEFT JOIN email_attachments ea ON du.attachment_id = ea.attachment_id WHERE unit_id = $1
    AND ${whereAvailableCaseFiles}
    `,
      [recordId],
    ];
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
    userId,
  }: DocumentUnit): [string, Array<unknown>] {
    return [
      `INSERT INTO document_units (email_id, attachment_id, email_property_id, content, document_type, embedding_model, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        emailId,
        attachmentId,
        emailPropertyId,
        content,
        documentType,
        embeddingModel,
        userId,
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
    embeddedOn,
  }: DocumentUnit): [Record<string, unknown>] {
    return [
      {
        content,
        document_type: documentType,
        embedding_model: embeddingModel,
        embedded_on: embeddedOn,
      },
    ];
  }

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
  mapToDocumentUnitSummary = (
    record: Record<string, unknown>,
  ): DocumentUnitSummary => {
    const ret: DocumentUnitSummary = {
      unitId: Number(record.unit_id),
      userId: Number(record.user_id),
      emailId: record.email_id ? String(record.email_id) : null,
      attachmentId: record.attachment_id ? Number(record.attachment_id) : null,
      emailPropertyId: record.email_property_id
        ? String(record.email_property_id)
        : null,
      threadId: record.thread_id ? Number(record.thread_id) : 0,
      relatedEmailIds: record.related_email_ids
        ? (record.related_email_ids as string[])
        : [],
      documentType: String(
        record.document_type,
      ) as DocumentUnit['documentType'],
      createdOn: new Date(String(record.created_on)),
      parentEmailId: record.parent_email_id
        ? String(record.parent_email_id)
        : null,
      embeddingModel: record.embedding_model
        ? String(record.embedding_model)
        : null,
      embeddedOn: new Date(String(record.embedded_on)),
    };
    switch (ret.documentType) {
      case 'email':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}`;
        break;
      case 'attachment':
        ret.hrefDocument = record.file_path
          ? `${record.file_path}${this.SasKey}`
          : undefined;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/attachment/${ret.attachmentId}`;
        break;
      case 'note':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/${ret.emailPropertyId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/${ret.emailPropertyId}`;
        break;
      case 'key_point':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/key-points/${ret.emailPropertyId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/key-points/${ret.emailPropertyId}`;
        break;
      case 'cta':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/call-to-action/${ret.emailPropertyId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/call-to-action/${ret.emailPropertyId}`;
        break;
      case 'sentiment':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/sentiment-analysis/${ret.emailPropertyId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/sentiment-analysis/${ret.emailPropertyId}`;
        break;
      case 'compliance':
        ret.hrefDocument = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/compliance-scores/${ret.emailPropertyId}`;
        ret.hrefApi = `${env('NEXT_PUBLIC_HOSTNAME')}/api/email/${ret.emailId}/properties/compliance-scores/${ret.emailPropertyId}`;
        break;
      default:
        break;
    }
    return ret;
  };

  /**
   * Maps a record object to a `DocumentUnit` object.
   *
   * @param record - A record object containing key-value pairs representing the document unit data.
   * @returns A `DocumentUnit` object with the mapped properties.
   */
  mapToDocumentUnit = (record: Record<string, unknown>): DocumentUnit => {
    const ret = this.mapToDocumentUnitSummary(record);
    return {
      ...ret,
      content: String(record.content),
    };
  };
}
