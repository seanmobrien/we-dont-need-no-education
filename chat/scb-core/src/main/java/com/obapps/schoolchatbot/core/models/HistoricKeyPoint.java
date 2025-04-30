package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.*;
import com.obapps.core.util.sql.FieldUtil;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The {@code HistoricKeyPoint} class represents a historical key point associated with a document.
 * It extends the {@link KeyPoint} class and provides additional properties and methods for managing
 * historical data related to key points.
 *
 * <p>This class includes properties such as:
 * <ul>
 *   <li>{@code documentId} - The ID of the document associated with the key point.</li>
 *   <li>{@code fromThisMessage} - A flag indicating whether the key point originates from the current message.</li>
 *   <li>{@code policyDisplayName} - The display name of the impacted policy.</li>
 * </ul>
 *
 * <p>Key features of this class include:
 * <ul>
 *   <li>Constructors for initializing instances with or without a state bag.</li>
 *   <li>Getter and setter methods for accessing and modifying properties.</li>
 *   <li>Static methods for retrieving historical key points from the database.</li>
 * </ul>
 *
 * <p>Example usage:
 * <pre>{@code
 * // Retrieve key point history for a specific document
 * List<HistoricKeyPoint> history = HistoricKeyPoint.getKeyPointHistoryForDocument(documentId);
 * }</pre>
 *
 * <p>Note: This class interacts with the database using the {@link Db} utility class.
 *
 * @see KeyPoint
 * @see Db
 */
public class HistoricKeyPoint extends KeyPoint {

  private Boolean fromThisMessage;

  /**
   * Checks if the key point originates from the current message.
   *
   * @return {@code true} if the key point is from this message; {@code false} otherwise.
   */
  public boolean isFromThisMessage() {
    return fromThisMessage;
  }

  /**
   * Sets whether this key point originates from the current message.
   *
   * @param fromThisMessage a boolean indicating if the key point is from this message
   */
  public void setFromThisMessage(boolean fromThisMessage) {
    this.fromThisMessage = fromThisMessage;
  }

  /**
   * Default constructor for the HistoricKeyPoint class.
   * Initializes a new instance of the HistoricKeyPoint class.
   */
  public HistoricKeyPoint() {
    super();
  }

  /**
   * Constructs a new HistoricKeyPoint object and initializes its properties
   * using the provided state bag.
   *
   * @param stateBag A map containing the state data used to initialize the
   *                 HistoricKeyPoint object.
   */
  public HistoricKeyPoint(Map<String, Object> stateBag) {
    super(stateBag);
    FieldUtil.saveBooleanFromStateBag(
      stateBag,
      "from_this_message",
      this::setFromThisMessage
    );
    FieldUtil.saveFromStateBag(stateBag, "key_note", this::setPropertyValue);
  }

  public static HistoricKeyPoint getForId(
    Db db,
    UUID keyPointId,
    Integer documentContext
  ) {
    var record = db.selectRecords(
      "SELECT dp.property_id, dp.email_property_type_id, d.email_id, dp.document_id,\r\n" +
      "d.email_id=requested_doc.email_id as from_this_message,\r\n" +
      "dp.property_value AS key_note,\r\n" +
      "e_actual.sent_timestamp AS created_on, kp.relevance, kp.compliance, \r\n" +
      "kp.severity_ranking, dp.policy_basis, dp.tags, kp.inferred\t\t\r\n" +
      "FROM document_property dp    \r\n" +
      "JOIN document_units d ON \r\n" +
      "d.unit_id=dp.document_id\r\n" +
      "JOIN key_points_details kp\r\n" +
      "ON dp.property_id=kp.property_id\r\n" +
      "LEFT JOIN document_units requested_doc ON\r\n" +
      "requested_doc.unit_id=?\r\n" +
      "JOIN emails e_actual\r\n" +
      "ON d.email_id = e_actual.email_id " +
      "WHERE kp.property_id = ?",
      documentContext,
      keyPointId
    );
    return record == null || record.size() < 1
      ? null
      : new HistoricKeyPoint(record.get(0));
  }

