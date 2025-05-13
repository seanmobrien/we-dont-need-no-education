package com.obapps.schoolchatbot.core.models;

import com.esotericsoftware.minlog.Log;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.core.util.*;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentWithMetadata implements IMessageMetadata {

  Integer documentId = null;
  Integer attachmentId = null;
  UUID propertyId = null;
  UUID emailId = null;
  String documentType = "email";
  String sender = null;
  String recipients = null;
  LocalDateTime documentSendDate = null;
  String content = null;
  Boolean isFromDistrictStaff;
  String subject;
  Integer threadId;
  String filePath;
  private String senderRole;
  private Integer replyToDocumentId;
  private List<Integer> relatedDocuments;
  private List<Integer> attachments;
  private UUID documentPropertyId;
  private String embeddingModel;
  private LocalDateTime embeddedOn;

  public DocumentWithMetadata() {
    // Default constructor
  }

  @Override
  public Integer getDocumentId() {
    return documentId;
  }

  @Override
  public UUID getEmailId() {
    return emailId;
  }

  @Override
  public String getDocumentType() {
    return documentType;
  }

  public void setDocumentType(String documentType) {
    this.documentType = documentType;
  }

  @Override
  public LocalDateTime getDocumentSendDate() {
    return documentSendDate;
  }

  @Override
  public Boolean getIsFromDistrictStaff() {
    return isFromDistrictStaff;
  }

  @Override
  public String getSender() {
    return sender;
  }

  @Override
  public String getRecipients() {
    return recipients;
  }

  @Override
  public String getSubject() {
    return this.subject;
  }

  @Override
  public Integer getThreadId() {
    return this.threadId;
  }

  public String getFilePath() {
    return filePath;
  }

  public String getContent() {
    return Strings.normalizeForOutput(this.content);
  }

  public String getSenderRole() {
    return senderRole;
  }

  public void setSenderRole(String senderRole) {
    this.senderRole = senderRole;
  }

  public Integer getReplyToDocumentId() {
    return replyToDocumentId;
  }

  public void setReplyToDocumentId(Integer replyToDocumentId) {
    this.replyToDocumentId = replyToDocumentId;
  }

  public List<Integer> getRelatedDocuments() {
    return relatedDocuments;
  }

  public List<Integer> getAttachments() {
    return this.attachments;
  }

  public void setRelatedDocuments(List<Integer> relatedDocuments) {
    this.relatedDocuments = relatedDocuments;
  }

  public Integer getAttachmentId() {
    return attachmentId;
  }

  public void setAttachmentId(Integer attachmentId) {
    this.attachmentId = attachmentId;
  }

  public UUID getDocumentPropertyId() {
    return documentPropertyId;
  }

  public void setDocumentPropertyId(UUID documentPropertyId) {
    this.documentPropertyId = documentPropertyId;
  }

  private static final String ROOT_BASE_PATH_STRING =
    "https://api.schoolchatbot.com/v1/";

  public String getHrefDocument() {
    var docType = this.getDocumentType();
    if (Strings.compareIgnoreCase(docType, "attachment")) {
      var filePath = this.getFilePath();
      if (filePath != null && !filePath.isEmpty()) {
        return filePath;
      }
    }
    return getHrefApi();
  }

  public String getHrefApi() {
    var basePath = new StringBuilder(ROOT_BASE_PATH_STRING);
    var docType = this.getDocumentType();
    if (docType == null || docType.isEmpty()) {
      return null;
    }
    if (Strings.compareIgnoreCase(docType, "email")) {
      basePath.append("api/email/").append(this.getEmailId().toString());
      return basePath.toString();
    }
    if (Strings.compareIgnoreCase(docType, "attachment")) {
      basePath.append("api/attachment/").append(this.getAttachmentId());
      return basePath.toString();
    }
    if (Strings.compareIgnoreCase(docType, "document")) {
      basePath.append("api/document/").append(this.getDocumentId());
      return basePath.toString();
    }
    basePath
      .append("api/email/")
      .append(this.getEmailId().toString())
      .append("/properties/")
      .append(docType)
      .append("/")
      .append(this.getDocumentPropertyId());
    return basePath.toString();
  }

  public String getEmbeddingModel() {
    return embeddingModel;
  }

  public void setEmbeddingModel(String embeddingModel) {
    this.embeddingModel = embeddingModel;
  }

  public LocalDateTime getEmbeddedOn() {
    return embeddedOn;
  }

  public void setEmbeddedOn(LocalDateTime embeddedOn) {
    this.embeddedOn = embeddedOn;
  }

  public String toJson() {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return objectMapper.writeValueAsString(this);
    } catch (JsonProcessingException e) {
      throw new RuntimeException("Error serializing document to JSON", e);
    }
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {

    private Integer documentId = 0;
    private UUID emailId;
    private String documentType = "email";
    private String sender;
    private String recipients;
    private LocalDateTime documentSendDate = LocalDateTime.now();
    private Boolean isFromDistrictStaff = false;
    private String content;
    private String subject;
    private Integer threadId;
    private String senderRole;
    private Integer replyToDocumentId;
    private List<Integer> relatedDocuments;
    private List<Integer> attachments;
    private Integer attachmentId;
    private UUID documentPropertyId;
    private String embeddingModel;
    private LocalDateTime embeddedOn;
    private String filePath;

    public Builder setDocumentId(Integer documentId) {
      this.documentId = documentId;
      return this;
    }

    public Builder setAttachments(List<Integer> attachments) {
      this.attachments = attachments;
      return this;
    }

    public Builder setContent(String contents) {
      this.content = Strings.normalizeForOutput(contents);
      return this;
    }

    public Builder setEmailId(UUID emailMessageId) {
      this.emailId = emailMessageId;
      return this;
    }

    public Builder setFilePath(String filePath) {
      this.filePath = filePath;
      return this;
    }

    public Builder setDocumentType(String documentType) {
      this.documentType = documentType;
      return this;
    }

    public Builder setSender(String sender) {
      this.sender = sender;
      return this;
    }

    public Builder setRecipients(String recipients) {
      this.recipients = recipients;
      return this;
    }

    public Builder setDocumentSendDate(LocalDateTime documentSendDate) {
      this.documentSendDate = documentSendDate;
      return this;
    }

    public Builder setIsFromDistrictStaff(Boolean isFromDistrictStaff) {
      this.isFromDistrictStaff = isFromDistrictStaff;
      return this;
    }

    public Builder setSubject(String subject) {
      this.subject = subject;
      return this;
    }

    public Builder setThreadId(Integer threadId) {
      this.threadId = threadId;
      return this;
    }

    public Builder setSenderRole(String senderRole) {
      this.senderRole = senderRole;
      return this;
    }

    public Builder setReplyToDocumentId(Integer replyToDocumentId) {
      this.replyToDocumentId = replyToDocumentId;
      return this;
    }

    public Builder setRelatedDocuments(List<Integer> relatedDocuments) {
      this.relatedDocuments = relatedDocuments;
      return this;
    }

    public Builder setAttachmentId(Integer attachmentId) {
      this.attachmentId = attachmentId;
      return this;
    }

    public Builder setDocumentPropertyId(UUID documentPropertyId) {
      this.documentPropertyId = documentPropertyId;
      return this;
    }

    public Builder setEmbeddingModel(String embeddingModel) {
      this.embeddingModel = embeddingModel;
      return this;
    }

    public Builder setEmbeddedOn(LocalDateTime embeddedOn) {
      this.embeddedOn = embeddedOn;
      return this;
    }

    public DocumentWithMetadata build() {
      if (this.documentId < 1) {
        throw new IllegalStateException("Document ID cannot be null");
      }
      if (this.emailId == null) {
        throw new IllegalStateException("Document ID cannot be null");
      }
      DocumentWithMetadata emailMetadata = new DocumentWithMetadata();
      emailMetadata.threadId = this.threadId;
      emailMetadata.documentId = this.documentId;
      emailMetadata.emailId = this.emailId;
      emailMetadata.documentType = this.documentType;
      emailMetadata.sender = this.sender;
      emailMetadata.recipients = this.recipients;
      emailMetadata.documentSendDate = this.documentSendDate;
      emailMetadata.isFromDistrictStaff = this.isFromDistrictStaff;
      emailMetadata.content = Strings.normalizeForOutput(this.content);
      emailMetadata.subject = this.subject;
      emailMetadata.senderRole = this.senderRole;
      emailMetadata.replyToDocumentId = this.replyToDocumentId;
      emailMetadata.relatedDocuments = this.relatedDocuments;
      emailMetadata.attachments = this.attachments;
      emailMetadata.attachmentId = this.attachmentId;
      emailMetadata.documentPropertyId = this.documentPropertyId;
      emailMetadata.embeddingModel = this.embeddingModel;
      emailMetadata.filePath = this.filePath;
      emailMetadata.embeddedOn = this.embeddedOn;

      return emailMetadata;
    }
  }

  public static DocumentWithMetadata fromJson(String json) {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      var builder = objectMapper.readValue(
        json,
        DocumentWithMetadata.Builder.class
      );
      return builder.build();
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error deserializing DocumentWithMetadata from JSON",
        e
      );
    }
  }

  public static DocumentWithMetadata fromDb(Integer documentId)
    throws SQLException {
    return fromDb(Db.getInstance(), documentId, null);
  }

  /**
   * Creates a DocumentWithMetadata object from the database using the provided document ID.
   *
   * @param db The database instance to use for the query.
   * @param documentId The ID of the document to retrieve.
   * @return A DocumentWithMetadata object populated with data from the database, or null if no matching record is found.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentWithMetadata fromDb(Db db, Integer documentId)
    throws SQLException {
    return fromDb(db, documentId, null);
  }

  /**
   * Creates a DocumentWithMetadata object from the database using the provided document ID.
   *
   * @param db The database instance to use for the query.
   * @param documentId The ID of the document to retrieve.
   * @return A DocumentWithMetadata object populated with data from the database, or null if no matching record is found.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentWithMetadata fromDb(Db db, UUID referenceId)
    throws SQLException {
    var theDb = db == null ? Db.getInstance() : db;
    var theResults = theDb.selectObjects(
      DocumentWithMetadata.class,
      "SELECT * FROM public.\"DocumentWithDetails\" WHERE property_id=? OR (email_id=? AND property_id IS NULL)",
      referenceId,
      referenceId
    );
    if (theResults == null || theResults.size() == 0) {
      return null;
    }
    return theResults.get(0);
  }

  /**
   * Creates a DocumentWithMetadata object from the database using the provided document ID.
   *
   * @param db The database instance to use for the query.
   * @param documentId The ID of the document to retrieve.
   * @param documentTypeOverride An optional override for the document type.
   *   If provided, it will be used instead of the type from the database.
   * @return A DocumentWithMetadata object populated with data from the database, or null if no matching record is found.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentWithMetadata fromDb(
    Db db,
    Integer documentId,
    String documentTypeOverride
  ) throws SQLException {
    var theDb = db == null ? Db.getInstance() : db;
    var theResults = theDb.selectObjects(
      DocumentWithMetadata.class,
      "SELECT * FROM public.\"DocumentWithDetails\" WHERE document_id=?",
      documentId
    );
    if (theResults == null || theResults.size() == 0) {
      return null;
    }
    var ret = theResults.get(0);
    if (documentTypeOverride != null && ret != null) {
      ret.setDocumentType(documentTypeOverride);
    }
    return ret;
  }

  /**
   * Creates a DocumentWithMetadata object from the database using the provided document ID.
   *
   * @param db The database instance to use for the query.
   * @param documentId The ID of the document to retrieve.
   * @return A DocumentWithMetadata object populated with data from the database, or null if no matching record is found.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentWithMetadata fromAttachmentId(
    Db db,
    Integer attachmentId
  ) throws SQLException {
    var theDb = db == null ? Db.getInstance() : db;
    var theResults = theDb.selectObjects(
      DocumentWithMetadata.class,
      "SELECT * FROM public.\"DocumentWithDetails\" WHERE attachment_id=?",
      attachmentId
    );
    if (theResults == null || theResults.size() == 0) {
      return null;
    }
    var ret = theResults.get(0);
    return ret;
  }

  /**
   * Creates a DocumentWithMetadata object from the database using the provided document ID.
   *
   * @param db The database instance to use for the query.
   * @param documentId The ID of the document to retrieve.
   * @param documentTypeOverride An optional override for the document type.
   *   If provided, it will be used instead of the type from the database.
   * @return A DocumentWithMetadata object populated with data from the database, or null if no matching record is found.
   * @throws SQLException If a database access error occurs.
   */
  public static List<DocumentWithMetadata> listFromDb(Db db, String filter)
    throws SQLException {
    var theDb = db == null ? Db.getInstance() : db;
    var theResults = theDb.selectObjects(
      DocumentWithMetadata.class,
      String.format("SELECT * FROM public.\"DocumentWithDetails\" %s", filter)
    );
    if (theResults == null || theResults.size() == 0) {
      Log.warn(null, "No records found");
      return List.of();
    }
    return theResults;
  }

  /**
   * A constant representing the document type "reply-to".
   * This is used to identify documents that are replies to other documents.
   */
  public static final String DocumentTypeReplyTo = "reply-to";
}
