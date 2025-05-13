package com.obapps.schoolchatbot.core.models;

import com.esotericsoftware.minlog.Log;
import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import com.obapps.core.util.sql.FieldUtil;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The {@code HistoricCallToAction} class represents a historical call-to-action (CTA)
 * that extends the base {@link CallToAction} class. It includes additional properties
 * and methods specific to historical CTAs, such as responses and metadata about
 * whether the CTA originates from the current message.
 *
 * <p>This class provides functionality to:
 * <ul>
 *   <li>Retrieve and set a list of {@link CallToActionResponse} objects associated with the CTA.</li>
 *   <li>Determine if the CTA originates from the current message.</li>
 *   <li>Calculate an aggregate compliance score based on the associated responses.</li>
 *   <li>Initialize its properties using a state bag or database records.</li>
 *   <li>Retrieve historical CTAs for a specific document from the database.</li>
 * </ul>
 *
 * <p>It also includes a nested {@link HistoricCallToActionBuilder} class for constructing
 * instances of {@code HistoricCallToAction} using a builder pattern.
 *
 * <p>Example usage:
 * <pre>{@code
 * HistoricCallToAction historicCta = HistoricCallToAction.builder()
 *     .responses(responsesList)
 *     .build();
 * }</pre>
 *
 * <p>Database integration is supported for fetching historical CTAs using the
 * `document_unit_cta_history` PostgreSQL function.
 *
 * @see CallToAction
 * @see CallToActionResponse
 * @see HistoricCallToActionBuilder
 */
public class HistoricCallToAction extends CallToAction {

  private List<CallToActionCategory> categories;

  private List<CallToActionResponse> responses;
  private Boolean fromThisMessage = false;

  /**
   * Retrieves the list of categories associated with this historical CTA.
   *
   * @return A list of {@link CallToActionCategory} objects.
   */
  public List<CallToActionCategory> getCategories() {
    return categories;
  }

  /**
   * Sets the list of categories associated with this historical CTA.
   *
   * @param categories A list of {@link CallToActionCategory} objects to associate with this CTA.
   */
  public void setCategories(List<CallToActionCategory> categories) {
    this.categories = categories;
  }

  public void setRelatedDocuments(List<DocumentRelationship> documents) {
    if (documents != null && !documents.isEmpty()) {
      this.relatedDocuments = documents;
    }
  }

  public List<DocumentRelationship> getRelatedDocuments() {
    return relatedDocuments;
  }

  private List<DocumentRelationship> relatedDocuments;

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
  public Boolean isFromThisMessage() {
    return fromThisMessage == null ? false : fromThisMessage;
  }

  /**
   * Sets whether this call-to-action originates from the current message.
   *
   * @param fromThisMessage a boolean indicating if the call-to-action is from this message
   */
  public void setFromThisMessage(boolean fromThisMessage) {
    this.fromThisMessage = fromThisMessage;
  }

