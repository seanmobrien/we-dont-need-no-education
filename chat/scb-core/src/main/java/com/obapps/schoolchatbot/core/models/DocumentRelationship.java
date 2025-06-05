package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.LoggerFactory;

public class DocumentRelationship {

  private Integer sourceDocumentId;
  private Integer targetDocumentId;
  private String relationship;

  public DocumentRelationship() {}

  // Getters and Setters
  public Integer getSourceDocumentId() {
    return sourceDocumentId;
  }

  public void setSourceDocumentId(Integer sourceDocumentId) {
    this.sourceDocumentId = sourceDocumentId;
  }

  public Integer getDocumentId() {
    return getTargetDocumentId();
  }

  public Integer getTargetDocumentId() {
    return targetDocumentId;
  }

  public void setTargetDocumentId(Integer targetDocumentId) {
    this.targetDocumentId = targetDocumentId;
  }

  public void setDocumentId(Integer documentId) {
    this.setTargetDocumentId(documentId);
  }

  public String getRelationship() {
    return relationship;
  }

  public void setRelationship(String relationship) {
    this.relationship = relationship;
  }

  @Deprecated // Use getRelatedPropertyId instead
  public UUID getRelatedPropertyId() {
    Optional<UUID> v = Db.getInstanceNoThrow(null).selectSingleValue(
      "SELECT document_property_id FROM document_units WHERE document_id=$1",
      sourceDocumentId
    );
    return v.orElseThrow(() ->
      new IllegalArgumentException(
        "sourceDocumentId must be a valid document id"
      )
    );
  }

  @Deprecated // Use setRelatedPropertyId instead
  public void setRelatedPropertyId(UUID relatedPropertyId) {
    Optional<Integer> v = Db.getInstanceNoThrow(null).selectSingleValue(
      "SELECT unit_id FROM document_units WHERE document_property_id=$1",
      relatedPropertyId
    );
    v.ifPresentOrElse(this::setSourceDocumentId, () -> {
      throw new IllegalArgumentException(
        "relatedPropertyId must be a valid document property id"
      );
    });
  }

  // Builder
  public static class Builder {

    private Integer targetDocumentId;
    private String relationship;
    private UUID relatedPropertyId;
    private Integer sourceDocumentId;

    public Builder targetDocumentId(Integer documentId) {
      this.targetDocumentId = documentId;
      return this;
    }

    @Deprecated // Use targetDocumentId instead
    public Builder documentId(Integer documentId) {
      return this.targetDocumentId(documentId);
    }

    public Builder sourceDocumentId(Integer sourceDocumentId) {
      this.sourceDocumentId = sourceDocumentId;
      return this;
    }

    public Builder relationship(String relationship) {
      this.relationship = relationship;
      return this;
    }

    @Deprecated // Use sourceDocumentId instead
    public Builder relatedPropertyId(UUID relatedPropertyId) {
      this.relatedPropertyId = relatedPropertyId;
      return this;
    }

    public DocumentRelationship build() {
      DocumentRelationship documentRelationship = new DocumentRelationship();
      documentRelationship.setTargetDocumentId(this.targetDocumentId);
      documentRelationship.setRelationship(this.relationship);
      if (this.sourceDocumentId != null) {
        documentRelationship.setSourceDocumentId(this.sourceDocumentId);
      } else {
        documentRelationship.setRelatedPropertyId(this.relatedPropertyId);
      }
      return documentRelationship;
    }
  }

  // Static Builders
  public static Builder builder() {
    return new Builder();
  }

  public static List<DocumentRelationship> loadForProperty(
    Db db,
    UUID relatedPropertyId
  ) throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    return db.selectObjects(
      DocumentRelationship.class,
      "SELECT * FROM document_property_related_document WHERE related_property_id = ?",
      relatedPropertyId
    );
  }

  public static DocumentRelationship loadFromDb(Db db, Integer documentId)
    throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    var records = db.selectObjects(
      DocumentRelationship.class,
      "SELECT * FROM document_property_related_document WHERE document_id = ?",
      documentId
    );
    return records.isEmpty() ? null : records.get(0);
  }

  public void saveToDb(IDbTransaction tx) throws SQLException {
    saveToDb(tx, true);
  }

  public void saveToDb(IDbTransaction tx, Boolean isolated)
    throws SQLException {
    if (tx == null) {
      throw new IllegalArgumentException("tx cannot be null");
    }
    if (sourceDocumentId == null) {
      throw new IllegalArgumentException("sourceDocumentId cannot be null");
    }
    if (targetDocumentId == null) {
      throw new IllegalArgumentException("targetDocumentId cannot be null");
    }
    if (relationship == null) {
      throw new IllegalArgumentException("relationship cannot be null");
    }

    // We actually want these updates to commit outside of our parent scope
    // try  (var db = isolated ? tx.createUnitOfWork() : tx.getDb())  {
    var db = tx.getDb();
    // Resolve relationship type id
    Integer relationshipTypeId = getOrCreateRelationshipTypeId(
      db,
      relationship
    );

    Optional<Long> exists = db.selectSingleValue(
      """
      SELECT COUNT(*)
      FROM document_relationship
      WHERE source_document_id = ?
        AND target_document_id = ?
        AND relationship_type = ?
        """,
      sourceDocumentId,
      targetDocumentId,
      relationshipTypeId
    );
    if (exists.isPresent() && exists.get() > 0) {
      LoggerFactory.getLogger(getClass()).warn(
        "Skipping Relationship {} {} {} - already exists",
        sourceDocumentId,
        targetDocumentId,
        relationshipTypeId
      );
      return; // Already exists, no need to insert again
    }

    var res = db.executeUpdate(
      """
      INSERT INTO document_relationship
        (source_document_id, target_document_id,
        relationship_type)
      VALUES (?, ?, ?)""",
      sourceDocumentId,
      targetDocumentId,
      relationshipTypeId
    );
    if (res == 0) {
      throw new SQLException("Failed to insert DocumentRelationship");
    }
  }

  private Integer getOrCreateRelationshipTypeId(Db db, String relationship)
    throws SQLException {
    // Check if the relationship type already exists
    Optional<Integer> v = db.selectSingleValue(
      "SELECT relation_reason_id FROM document_relationship_reason WHERE description = ?",
      relationship
    );
    if (v.isPresent()) {
      return v.get();
    }
    var res = db.insertAndGetGeneratedKeys(
      "INSERT INTO document_relationship_reason (description) VALUES (?)",
      relationship
    );
    if (res == null || res < 1) {
      throw new SQLException("Failed to insert new relationship type");
    }
    return res;
  }
}
