package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
  private String policyDisplayName;

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
   * Sets the display name of the policy.
   *
   * @param fromThisMessage the new display name to be set for the policy
   */
  public void setPolicyDisplayName(String fromThisMessage) {
    this.policyDisplayName = fromThisMessage;
  }

  /**
   * Retrieves the display name of the policy.
   *
   * @return the policy display name as a {@code String}.
   */
  public String getPolicyDisplayName() {
    return this.policyDisplayName;
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
    Db.saveBooleanFromStateBag(
      stateBag,
      "from_this_message",
      this::setFromThisMessage
    );
    Db.saveFromStateBag(
      stateBag,
      "impacted_policy",
      this::setPolicyDisplayName
    );
    Db.saveBooleanFromStateBag(
      stateBag,
      "from_this_message",
      this::setFromThisMessage
    );
    Db.saveFromStateBag(stateBag, "key_note", this::setPropertyValue);
  }

  /**
   * Retrieves the history of key points associated with a specific document.
   *
   * @param documentId the ID of the document for which the key point history is to be retrieved
   * @return a list of {@link HistoricKeyPoint} objects representing the key point history for the specified document
   * @throws SQLException if a database access error occurs
   */
  public static List<HistoricKeyPoint> getKeyPointHistoryForDocument(
    Integer documentId
  ) throws SQLException {
    return getKeyPointHistoryForDocument(Db.getInstance(), documentId);
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
    // TODO: Fix
    return new ArrayList<HistoricKeyPoint>();
    /*
    var records = db.selectRecords(
      "SELECT * FROM document_unit_key_point_history(?)",
      documentId
    );
    var ret = new ArrayList<HistoricKeyPoint>();
    for (var record : records) {
      var keyPoint = new HistoricKeyPoint(record);
      ret.add(keyPoint);
    }
    return ret;
    */
  }

  public static class HistoricKeyPointBuilder extends KeyPointBuilder {

    protected HistoricKeyPointBuilder() {
      super(new HistoricKeyPoint());
    }

    public HistoricKeyPointBuilder fromThisMessage(Boolean fromThisMessage) {
      ((HistoricKeyPoint) target).setFromThisMessage(fromThisMessage);
      return (HistoricKeyPointBuilder) self();
    }

    public HistoricKeyPointBuilder policyDisplayName(String policyDisplayName) {
      ((HistoricKeyPoint) target).setPolicyDisplayName(policyDisplayName);
      return (HistoricKeyPointBuilder) self();
    }

    public static HistoricKeyPointBuilder builder() {
      return new HistoricKeyPointBuilder();
    }
  }

  public static HistoricKeyPointBuilder builder() {
    return new HistoricKeyPointBuilder();
  }
}