  /**
   * Calculates and returns the aggregate compliance score for the current object.
   *
   * @return The aggregate compliance score as a Double. If there are no responses,
   *         the method returns 0.0. If the last response is null, it retrieves the
   *         compliance message; otherwise, it retrieves the compliance aggregate
   *         from the last response.
  public Double getAggregateComplianceScore() {
    var r = this.getResponses().toArray();
    if (r.length == 0) {
      return 0.0;
    }
    var r2 = this.responses.getLast();
    return r2 == null
      ? this.getComplianceRating()
      : r2.getComplianceAggregate();
  }
   */

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
    FieldUtil.saveBooleanFromStateBag(
      stateBag,
      "from_this_message",
      this::setFromThisMessage
    );
    FieldUtil.saveFromStateBag(
      stateBag,
      "action_description",
      this::setPropertyValue
    );
    if (this.getOpenedDate() == null) {
      FieldUtil.saveLocalDateFromStateBag(
        stateBag,
        "response_timestamp",
        this::setOpenedDate
      );
    }
  }

  /*
  @SuppressWarnings("unchecked")
  public HistoricCallToAction addToDb(IDbTransaction tx) throws SQLException {
    super.addToDb(tx);
    addRelationshipsToDb(tx);
    return this;
  }
   

  @SuppressWarnings("unchecked")
  @Override
  public HistoricCallToAction updateDb(IDbTransaction tx) throws SQLException {
    super.updateDb(tx);
    var db = tx.getDb();
    db.executeUpdate(
      "DELETE FROM document_property_call_to_action_category WHERE property_id=?",
      this.getPropertyId()
    );
    addRelationshipsToDb(tx);
    return this;
  }
  */
  void addRelationshipsToDb(IDbTransaction tx) {
    for (DocumentRelationship doc : this.getRelatedDocuments()) {
      doc.setRelatedPropertyId(getPropertyId());
      try {
        doc.saveToDb(tx);
      } catch (SQLException e) {
        Log.warn(
          String.format(
            "Unexpected failure occurred adding document relationship.\nDocument id: %s\nProperty Id: %s\nRelationship: %s",
            doc.getDocumentId(),
            this.getPropertyId(),
            doc.getRelationship()
          ),
          e
        );
      }
    }
  }

  @SuppressWarnings("unchecked")
  public HistoricCallToAction updateDb(IDbTransaction tx) throws SQLException {
    super.updateDb(tx);
    var db = tx.getDb();
    db.executeUpdate(
      "DELETE FROM document_property_call_to_action_category WHERE property_id=?",
      this.getPropertyId()
    );
    addRelationshipsToDb(tx);
    return this;
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
     * Sets the list of categories for the {@link HistoricCallToAction} in the builder.
     *
     * @param categories A list of {@link CallToActionCategory} objects to associate with the CTA.
     * @return The builder instance for method chaining.
     */
    public <B2 extends HistoricCallToActionBuilder> B2 categories(
      List<CallToActionCategory> categories
    ) {
      target.setCategories(categories);
      return self();
    }

    /**
     * Sets the list of categories for the {@link HistoricCallToAction} in the builder.
     *
     * @param categories A list of {@link CallToActionCategory} objects to associate with the CTA.
     * @return The builder instance for method chaining.
     */
    public <B2 extends HistoricCallToActionBuilder> B2 relatedDocuments(
      List<DocumentRelationship> documents
    ) {
      target.setRelatedDocuments(documents);
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
        CallToActionResponse response = CallToActionResponse.loadFromDb(
          db,
          (UUID) record.get("document_property_id")
        );
        FieldUtil.saveFromStateBag(
          record,
          "action_description",
          response::setPropertyValue
        );
        action.getResponses().add(response);
      }
    }

    return result;
  }

  public static HistoricCallToAction getCallsToAction(Db db, UUID id)
    throws SQLException {
    return getCallsToAction(db, id, true, true);
  }

  public static HistoricCallToAction getCallsToAction(
    Db db,
    UUID id,
    Boolean loadResponses,
    Boolean loadCategories
  ) throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    var cta = db
      .selectRecords("SELECT * FROM \"CallToAction\" WHERE property_id = ?", id)
      .stream()
      .map(record -> {
        var action = new HistoricCallToAction(record);
        action.setResponses(new ArrayList<>());
        action.setCategories(new ArrayList<>());
        return action;
      })
      .collect(Collectors.toList())
      .stream()
      .findFirst() // Changed from getFirst() to findFirst()
      .orElse(null);
    if (cta == null) {
      return null;
    }
    if (loadResponses) {
      cta.responses = db
        .selectObjects(
          CallToActionResponse.class,
          "SELECT * FROM \"ResponsiveAction\" WHERE action_property_id = ?",
          id
        )
        .stream()
        .toList();
    }
    if (loadCategories) {
      var cats = CallToActionCategory.loadForDocumentProperty(db, id);
      if (cats != null && !cats.isEmpty()) {
        cta.setCategories(cats);
      }
    }
    return cta;
  }
}
