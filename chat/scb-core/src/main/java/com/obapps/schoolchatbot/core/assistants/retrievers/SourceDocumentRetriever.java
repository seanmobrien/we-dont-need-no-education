package com.obapps.schoolchatbot.core.assistants.retrievers;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import com.obapps.schoolchatbot.core.models.EmailAttachment;
import com.obapps.schoolchatbot.core.services.StorageService;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * Retrieves source documents and their associated metadata or attachments.
 *
 * <p>This class provides methods to retrieve documents and their attachments
 * based on a query. It also includes serialization methods for documents and
 * attachments to convert them into {@link Content} objects with metadata.
 */
public class SourceDocumentRetriever extends ContentRetrieverBase {

  /**
   * Service for handling storage-related operations.
   */
  private final StorageService storageService;

  /**
   * Flag indicating whether to include the reply-to email
   */
  private Boolean includeReplyTo = false;

  /**
   * Default constructor initializing with a default {@link StorageService}.
   */
  public SourceDocumentRetriever() {
    this(null);
  }

  /**
   * Constructor initializing with a specified {@link StorageService}.
   *
   * @param storageService the storage service to use
   */
  public SourceDocumentRetriever(StorageService storageService) {
    super(SourceDocumentRetriever.class);
    this.storageService = storageService == null
      ? new StorageService()
      : storageService;
  }

  /**
   * Retrieves the value of the includeReplyTo flag.
   *
   * @return {@code true} if the reply-to feature is included; {@code false} otherwise.
   */
  public Boolean getIncludeReplyTo() {
    return includeReplyTo;
  }

  /**
   * Sets the value of the includeReplyTo flag.
   *
   * @param includeReplyTo {@code true} to include the reply-to feature; {@code false} otherwise.
   */
  public void setIncludeReplyTo(Boolean includeReplyTo) {
    this.includeReplyTo = includeReplyTo;
  }

  /**
   * Retrieves a list of content based on the provided query.
   *
   * <p>This method attempts to retrieve a document and its associated attachments
   * based on the document ID extracted from the query. If no valid document ID is
   * found in the query, it returns a single content item created from the query text.
   *
   * <p>If a document is found, it is serialized and added to the result list. Any
   * attachments associated with the document are also serialized and included in
   * the result list.
   *
   * <p>In case of a database error while retrieving the document or its attachments,
   * an error is logged, and the method returns the content retrieved up to that point.
   *
   * @param query The query containing the document ID or text to retrieve content for.
   * @return A list of {@link Content} objects representing the retrieved document,
   *         its attachments, or a fallback content item based on the query text.
   */
  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(query);
    if (input.compareTo(1) < 0) {
      // No document id included in query, nothing to do
      ret.add(CreateContent(query.text()));
      return ret;
    }
    try {
      var document = DocumentWithMetadata.fromDb(input);
      if (document != null) {
        ret.add(serializeDocument(document));
        // Then let's check if we have any attachments...
        var attachments = EmailAttachment.loadForEmail(
          null,
          document.getEmailId()
        );
        // And attach downloadable versions of them, if available
        for (var attachment : attachments) {
          ret.add(serializeAttachment(attachment));
        }
      }
    } catch (SQLException e) {
      log.error(
        "An error occurred reading mesage state for document id " + input,
        e
      );
    }
    return ret;
  }

  /**
   * Serializes an email attachment into a {@link Content} object with metadata.
   *
   * @param attachment the email attachment to serialize
   * @return a {@link Content} object representing the serialized attachment
   */
  protected Content serializeAttachment(EmailAttachment attachment) {
    return serializeAttachment(storageService, attachment);
  }

  /**
   * Serializes an email attachment into a {@link Content} object with metadata,
   * using the specified storage service.
   *
   * @param storageService the storage service to use for generating download URLs
   * @param attachment the email attachment to serialize
   * @return a {@link Content} object representing the serialized attachment
   */
  public static Content serializeAttachment(
    StorageService storageService,
    EmailAttachment attachment
  ) {
    var meta = new HashMap<String, Object>();
    meta.put(
      AugmentedSearchMetadataType.contentType,
      AugmentedSearchMetadataType.EmailAttachment.name
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.id,
      attachment.getAttachmentId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.email_id,
      attachment.getEmailId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailAttachment.file_name,
      attachment.getFileName()
    );
    var downloadUrl = storageService.getDownloadUrl(attachment);
    if (downloadUrl != null) {
      attachment.setFilePath(downloadUrl);
      meta.put(
        AugmentedSearchMetadataType.EmailAttachment.download_url,
        downloadUrl
      );
    }
    return CreateContent(attachment.toJson(), meta);
  }

  /**
   * Serializes a document into a {@link Content} object with metadata.
   *
   * @param document the document to serialize
   * @return a {@link Content} object representing the serialized document
   */
  public static Content serializeDocument(DocumentWithMetadata document) {
    return serializeDocument(document, null);
  }

  /**
   * Serializes a document into a {@link Content} object with metadata,
   * including an optional content subtype.
   *
   * @param document the document to serialize
   * @param contentSubType an optional subtype for the content
   * @return a {@link Content} object representing the serialized document
   */
  public static Content serializeDocument(
    DocumentWithMetadata document,
    String contentSubType
  ) {
    var meta = new HashMap<String, Object>();
    meta.put(
      AugmentedSearchMetadataType.contentType,
      contentSubType == null
        ? AugmentedSearchMetadataType.EmailMetadata.name
        : String.format(
          "%s/%s",
          AugmentedSearchMetadataType.EmailMetadata.name,
          contentSubType
        )
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.id,
      document.getDocumentId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.type_id,
      document.getDocumentType()
    );
    return CreateContent(document.toJson(), meta);
  }
}
