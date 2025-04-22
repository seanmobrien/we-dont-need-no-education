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
    return this.content;
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

    public Builder setDocumentId(Integer documentId) {
      this.documentId = documentId;
      return this;
    }

    public Builder setContent(String contents) {
      this.content = contents;
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
      emailMetadata.content = this.content;
      emailMetadata.subject = this.subject;
      emailMetadata.senderRole = this.senderRole;
      emailMetadata.replyToDocumentId = this.replyToDocumentId;
      emailMetadata.relatedDocuments = this.relatedDocuments;

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
    return fromDb(Db.getInstance(), documentId);
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
    var theDb = db == null ? Db.getInstance() : db;
    var theResults = theDb.selectObjects(
      DocumentWithMetadata.class,
      "SELECT * FROM public.\"DocumentWithDetails\" WHERE document_id=?",
      documentId
    );
    if (theResults == null || theResults.size() == 0) {
      return null;
    }
    return theResults.get(0);
    /*
    var resultset = Db.getInstance()
      .selectRecords(
        "SELECT du.unit_id AS document_id, du.content, du.document_type, e.email_id, e.sender_id, " +
        "e.subject, e.thread_id, e.sent_timestamp, e.parent_id, c.name AS sender_name, " +
        "c.role_dscr, document_unit_related_emails(du.unit_id) AS related_emails " +
        "FROM document_units du " +
        "JOIN emails e ON du.email_id=e.email_id " +
        "JOIN contacts c ON e.sender_id=c.contact_id " +
        "WHERE du.unit_id = ?",
        documentId
      );
    if (resultset == null || resultset.size() == 0) {
      return null;
    }
    var record = resultset.get(0);    
    var b = builder();
    Db.saveFromStateBag(record, "content", b::setContent);
    Db.saveFromStateBag(record, "document_type", b::setDocumentType);
    Db.saveUuidFromStateBag(record, "email_id", b::setEmailId);
    Db.saveLocalDateTimeFromStateBag(
      record,
      "sent_timestamp",
      b::setDocumentSendDate
    );
    Db.saveFromStateBag(record, "sender_name", b::setSender);
    Db.saveFromStateBag(record, "role_dscr", b::setSenderRole);
    Db.saveUuidFromStateBag(record, "replyToEmail", b::setReplyToEmailId);
    Db.saveStringArrayFromStateBag(
      record,
      "related_emails",
      b::setRelatedEmails
    );
    Db.saveFromStateBag(record, "subject", b::setSubject);
    Db.saveIntFromStateBag(record, "thread_id", b::setThreadId);
    Db.saveIntFromStateBag(record, "document_id", b::setDocumentId);
    return b.build();
    */

  }
}
