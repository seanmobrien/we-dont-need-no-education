package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The {@code CallToActionResponse} class represents a response to a call-to-action (CTA) associated with a document.
 * It extends the {@link DocumentProperty} class and provides additional fields and methods specific to CTA responses,
 * such as action property ID, completion percentage, response timestamp, and compliance details.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Tracks the response details for a CTA, including completion percentage and timestamps.</li>
 *   <li>Stores compliance-related information, including compliance messages and reasons.</li>
 *   <li>Supports database operations for persisting and retrieving CTA response details.</li>
 *   <li>Implements a builder pattern for constructing instances.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>{@code
 * CallToActionResponse response = CallToActionResponse.builder()
 *     .actionPropertyId(UUID.randomUUID())
 *     .completionPercentage(75.0)
 *     .responseTimestamp(LocalDateTime.now())
 *     .complianceMessage(90.0)
 *     .build();
 * }</pre>
 *
 * @see DocumentProperty
 */
public class CallToActionResponse extends DocumentProperty {

  private LocalDateTime responseTimestamp;
  private Double sentiment;
  private List<String> sentimentReasons;
  private List<String> severityReasons;
  private Integer reasonableResponse;
  private String reasonableReasons;
  private Integer severity;
  private Boolean inferred;
  private List<AssociatedCallToAction> associatedCallsToAction;

  /**
   * Default constructor for the {@code CallToActionResponse} class.
   * Initializes a new instance with default values and sets the property type to {@code CallToActionResponse}.
   */
  public CallToActionResponse() {
    super();
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
    this.associatedCallsToAction = new ArrayList<>();
  }

  /**
   * Constructor for the {@code CallToActionResponse} class.
   * Initializes a new instance with the specified property ID and sets the property type to {@code CallToActionResponse}.
   *
   * @param propertyId The unique identifier for the property.
   */
  public CallToActionResponse(UUID propertyId) {
    super();
    setPropertyId(propertyId);
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
    this.associatedCallsToAction = new ArrayList<>();
  }

  /**
   * Retrieves the associated calls to action for the response.
   *
   * @return A list of {@link AssociatedCallToAction} representing the associated calls to action.
   */
  public List<AssociatedCallToAction> getAssociatedCallsToAction() {
    return List.copyOf(associatedCallsToAction);
  }

  /**
   * Sets the associated calls to action for the response.
   *
   * @param actions The {@link List<AssociatedCallToAction>} representing the associated calls to action.
   */
  public void setAssociatedCallsToAction(List<AssociatedCallToAction> actions) {
    this.associatedCallsToAction = new ArrayList<>(actions);
  }

  /**
   * Retrieves the timestamp of the response.
   *
   * @return The response timestamp as a {@link LocalDateTime}.
   */
  public LocalDateTime getResponseTimestamp() {
    return responseTimestamp;
  }

  /**
   * Retrieves the response timestamp formatted according to the specified format.
   *
   * @param format The desired format for the timestamp, following the patterns
   *               defined by {@link java.text.SimpleDateFormat}.
   * @return A string representation of the response timestamp in the specified format.
   */
  public String getResponseTimestamp(String format) {
    return this.getResponseTimestamp(format, null);
  }

  /**
   * Retrieves the response timestamp formatted according to the specified pattern.
   * If the timestamp is null, the provided default value is returned.
   *
   * @param format       The pattern to format the timestamp, following the rules of
   *                     {@link java.time.format.DateTimeFormatter}.
   * @param defaultValue The value to return if the response timestamp is null.
   * @return A formatted timestamp string if the timestamp is not null; otherwise, the default value.
   * @throws IllegalArgumentException If the given format is invalid.
   */
  public String getResponseTimestamp(String format, String defaultValue) {
    var v = this.getResponseTimestamp();
    if (v == null) {
      return defaultValue;
    }
    return v.format(DateTimeFormatter.ofPattern(format));
  }

  /**
   * Sets the timestamp of the response.
   *
   * @param responseTimestamp The {@link LocalDateTime} representing the response timestamp.
   */
  public void setResponseTimestamp(LocalDateTime responseTimestamp) {
    this.responseTimestamp = responseTimestamp;
  }

