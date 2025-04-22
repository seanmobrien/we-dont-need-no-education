package com.obapps.schoolchatbot.core.models;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

/**
 * Represents an email attachment entry.
 */
public class EmailAttachment {

  private Integer attachmentId;
  private String fileName;
  private String filePath;
  private String extractedText;
  private String extractedTextTsv;
  private Integer policyId;
  private String summary;
  private String emailId;
  private String mimeType;
  private Integer size;

  public EmailAttachment() {}

  public EmailAttachment(
    Integer attachmentId,
    String fileName,
    String filePath,
    String emailId,
    String mimeType,
    Integer size
  ) {
    this.attachmentId = attachmentId;
    this.fileName = fileName;
    this.filePath = filePath;
    this.emailId = emailId;
    this.mimeType = mimeType;
    this.size = size;
  }

  public Integer getAttachmentId() {
    return attachmentId;
  }

  public void setAttachmentId(Integer attachmentId) {
    this.attachmentId = attachmentId;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getFilePath() {
    return filePath;
  }

  public void setFilePath(String filePath) {
    this.filePath = filePath;
  }

  public String getExtractedText() {
    return extractedText;
  }

  public void setExtractedText(String extractedText) {
    this.extractedText = extractedText;
  }

  public String getExtractedTextTsv() {
    return extractedTextTsv;
  }

  public void setExtractedTextTsv(String extractedTextTsv) {
    this.extractedTextTsv = extractedTextTsv;
  }

  public Integer getPolicyId() {
    return policyId;
  }

  public void setPolicyId(Integer policyId) {
    this.policyId = policyId;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public String getEmailId() {
    return emailId;
  }

  public void setEmailId(String emailId) {
    this.emailId = emailId;
  }

  public String getMimeType() {
    return mimeType;
  }

  public void setMimeType(String mimeType) {
    this.mimeType = mimeType;
  }

  public Integer getSize() {
    return size;
  }

  public void setSize(Integer size) {
    this.size = size;
  }

  /**
   * Converts the current object to its JSON representation.
   *
   * @return A JSON string representation of the current object.
   * @throws RuntimeException If an error occurs during serialization.
   */
  public String toJson() {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return objectMapper.writeValueAsString(this);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error serializing " + this.getClass().getName() + " to JSON",
        e
      );
    }
  }

  public void saveToDb(Db db) throws SQLException {
    if (attachmentId != null) {
      updateDb(db);
      return;
    }
    var res = db.insertAndGetGeneratedKeys(
      "INSERT INTO email_attachments (file_name, file_path, extracted_text, extracted_text_tsv, policy_id, summary, email_id, mime_type, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING attachment_id",
      fileName,
      filePath,
      extractedText,
      extractedTextTsv,
      policyId,
      summary,
      emailId,
      mimeType,
      size
    );
    if (res == null) {
      throw new SQLException("Failed to insert EmailAttachment");
    }
    attachmentId = res;
  }

  public void updateDb(Db db) throws SQLException {
    if (attachmentId == null) {
      throw new SQLException("Cannot update record without attachmentId");
    }
    db.executeUpdate(
      "UPDATE email_attachments SET file_name = ?, file_path = ?, extracted_text = ?, extracted_text_tsv = ?, policy_id = ?, summary = ?, email_id = ?, mime_type = ?, size = ? WHERE attachment_id = ?",
      fileName,
      filePath,
      extractedText,
      extractedTextTsv,
      policyId,
      summary,
      emailId,
      mimeType,
      size,
      attachmentId
    );
  }

  public static List<EmailAttachment> loadForEmail(Db db, UUID emailId)
    throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    return db.selectObjects(
      EmailAttachment.class,
      "SELECT * FROM email_attachments WHERE email_id = ?",
      emailId
    );
  }

  public static EmailAttachment loadFromDb(Db db, Integer attachmentId)
    throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    var records = db.selectObjects(
      EmailAttachment.class,
      "SELECT * FROM email_attachments WHERE attachment_id = ?",
      attachmentId
    );
    return records.isEmpty() ? null : records.get(0);
  }
}
