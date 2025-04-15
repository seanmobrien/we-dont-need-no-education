package com.obapps.schoolchatbot.core.repositories;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.HistoricKeyPoint;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

/**
 * The {@code HistoricKeyPointRepository} class provides methods for interacting with
 * the database to retrieve and search for historical key points associated with documents.
 *
 * <p>This repository includes methods to:
 * <ul>
 *   <li>Retrieve the history of key points for a specific document.</li>
 *   <li>Search for key points based on various criteria, including policy basis, tags,
 *       summary, inferred status, and document exclusions.</li>
 * </ul>
 *
 * <p>All database interactions are facilitated through the singleton instance of the
 * {@link Db} class, unless a custom instance is provided.
 *
 * <p>Methods in this class may throw {@link SQLException} if a database access error occurs.
 */
public class HistoricKeyPointRepository {

  private Db _db;

  /**
   * Default constructor that uses the singleton instance of {@link Db}.
   */
  public HistoricKeyPointRepository() {
    this._db = null;
  }

  /**
   * Constructor that allows injecting a custom {@link Db} instance.
   *
   * @param db The custom {@link Db} instance to use.
   */
  public HistoricKeyPointRepository(Db db) {
    this._db = db;
  }

  /**
   * Provides access to the database instance used by this repository.
   *
   * @return The {@link Db} instance used by this repository.
   * @throws SQLException
   */
  public Db db() throws SQLException {
    this._db = this._db == null ? Db.getInstance() : this._db;
    return this._db;
  }

  /**
   * Retrieves the history of key points associated with a specific document.
   *
   * @param documentId the ID of the document for which the key point history is to be retrieved
   * @return a list of {@link HistoricKeyPoint} objects representing the key point history for the specified document
   * @throws SQLException if a database access error occurs
   */
  public List<HistoricKeyPoint> getKeyPointHistoryForDocument(
    Integer documentId
  ) throws SQLException {
    return HistoricKeyPoint.getKeyPointHistoryForDocument(db(), documentId);
  }

  /**
   * Retrieves the history of key points associated with a specific document.
   *
   * @param keyPointId the property id value of the record to return.
   * @param documentId the ID of the document for which the value of isFromThisMessage should be derived.
   * @return a {@link HistoricKeyPoint} object containing the requested key point.
   * @throws SQLException if a database access error occurs
   * @apiNote The isFromThisMessage property will always be set to true when this overload is used.
   */
  public HistoricKeyPoint getKeyPointHistory(UUID keyPointId)
    throws SQLException {
    return getKeyPointHistory(keyPointId, null);
  }

  /**
   * Retrieves the history of key points associated with a specific document.
   *
   * @param keyPointId the property id value of the record to return.
   * @param documentId the ID of the document for which the value of isFromThisMessage should be derived.
   * @return a {@link HistoricKeyPoint} object containing the requested key point.
   * @throws SQLException if a database access error occurs
   */
  public HistoricKeyPoint getKeyPointHistory(
    UUID keyPointId,
    Integer documentContext
  ) throws SQLException {
    if (keyPointId == null) {
      return null;
    }
    return HistoricKeyPoint.getForId(db(), keyPointId, documentContext);
  }

  /**
   * Searches for key points in the database based on the provided criteria.
   *
   * @param matchFromPolicyBasis A comma-delimited list of policy basis strings to match against.
   *                             If null or empty, this criterion is ignored.
   * @param matchFromTags A comma-delimited list of tags to match against.
   *                      If null or empty, this criterion is ignored.
   * @param matchFromSummary A summary string to match against.
   *                         If null or empty, this criterion is ignored.
   * @param excludeInferred A boolean indicating whether to exclude inferred key points.
   * @param excludeDocumentId An integer representing the document ID to exclude from the results.
   *                          If less than 1, this criterion is ignored.
   * @return A list of {@code HistoricKeyPoint} objects that match the search criteria.
   * @throws SQLException If a database access error occurs.
   */
  public List<HistoricKeyPoint> searchForKeyPoints(
    String matchFromPolicyBasis,
    String matchFromTags,
    String matchFromSummary,
    Boolean excludeInferred,
    Integer excludeDocumentId
  ) throws SQLException {
    return HistoricKeyPoint.searchForKeyPoints(
      db(),
      matchFromPolicyBasis,
      matchFromTags,
      matchFromSummary,
      excludeInferred,
      excludeDocumentId
    );
  }

  /**
   * Searches for key points in the database based on the provided criteria.
   *
   * @param matchFromPolicyBasis A list of policy basis strings to match against.
   *                             If null or empty, this criterion is ignored.
   * @param matchFromTags A list of tags to match against.
   *                      If null or empty, this criterion is ignored.
   * @param matchFromSummary A summary string to match against.
   *                         If null or empty, this criterion is ignored.
   * @param excludeInferred A boolean indicating whether to exclude inferred key points.
   * @param excludeDocumentId An integer representing the document ID to exclude from the results.
   *                          If less than 1, this criterion is ignored.
   * @return A list of {@code HistoricKeyPoint} objects that match the search criteria.
   * @throws SQLException If a database access error occurs.
   */
  public List<HistoricKeyPoint> searchForKeyPoints(
    List<String> matchFromPolicyBasis,
    List<String> matchFromTags,
    String matchFromSummary,
    Boolean excludeInferred,
    Integer excludeDocumentId
  ) throws SQLException {
    return HistoricKeyPoint.searchForKeyPoints(
      db(),
      matchFromPolicyBasis,
      matchFromTags,
      matchFromSummary,
      excludeInferred,
      excludeDocumentId
    );
  }
}
