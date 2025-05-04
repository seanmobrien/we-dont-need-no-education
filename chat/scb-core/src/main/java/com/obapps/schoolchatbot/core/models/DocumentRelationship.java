package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.LoggerFactory;

public class DocumentRelationship {

  private Integer documentId;
  private String relationship;
  private UUID relatedPropertyId;

  public DocumentRelationship() {}

  // Getters and Setters
  public Integer getDocumentId() {
    return documentId;
  }

  public void setDocumentId(Integer documentId) {
    this.documentId = documentId;
  }

  public String getRelationship() {
    return relationship;
  }

  public void setRelationship(String relationship) {
    this.relationship = relationship;
  }

  public UUID getRelatedPropertyId() {
    return relatedPropertyId;
  }

  public void setRelatedPropertyId(UUID relatedPropertyId) {
    this.relatedPropertyId = relatedPropertyId;
  }

  // Builder
  public static class Builder {

    private Integer documentId;
    private String relationship;
    private UUID relatedPropertyId;

    public Builder documentId(Integer documentId) {
      this.documentId = documentId;
      return this;
    }

    public Builder relationship(String relationship) {
      this.relationship = relationship;
      return this;
    }

    public Builder relatedPropertyId(UUID relatedPropertyId) {
      this.relatedPropertyId = relatedPropertyId;
      return this;
    }

    public DocumentRelationship build() {
      DocumentRelationship documentRelationship = new DocumentRelationship();
      documentRelationship.setDocumentId(this.documentId);
      documentRelationship.setRelationship(this.relationship);
      documentRelationship.setRelatedPropertyId(this.relatedPropertyId);
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
    if (tx == null) {
      throw new IllegalArgumentException("tx cannot be null");
    }
    if (relatedPropertyId == null) {
      throw new IllegalArgumentException("relatedPropertyId cannot be null");
    }
    if (documentId == null) {
      throw new IllegalArgumentException("documentId cannot be null");
    }
    if (relationship == null) {
      throw new IllegalArgumentException("relationship cannot be null");
    }

    // We actually want these updates to commit outside of our parent scope
    try (var db = tx.createUnitOfWork()) {
      // Resolve relationship type id
      Integer relationshipTypeId = getOrCreateRelationshipTypeId(
        db,
        relationship
      );

      Optional<Long> exists = db.selectSingleValue(
        """
        SELECT COUNT(*)
        FROM document_property_related_document
        WHERE related_property_id = ?
          AND document_id = ?
          AND relationship_type = ?
          """,
        relatedPropertyId,
        documentId,
        relationshipTypeId
      );
      if (exists.isPresent() && exists.get() > 0) {
        LoggerFactory.getLogger(getClass()).warn(
          "Skipping Relationship {} {} {} - already exists",
          relatedPropertyId,
          documentId,
          relationshipTypeId
        );
        return; // Already exists, no need to insert again
      }

      var res = db.executeUpdate(
        "INSERT INTO document_property_related_document (related_property_id, document_id, relationship_type) VALUES (?, ?, ?)",
        relatedPropertyId,
        documentId,
        relationshipTypeId
      );
      if (res == 0) {
        throw new SQLException("Failed to insert DocumentRelationship");
      }
    }
  }

  private Integer getOrCreateRelationshipTypeId(Db db, String relationship)
    throws SQLException {
    Optional<Integer> v = db.selectSingleValue(
      "SELECT relation_reason_id FROM document_property_relation_reason WHERE description = ?",
      relationship
    );
    if (v.isPresent()) {
      return v.get();
    }

    var res = db.insertAndGetGeneratedKeys(
      "INSERT INTO document_property_relation_reason (description) VALUES (?)",
      relationship
    );
    if (res == null || res < 1) {
      throw new SQLException("Failed to insert new relationship type");
    }
    return res;
  }
}
