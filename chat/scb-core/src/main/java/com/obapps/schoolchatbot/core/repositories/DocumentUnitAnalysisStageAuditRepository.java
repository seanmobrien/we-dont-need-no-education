package com.obapps.schoolchatbot.core.repositories;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisStageAudit;
import java.sql.SQLException;
import java.util.List;

/**
 * Repository for managing {@link DocumentUnitAnalysisStageAudit} entities.
 */
public class DocumentUnitAnalysisStageAuditRepository {

  private Db _db;

  /**
   * Default constructor that uses the singleton instance of {@link Db}.
   */
  public DocumentUnitAnalysisStageAuditRepository() {
    this._db = null;
  }

  /**
   * Constructor that allows injecting a custom {@link Db} instance.
   *
   * @param db The custom {@link Db} instance to use.
   */
  public DocumentUnitAnalysisStageAuditRepository(Db db) {
    this._db = db;
  }

  /**
   * Provides access to the database instance used by this repository.
   *
   * @return The {@link Db} instance used by this repository.
   * @throws SQLException If a database access error occurs.
   */
  public Db db() throws SQLException {
    this._db = this._db == null ? Db.getInstance() : this._db;
    return this._db;
  }

  /**
   * Saves a {@link DocumentUnitAnalysisStageAudit} entity to the database.
   *
   * @param audit The entity to save.
   * @throws SQLException If a database access error occurs.
   */
  public void save(DocumentUnitAnalysisStageAudit audit) throws SQLException {
    audit.saveToDb(db());
  }

  /**
   * Loads a {@link DocumentUnitAnalysisStageAudit} entity from the database by its ID.
   *
   * @param analysisAuditId The ID of the entity to load.
   * @return The loaded entity, or {@code null} if not found.
   * @throws SQLException If a database access error occurs.
   */
  public DocumentUnitAnalysisStageAudit load(Integer analysisAuditId)
    throws SQLException {
    return DocumentUnitAnalysisStageAudit.loadFromDb(db(), analysisAuditId);
  }

  /**
   * Retrieves all {@link DocumentUnitAnalysisStageAudit} entries for a specific document.
   *
   * @param documentId The ID of the document.
   * @return A list of matching entries.
   * @throws SQLException If a database access error occurs.
   */
  public List<DocumentUnitAnalysisStageAudit> findByDocumentId(
    Integer documentId
  ) throws SQLException {
    return db()
      .selectObjects(
        DocumentUnitAnalysisStageAudit.class,
        "SELECT * FROM document_unit_analysis_stage_audit WHERE document_id = ?",
        documentId
      );
  }
}