  /**
   * Retrieves the compliance message score for the response.
   *
   * @return The compliance message score as a {@link Double}.
   */
  public Double getSentiment() {
    return sentiment;
  }

  /**
   * Sets the compliance message score for the response.
   *
   * @param sentiment The {@link Double} representing the sentiment score.
   */
  public void setSentiment(Double sentiment) {
    this.sentiment = sentiment;
  }

  /**
   * Retrieves the reasons for the sentiment score.
   *
   * @return The sentiment reasons as a {@link String}.
   */
  public List<String> getSentimentReasons() {
    return sentimentReasons;
  }

  /**
   * Sets the reasons for the sentiment score.
   *
   * @param sentimentReasons The {@link List<String>} representing the sentiment reasons.
   */
  public void setSentimentReasons(List<String> sentimentReasons) {
    this.sentimentReasons = sentimentReasons;
  }

  /**
   * Retrieves the reasons for the compliance aggregate score.
   *
   * @return The compliance aggregate reasons as a {@link List<String>}.
   */
  public List<String> getSeverityReasons() {
    return severityReasons;
  }

  /**
   * Sets the reasons for the compliance aggregate score.
   *
   * @param severityReasons The {@link List<String>} representing the severity reasons.
   */
  public void setSeverityReasons(List<String> severityReasons) {
    this.severityReasons = severityReasons;
  }

  /**
   * Retrieves the reasonable response rating.
   *
   * @return The reasonable response rating as an {@link Integer}.
   */
  public Integer getReasonableResponse() {
    return reasonableResponse;
  }

  /**
   * Sets the reasonable response rating.
   *
   * @param reasonableResponse The {@link Integer} representing the reasonable response rating.
   */
  public void setReasonableResponse(Integer reasonableResponse) {
    this.reasonableResponse = reasonableResponse;
  }

  /**
   * Retrieves the reasons for the reasonable response rating.
   *
   * @return The reasons as a {@link String}.
   */
  public String getReasonableReasons() {
    return reasonableReasons;
  }

  /**
   * Sets the reasons for the reasonable response rating.
   *
   * @param reasonableReasons The {@link String} representing the reasons.
   */
  public void setReasonableReasons(String reasonableReasons) {
    this.reasonableReasons = reasonableReasons;
  }

  /**
   * Retrieves the severity rating.
   *
   * @return The severity rating as an {@link Integer}.
   */
  public Integer getSeverity() {
    return severity;
  }

  /**
   * Sets the severity rating.
   *
   * @param severity The {@link Integer} representing the severity rating.
   */
  public void setSeverity(Integer severity) {
    this.severity = severity;
  }

  /**
   * Retrieves whether the response is inferred.
   *
   * @return The inferred status as a {@link Boolean}.
   */
  public Boolean getInferred() {
    return inferred;
  }

  /**
   * Sets whether the response is inferred.
   *
   * @param inferred The {@link Boolean} representing the inferred status.
   */
  public void setInferred(Boolean inferred) {
    this.inferred = inferred;
  }

  /**
   * Adds the current {@code CallToActionResponse} instance to the database.
   *
   * @param db The database instance used to execute the insert operation.
   * @return The current instance of {@code CallToActionResponse} after being added to the database.
   * @throws SQLException If an error occurs while executing the database operation.
   */
  @SuppressWarnings("unchecked")
  @Override
  public CallToActionResponse addToDb(IDbTransaction tx) throws SQLException {
    super.addToDb(tx);
    try {
      tx
        .getDb()
        .executeUpdate(
          "INSERT INTO call_to_action_response_details " +
          "(property_id, response_timestamp, sentiment, sentiment_reasons, " +
          "reasonable_response, reasonable_reasons, severity, severity_reasons, inferred) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          getPropertyId(),
          responseTimestamp,
          sentiment,
          sentimentReasons,
          reasonableResponse,
          reasonableReasons,
          severity,
          severityReasons,
          inferred
        );

      for (var cta : associatedCallsToAction) {
        if (!cta.updateDb(tx, getPropertyId())) throw new SQLException(
          "Error adding associated call to action to database - no record created or updated."
        );
      }
      return this;
    } catch (SQLException e) {
      tx.setAbort();
      throw new SQLException(
        "Unexpected error saving responsive action: " + e.getMessage(),
        e
      );
    }
  }

