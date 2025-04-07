package com.obapps.schoolchatbot.data.repositories;

import com.obapps.schoolchatbot.data.HistoricKeyPoint;
import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.List;

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
 * {@link Db} class.
 *
 * <p>Methods in this class may throw {@link SQLException} if a database access error occurs.
 */
public class HistoricKeyPointRepository {

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

  /**
   * Provides access to the singleton instance of the database.
   *
   * @return The singleton instance of the {@link Db} class.
   * @throws SQLException If a database access error occurs.
   */
  public Db db() throws SQLException {
    return Db.getInstance();
  }
}
