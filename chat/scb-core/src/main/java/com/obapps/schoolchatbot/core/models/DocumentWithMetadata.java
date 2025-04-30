package com.obapps.schoolchatbot.core.models;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.core.util.*;
import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentWithMetadata implements IMessageMetadata {

  Integer documentId = null;
  UUID emailId = null;
  String documentType = "email";
  String sender = null;
  String recipients = null;
  LocalDateTime documentSendDate = null;
  String content = null;
  Boolean isFromDistrictStaff;
  String subject;
  Integer threadId;
  private String senderRole;
  private Integer replyToDocumentId;
  private List<Integer> relatedDocuments;
  private List<Integer> attachments;

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
   * A constant representing the document type "reply-to".
   * This is used to identify documents that are replies to other documents.
   */
  public static final String DocumentTypeReplyTo = "reply-to";
}