  /**
   * loads a {@code CallToActionResponse} instance from the database.
   *
   * @param db The database instance used to execute the select operation.
   * @return The current instance of {@code CallToActionResponse} after being loaded from the database.
   * @throws SQLException If an error occurs while executing the database operation.
   */
  public static CallToActionResponse loadFromDb(Db db, UUID id)
    throws SQLException {
    var ret = db.selectObjects(
      CallToActionResponse.class,
      "SELECT * FROM call_to_action_response_details WHERE property_id = ?",
      id
    );
    return ret.size() > 0 ? ret.get(0) : null;
  }

  /**
   * A builder class for constructing instances of {@link CallToActionResponse}.
   * This class extends {@link DocumentPropertyBuilderBase} and provides additional methods
   * specific to {@link CallToActionResponse}.
   *
   * <p>Example usage:</p>
   * <pre>{@code
   * CallToActionResponse response = CallToActionResponse.builder()
   *     .actionPropertyId(UUID.randomUUID())
   *     .completionPercentage(75.0)
   *     .responseTimestamp(LocalDateTime.now())
   *     .complianceMessage(90.0)
   *     .build();
   * }</pre>
   */
  public static class CallToActionResponseBuilder
    extends DocumentPropertyBuilderBase<
      CallToActionResponse,
      CallToActionResponseBuilder
    > {

    /**
     * Constructor for the {@code CallToActionResponseBuilder}.
     * Initializes a new builder instance with a target {@link CallToActionResponse} object.
     */
    protected CallToActionResponseBuilder() {
      super(new CallToActionResponse());
    }

    /**
     * Sets the action property ID for the {@link CallToActionResponse}.
     *
     * @param actionPropertyId The {@link UUID} representing the action property ID.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder severityReasons(
      List<String> severityReasons
    ) {
      target.setSeverityReasons(severityReasons);
      return self();
    }

    /**
     * Sets the completion percentage for the {@link CallToActionResponse}.
     *
     * @param completionPercentage The {@link Double} representing the completion percentage.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder sentiment(Double sentiment) {
      target.setSentiment(sentiment);
      return self();
    }

    /**
     * Sets the response timestamp for the {@link CallToActionResponse}.
     *
     * @param responseTimestamp The {@link LocalDateTime} representing the response timestamp.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder responseTimestamp(
      LocalDateTime responseTimestamp
    ) {
      target.setResponseTimestamp(responseTimestamp);
      return self();
    }

    /**
     * Sets the compliance message reasons for the {@link CallToActionResponse}.
     *
     * @param sentimentReasons The {@link List<String>} representing the sentiment reasons.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder sentimentReasons(
      List<String> sentimentReasons
    ) {
      target.setSentimentReasons(sentimentReasons);
      return self();
    }

    public CallToActionResponseBuilder reasonableResponse(
      Integer reasonableResponse
    ) {
      target.setReasonableResponse(reasonableResponse);
      return self();
    }

    public CallToActionResponseBuilder reasonableReasons(
      String reasonableReasons
    ) {
      target.setReasonableReasons(reasonableReasons);
      return self();
    }

    public CallToActionResponseBuilder severity(Integer severity) {
      target.setSeverity(severity);
      return self();
    }

    public CallToActionResponseBuilder inferred(Boolean inferred) {
      target.setInferred(inferred);
      return self();
    }

    public CallToActionResponseBuilder associatedCallsToAction(
      List<AssociatedCallToAction> associatedCallsToAction
    ) {
      target.setAssociatedCallsToAction(associatedCallsToAction);
      return self();
    }
  }

  /**
   * Creates and returns a new instance of the {@code CallToActionResponseBuilder}.
   * This method provides a convenient way to construct a {@link CallToActionResponse} object using the builder pattern.
   *
   * @return A new {@link CallToActionResponseBuilder} instance.
   */
  public static CallToActionResponseBuilder builder() {
    return new CallToActionResponseBuilder();
  }

  /**
   * Adds an associated call-to-action to the list of associated calls-to-action.
   *
   * @param cta the {@link AssociatedCallToAction} object to be added
   */
  public void addAssociatedCallToAction(AssociatedCallToAction cta) {
    this.associatedCallsToAction.add(cta);
  }
}
