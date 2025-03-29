/**
 * Represents a summary of a document unit, which can be an email, an attachment, or a property.
 */
export type DocumentUnitSummary = {
  /**
   * The unique identifier for the document unit.
   */
  unitId: number;

  /**
   * The identifier of the associated email, if applicable. Null if not associated with an email.
   * This is important for understanding the context of the document unit.
   * For emails, identifies the email to which the document unit belongs.
   */
  emailId: string | null;

  /**
   * The identifier of the associated attachment, if applicable. Null if not associated with an attachment.
   * This is important for understanding the context of the document unit.
   * For attachments, identifies the attachment to which the document unit belongs.
   */
  attachmentId: number | null;

  /**
   * The identifier of the associated email property, if applicable. Null if not associated with an email property.
   * This is important for understanding the context of the document unit.
   * For email properties, identifies the property to which the document unit belongs.
   */
  emailPropertyId: string | null;

  /**
   * The type of document represented by this unit. Can be 'email', 'attachment', or 'property'.
   * This is important for understanding the context of the document unit.
   * Valid Values: 'email', 'attachment', ''note' | 'key_point' | 'cta' | 'sentiment' | 'compliance';
   *
   * @example "email"
   */
  documentType:
    | 'email'
    | 'attachment'
    | 'note'
    | 'key_point'
    | 'cta'
    | 'sentiment'
    | 'compliance';

  /**
   * The date and time when the document unit was created.
   * This is important for tracking the freshness of the document unit and its relevance.
   */
  createdOn: Date;

  /**
   * The URL or link to the document unit, if applicable. This can be used to access the document directly.
   * This is important for providing easy access to the document unit.
   */
  hrefDocument?: string;

  /**
   * The URL or link to the API endpoint for the document unit, if applicable. This can be used to access the document's metadata or perform operations on it.
   * This is important for providing easy access to the document unit's API.
   */
  hrefApi?: string;
};

/**
 * Represents a detailed document unit that extends the summary information
 * with additional content and metadata.
 *
 * @extends DocumentUnitSummary
 *
 * @property {string} content - The full content of the document unit.
 * @property {string} embeddingModel - The name of the model used for embedding the document.
 * @property {Date} embeddedOn - The date and time when the document was embedded.
 */
export type DocumentUnit = DocumentUnitSummary & {
  /**
   * The full content of the document unit.
   * This can include text, metadata, and other relevant information.
   * It is used for processing and analysis of the document's content.
   *
   * @example "This is an example of document content."
   */
  content: string;
  /**
   * The name of the model used for embedding the document.
   * This is important for understanding how the document is represented in vector space.
   *
   * @example "text-embedding-ada-002"
   */
  embeddingModel: string;
  /**
   * The date and time when the document was embedded.
   * This can be useful for tracking the freshness of the embedding and its relevance.
   *
   * @example "2023-10-01T12:00:00Z"
   */
  embeddedOn: Date;
};
