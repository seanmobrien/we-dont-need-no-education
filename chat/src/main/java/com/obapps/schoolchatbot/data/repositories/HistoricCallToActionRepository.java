package com.obapps.schoolchatbot.data.repositories;

import com.obapps.schoolchatbot.data.HistoricCallToAction;
import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.List;

/**
 * The {@code HistoricCallToActionRepository} class provides methods for interacting with
 * the database to retrieve historical call-to-action (CTA) records associated with documents.
 *
 * <p>This repository includes methods to:
 * <ul>
 *   <li>Retrieve the history of CTAs for a specific document.</li>
 * </ul>
 *
 * <p>All database interactions are facilitated through the singleton instance of the
 * {@link Db} class, unless a custom instance is provided.
 *
 * <p>Methods in this class may throw {@link SQLException} if a database access error occurs.
 */
public class HistoricCallToActionRepository {

  private Db _db;

  /**
   * Default constructor that uses the singleton instance of {@link Db}.
   */
  public HistoricCallToActionRepository() {
    this._db = null;
  }

  /**
   * Constructor that allows injecting a custom {@link Db} instance.
   *
   * @param db The custom {@link Db} instance to use.
   */
  public HistoricCallToActionRepository(Db db) {
    this._db = db;
  }

  /**
   * Provides access to the database instance used by this repository.
   *
   * @return The {@link Db} instance used by this repository.
   * @throws SQLException
   */
  public Db db() throws SQLException {
    if (this._db == null) {
      this._db = Db.getInstance();
    }
    return this._db;
  }

  /**
   * Retrieves the history of CTAs associated with a specific document.
   *
   * @param documentId the ID of the document for which the CTA history is to be retrieved
   * @return a list of {@link HistoricCallToAction} objects representing the CTA history for the specified document
   * @throws SQLException if a database access error occurs
   */
  public List<HistoricCallToAction> getCallToActionHistoryForDocument(
    Integer documentId
  ) throws SQLException {
    return HistoricCallToAction.getCallsToActionForDocument(db(), documentId);
  }
}
