package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

  public void saveToDb(Db db) throws SQLException {
    if (documentId != null) {
      updateDb(db);
      return;
    }

    Integer relationshipTypeId = getOrCreateRelationshipTypeId(
      db,
      relationship
    );

    var res = db.insertAndGetGeneratedKeys(
      "INSERT INTO document_property_related_document (related_property_id, document_id, relationship_type) VALUES (?, ?, ?) RETURNING document_id",
      relatedPropertyId,
      documentId,
      relationshipTypeId
    );
    if (res == null) {
      throw new SQLException("Failed to insert DocumentRelationship");
    }
    documentId = res;
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
      "INSERT INTO document_property_relation_reason (description) VALUES (?) RETURNING relation_reason_id",
      relationship
    );
    if (res == null) {
      throw new SQLException("Failed to insert new relationship type");
    }
    return res;
  }

  public void updateDb(Db db) throws SQLException {
    if (documentId == null) {
      throw new SQLException("Cannot update record without documentId");
    }

    Integer relationshipTypeId = getOrCreateRelationshipTypeId(
      db,
      relationship
    );

    db.executeUpdate(
      "UPDATE document_property_related_document SET related_property_id = ?, relationship_type = ? WHERE document_id = ?",
      relatedPropertyId,
      relationshipTypeId,
      documentId
    );
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

  public void addToDb(Db db) throws SQLException {
    if (documentId == null) {
      throw new SQLException("Cannot add record without documentId");
    }

    Integer relationshipTypeId = getOrCreateRelationshipTypeId(
      db,
      relationship
    );

    db.executeUpdate(
      "INSERT INTO document_property_related_document (related_property_id, document_id, relationship_type) VALUES (?, ?, ?)",
      relatedPropertyId,
      documentId,
      relationshipTypeId
    );
  }
}
