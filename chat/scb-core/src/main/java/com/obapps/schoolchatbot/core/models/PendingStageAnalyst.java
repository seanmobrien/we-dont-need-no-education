package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents an analyst for pending stages, containing information about a document,
 * its type, associated email ID, and the timestamp when it was sent.
 */
public class PendingStageAnalyst {

  private Integer documentId;
  private String documentType;
  private UUID emailId;
  private LocalDateTime sentTimestamp;

  /**
   * Gets the ID of the document.
   *
   * @return the document ID
   */
  public Integer getDocumentId() {
    return documentId;
  }

  /**
   * Gets the type of the document.
   *
   * @return the document type
   */
  public String getDocumentType() {
    return documentType;
  }

  /**
   * Gets the email ID associated with the document.
   *
   * @return the email ID
   */
  public UUID getEmailId() {
    return emailId;
  }

  /**
   * Gets the timestamp when the document was sent.
   *
   * @return the sent timestamp
   */
  public LocalDateTime getSentTimestamp() {
    return sentTimestamp;
  }

  /**
   * Sets the ID of the document.
   *
   * @param documentId the document ID to set
   */
  public void setDocumentId(Integer documentId) {
    this.documentId = documentId;
  }

  /**
   * Sets the type of the document.
   *
   * @param documentType the document type to set
   */
  public void setDocumentType(String documentType) {
    this.documentType = documentType;
  }

  /**
   * Sets the email ID associated with the document.
   *
   * @param emailId the email ID to set
   */
  public void setEmailId(UUID emailId) {
    this.emailId = emailId;
  }

  /**
   * Sets the timestamp when the document was sent.
   *
   * @param sentTimestamp the sent timestamp to set
   */
  public void setSentTimestamp(LocalDateTime sentTimestamp) {
    this.sentTimestamp = sentTimestamp;
  }

  /**
   * Loads a list of PendingStageAnalyst objects for a specific stage from the database.
   *
   * @param db      The database instance to use for querying.
   * @param stageId The ID of the stage for which to load the pending analysts.
   * @return A sorted list of PendingStageAnalyst objects, ordered by their sent timestamp.
   */
  public static List<PendingStageAnalyst> loadForStage(Db db, Integer stageId) {
    var ret = db.selectObjects(
      PendingStageAnalyst.class,
      "SELECT * from document_unit_pending(?)",
      stageId
    );
    return ret
      .stream()
      .sorted((a, b) ->
        Objects.requireNonNullElse(
          a.getSentTimestamp(),
          LocalDateTime.MAX
        ).compareTo(
          Objects.requireNonNullElse(b.getSentTimestamp(), LocalDateTime.MAX)
        )
      )
      .toList();
  }

  /**
   * Creates and returns a new instance of the {@link Builder} class.
   * This method is used to initialize and configure a new Builder object
   * for constructing instances of the enclosing class.
   *
   * @return a new {@link Builder} instance
   */
  public static Builder builder() {
    return new Builder();
  }

  /**
   * Builder class for constructing instances of {@link PendingStageAnalyst}.
   */
  public static class Builder {

    private Integer documentId;
    private String documentType;
    private UUID emailId;
    private LocalDateTime sentTimestamp;

    /**
     * Sets the document ID for the builder.
     *
     * @param documentId the document ID to set
     * @return the builder instance
     */
    public Builder documentId(Integer documentId) {
      this.documentId = documentId;
      return this;
    }

    /**
     * Sets the document type for the builder.
     *
     * @param documentType the document type to set
     * @return the builder instance
     */
    public Builder documentType(String documentType) {
      this.documentType = documentType;
      return this;
    }

    /**
     * Sets the email ID for the builder.
     *
     * @param emailId the email ID to set
     * @return the builder instance
     */
    public Builder emailId(UUID emailId) {
      this.emailId = emailId;
      return this;
    }

    /**
     * Sets the sent timestamp for the builder.
     *
     * @param sentTimestamp the sent timestamp to set
     * @return the builder instance
     */
    public Builder sentTimestamp(LocalDateTime sentTimestamp) {
      this.sentTimestamp = sentTimestamp;
      return this;
    }

    /**
     * Builds and returns a new {@link PendingStageAnalyst} instance.
     *
     * @return a new instance of {@link PendingStageAnalyst}
     */
    public PendingStageAnalyst build() {
      PendingStageAnalyst pendingStageAnalyst = new PendingStageAnalyst();
      pendingStageAnalyst.setDocumentId(this.documentId);
      pendingStageAnalyst.setDocumentType(this.documentType);
      pendingStageAnalyst.setEmailId(this.emailId);
      pendingStageAnalyst.setSentTimestamp(this.sentTimestamp);
      return pendingStageAnalyst;
    }
  }
}