  /**
   * Retrieves the history of key points for a specific document from the database.
   *
   * @param db The database connection object used to execute the query.
   * @param documentId The ID of the document for which the key point history is to be retrieved.
   * @return A list of {@link HistoricKeyPoint} objects representing the key point history for the specified document.
   * @throws SQLException If a database access error occurs or the query fails.
   */
  public static List<HistoricKeyPoint> getKeyPointHistoryForDocument(
    Db db,
    Integer documentId
  ) throws SQLException {
    var records = db.selectRecords(
      "SELECT * FROM document_unit_key_point_history(?, true)",
      documentId
    );

    return records.stream().map(HistoricKeyPoint::new).toList();
    /*
    var ret = new ArrayList<HistoricKeyPoint>();
    for (var record : records) {
      var keyPoint = new HistoricKeyPoint(record);
      ret.add(keyPoint);
    }
    return ret;
  */
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
  public static List<HistoricKeyPoint> searchForKeyPoints(
    Db db,
    String matchFromPolicyBasis,
    String matchFromTags,
    String matchFromSummary,
    Boolean excludeInferred,
    Integer excludeDocumentId
  ) throws SQLException {
    var matchFromPolicyBasisList = Strings.commasToList(matchFromPolicyBasis);
    var matchFromTagsList = Strings.commasToList(matchFromTags);
    return searchForKeyPoints(
      db,
      matchFromPolicyBasisList,
      matchFromTagsList,
      matchFromSummary,
      excludeInferred,
      excludeDocumentId
    );
  }

  /**
   * Searches for key points in the database based on the provided criteria.
   *
   * @param db The database instance to use for the query.
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
  public static List<HistoricKeyPoint> searchForKeyPoints(
    Db db,
    List<String> matchFromPolicyBasis,
    List<String> matchFromTags,
    String matchFromSummary,
    Boolean excludeInferred,
    Integer excludeDocumentId
  ) throws SQLException {
    var records = db.selectRecords(
      "SELECT * FROM document_unit_key_point_search(" +
      "matchPolicy => ?, matchTag => ?, matchSummary => ?," +
      "excludeInferred => ?, excludeDocumentId => ?" +
      ")",
      matchFromPolicyBasis == null
        ? null
        : matchFromPolicyBasis.size() < 1 ? null : matchFromPolicyBasis,
      matchFromTags == null
        ? null
        : matchFromTags.size() < 1 ? null : matchFromTags,
      matchFromSummary == null
        ? null
        : matchFromSummary.length() < 1 ? null : matchFromSummary,
      excludeInferred,
      excludeDocumentId < 1 ? -1 : excludeDocumentId
    );
    var ret = new ArrayList<HistoricKeyPoint>();
    for (var record : records) {
      var keyPoint = new HistoricKeyPoint(record);
      ret.add(keyPoint);
    }
    return ret;
  }

  /**
   * Builder class for creating and configuring instances of {@link HistoricKeyPoint}.
   * This builder extends {@link KeyPointBuilder} and provides additional methods
   * specific to {@link HistoricKeyPoint}.
   *
   * <p>Usage example:</p>
   * <pre>{@code
   * HistoricKeyPoint historicKeyPoint = HistoricKeyPointBuilder.builder()
   *     .fromThisMessage(true)
   *     .build();
   * }</pre>
   */
  public static class HistoricKeyPointBuilder
    extends KeyPointBuilderBase<HistoricKeyPoint, HistoricKeyPointBuilder> {

    protected HistoricKeyPointBuilder() {
      super(new HistoricKeyPoint());
    }

    public HistoricKeyPointBuilder fromThisMessage(Boolean fromThisMessage) {
      ((HistoricKeyPoint) target).setFromThisMessage(fromThisMessage);
      return (HistoricKeyPointBuilder) self();
    }

    public static HistoricKeyPointBuilder builder() {
      return new HistoricKeyPointBuilder();
    }
  }

  /**
   * Creates and returns a new instance of the {@link HistoricKeyPointBuilder}.
   * This method provides a convenient way to construct a {@link HistoricKeyPoint}
   * object using the builder pattern.
   *
   * @return a new instance of {@link HistoricKeyPointBuilder}.
   */
  public static HistoricKeyPointBuilder builder() {
    return new HistoricKeyPointBuilder();
  }
}
