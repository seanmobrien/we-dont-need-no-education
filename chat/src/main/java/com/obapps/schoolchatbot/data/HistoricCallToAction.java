package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The {@code HistoricCallToAction} class represents a historical call-to-action (CTA) associated with a document.
 * It extends the {@link CallToAction} class and provides additional functionality for managing historical data
 * related to CTAs, such as responses.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Stores a list of {@link CallToActionResponse} objects associated with the CTA.</li>
 *   <li>Provides getter and setter methods for accessing and modifying responses.</li>
 *   <li>Implements a builder pattern for constructing instances.</li>
 *   <li>Supports database operations for retrieving historical CTAs.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>{@code
 * HistoricCallToAction historicCta = HistoricCallToAction.builder()
 *     .responses(responsesList)
 *     .build();
 * }</pre>
 *
 * @see CallToAction
 * @see CallToActionResponse
 */
public class HistoricCallToAction extends CallToAction {

  private List<CallToActionResponse> responses;
  private Boolean fromThisMessage;

  /**
   * Retrieves the list of responses associated with this historical CTA.
   *
   * @return A list of {@link CallToActionResponse} objects.
   */
  public List<CallToActionResponse> getResponses() {
    return responses;
  }

  /**
   * Sets the list of responses associated with this historical CTA.
   *
   * @param responses A list of {@link CallToActionResponse} objects to associate with this CTA.
   */
  public void setResponses(List<CallToActionResponse> responses) {
    this.responses = responses;
  }

  /**
   * Checks if the call-to-action originates from the current message.
   *
   * @return {@code true} if the call-to-action is from this message; {@code false} otherwise.
   */
  public boolean isFromThisMessage() {
    return fromThisMessage;
  }

  /**
   * Sets whether this call-to-action originates from the current message.
   *
   * @param fromThisMessage a boolean indicating if the call-to-action is from this message
   */
  public void setFromThisMessage(boolean fromThisMessage) {
    this.fromThisMessage = fromThisMessage;
  }

  public Double getAggregateComplianceScore() {
    var r = this.getResponses().toArray();
    if (r.length == 0) {
      return 0.0;
    }
    var r2 = this.responses.getLast();
    return r2 == null
      ? this.getComplianceMessage()
      : r2.getComplianceAggregate();
  }

  /**
   * Default constructor for the {@code HistoricCallToAction} class.
   * Initializes a new instance with default values.
   */
  public HistoricCallToAction() {
    super();
  }

  /**
   * Constructs a {@code HistoricCallToAction} object and initializes its fields using the provided state bag.
   *
   * @param stateBag A map containing key-value pairs used to initialize the properties of the {@code HistoricCallToAction} object.
   */
  public HistoricCallToAction(Map<String, Object> stateBag) {
    super(stateBag);
    Db.saveBooleanFromStateBag(
      stateBag,
      "from_this_message",
      this::setFromThisMessage
    );
    Db.saveFromStateBag(stateBag, "action_description", this::setPropertyValue);
    if (this.getOpenedDate() == null) {
      Db.saveLocalDateFromStateBag(
        stateBag,
        "response_timestamp",
        this::setOpenedDate
      );
    }
  }

  /**
   * A builder class for constructing instances of {@link HistoricCallToAction}.
   * This class extends {@link CallToActionBuilderBase} and provides additional methods
   * specific to {@link HistoricCallToAction}.
   *
   * <p>Example usage:</p>
   * <pre>{@code
   * HistoricCallToAction historicCta = HistoricCallToAction.builder()
   *     .responses(responsesList)
   *     .build();
   * }</pre>
   */
  public static class HistoricCallToActionBuilder
    extends CallToActionBuilderBase<
      HistoricCallToAction,
      HistoricCallToActionBuilder
    > {

    /**
     * Constructor for the {@code HistoricCallToActionBuilder}.
     * Initializes a new builder instance with a target {@link HistoricCallToAction} object.
     */
    protected HistoricCallToActionBuilder() {
      super(new HistoricCallToAction());
    }

    /**
     * Sets the list of responses for the {@link HistoricCallToAction}.
     *
     * @param responses A list of {@link CallToActionResponse} objects to associate with the CTA.
     * @return The builder instance for method chaining.
     */
    public <B2 extends HistoricCallToActionBuilder> B2 responses(
      List<CallToActionResponse> responses
    ) {
      target.setResponses(responses);
      return self();
    }

    /**
     * Creates and returns a new instance of the {@code HistoricCallToActionBuilder}.
     *
     * @return A new {@link HistoricCallToActionBuilder} instance.
     */
    public static HistoricCallToActionBuilder builder() {
      return new HistoricCallToActionBuilder();
    }
  }

  /**
   * Retrieves a list of {@link HistoricCallToAction} objects for a specific document from the database.
   * This method uses the `document_unit_cta_history` PostgreSQL function to fetch the data.
   *
   * @param db The database connection object used to execute the query.
   * @param documentId The ID of the document for which the historical CTAs are to be retrieved.
   * @return A list of {@link HistoricCallToAction} objects representing the historical CTAs for the specified document.
   * @throws SQLException If a database access error occurs or the query fails.
   */
  public static List<HistoricCallToAction> getCallsToActionForDocument(
    Db db,
    int documentId
  ) throws SQLException {
    var records = db.selectRecords(
      "SELECT * FROM document_unit_cta_history(?, true)",
      documentId
    );

    var result = new ArrayList<HistoricCallToAction>();
    Map<UUID, HistoricCallToAction> actionMap = new HashMap<>();

    for (var record : records) {
      UUID actionPropertyId = (UUID) record.get("action_property_id");
      HistoricCallToAction action = actionMap.get(actionPropertyId);

      if (action == null) {
        action = new HistoricCallToAction(record);
        action.setResponses(new ArrayList<>());
        actionMap.put(actionPropertyId, action);
        result.add(action);
      } else {
        CallToActionResponse response = new CallToActionResponse(record);
        Db.saveFromStateBag(
          record,
          "action_description",
          response::setPropertyValue
        );
        action.getResponses().add(response);
      }
    }

    return result;
  }
}
