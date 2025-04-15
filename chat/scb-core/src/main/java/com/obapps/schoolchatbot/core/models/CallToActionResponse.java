package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
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

  private UUID actionPropertyId;
  private Double completionPercentage = 0.0;
  private LocalDateTime responseTimestamp;
  private Double complianceMessage;
  private String complianceMessageReasons;
  private Double complianceAggregate;
  private String complianceAggregateReasons;
  private Integer reasonableRequest;
  private String reasonableReasons;
  private Integer severity;
  private Boolean inferred;

  /**
   * Default constructor for the {@code CallToActionResponse} class.
   * Initializes a new instance with default values and sets the property type to {@code CallToActionResponse}.
   */
  public CallToActionResponse() {
    super();
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
  }

  /**
   * Constructs a {@code CallToActionResponse} object and initializes its fields using the provided state bag.
   *
   * @param stateBag A map containing key-value pairs used to initialize the properties of the {@code CallToActionResponse} object.
   */
  public CallToActionResponse(Map<String, Object> stateBag) {
    super(stateBag);
    setPropertyType(DocumentPropertyType.KnownValues.CallToActionResponse);
    Db.saveUuidFromStateBag(
      stateBag,
      "action_property_id",
      this::setActionPropertyId
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "completion_percentage",
      this::setCompletionPercentage
    );
    Db.saveLocalDateTimeFromStateBag(
      stateBag,
      "response_timestamp",
      this::setResponseTimestamp
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "compliance_message",
      this::setComplianceMessage
    );
    Db.saveFromStateBag(
      stateBag,
      "compliance_message_reasons",
      this::setComplianceMessageReasons
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "compliance_aggregate",
      this::setComplianceAggregate
    );
    Db.saveFromStateBag(
      stateBag,
      "compliance_aggregate_reasons",
      this::setComplianceAggregateReasons
    );
  }

  /**
   * Retrieves the action property ID associated with this response.
   *
   * @return The action property ID as a {@link UUID}.
   */
  public UUID getActionPropertyId() {
    return actionPropertyId;
  }

  /**
   * Sets the action property ID for this response.
   *
   * @param actionPropertyId The {@link UUID} representing the action property ID.
   */
  public void setActionPropertyId(UUID actionPropertyId) {
    this.actionPropertyId = actionPropertyId;
  }

  /**
   * Retrieves the completion percentage of the response.
   *
   * @return The completion percentage as a {@link Double}.
   */
  public Double getCompletionPercentage() {
    return completionPercentage;
  }

  /**
   * Sets the completion percentage of the response.
   *
   * @param completionPercentage The {@link Double} representing the completion percentage.
   */
  public void setCompletionPercentage(Double completionPercentage) {
    this.completionPercentage = completionPercentage;
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
  public Double getComplianceMessage() {
    return complianceMessage;
  }

  /**
   * Sets the compliance message score for the response.
   *
   * @param complianceMessage The {@link Double} representing the compliance message score.
   */
  public void setComplianceMessage(Double complianceMessage) {
    this.complianceMessage = complianceMessage;
  }

  /**
   * Retrieves the reasons for the compliance message.
   *
   * @return The compliance message reasons as a {@link String}.
   */
  public String getComplianceMessageReasons() {
    return complianceMessageReasons;
  }

  /**
   * Sets the reasons for the compliance message.
   *
   * @param complianceMessageReasons The {@link String} representing the compliance message reasons.
   */
  public void setComplianceMessageReasons(String complianceMessageReasons) {
    this.complianceMessageReasons = complianceMessageReasons;
  }

  /**
   * Retrieves the compliance aggregate score for the response.
   *
   * @return The compliance aggregate score as a {@link Double}.
   */
  public Double getComplianceAggregate() {
    return complianceAggregate;
  }

  /**
   * Sets the compliance aggregate score for the response.
   *
   * @param complianceAggregate The {@link Double} representing the compliance aggregate score.
   */
  public void setComplianceAggregate(Double complianceAggregate) {
    this.complianceAggregate = complianceAggregate;
  }

  /**
   * Retrieves the reasons for the compliance aggregate score.
   *
   * @return The compliance aggregate reasons as a {@link String}.
   */
  public String getComplianceAggregateReasons() {
    return complianceAggregateReasons;
  }

  /**
   * Sets the reasons for the compliance aggregate score.
   *
   * @param complianceAggregateReasons The {@link String} representing the compliance aggregate reasons.
   */
  public void setComplianceAggregateReasons(String complianceAggregateReasons) {
    this.complianceAggregateReasons = complianceAggregateReasons;
  }

  /**
   * Retrieves the reasonable request rating.
   *
   * @return The reasonable request rating as an {@link Integer}.
   */
  public Integer getReasonableRequest() {
    return reasonableRequest;
  }

  /**
   * Sets the reasonable request rating.
   *
   * @param reasonableRequest The {@link Integer} representing the reasonable request rating.
   */
  public void setReasonableRequest(Integer reasonableRequest) {
    this.reasonableRequest = reasonableRequest;
  }

  /**
   * Retrieves the reasons for the reasonable request rating.
   *
   * @return The reasons as a {@link String}.
   */
  public String getReasonableReasons() {
    return reasonableReasons;
  }

  /**
   * Sets the reasons for the reasonable request rating.
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
  public CallToActionResponse addToDb(Db db) throws SQLException {
    super.addToDb(db);
    db.executeUpdate(
      "INSERT INTO call_to_action_response_details " +
      "(property_id, action_property_id, completion_percentage, response_timestamp, compliance_message, compliance_message_reasons, compliance_aggregate, compliance_aggregate_reasons, reasonable_request, reasonable_reasons, severity, inferred) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      getPropertyId(),
      actionPropertyId,
      completionPercentage,
      responseTimestamp,
      complianceMessage,
      complianceMessageReasons,
      complianceAggregate,
      complianceAggregateReasons,
      reasonableRequest,
      reasonableReasons,
      severity,
      inferred
    );
    return this;
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
    public CallToActionResponseBuilder actionPropertyId(UUID actionPropertyId) {
      target.setActionPropertyId(actionPropertyId);
      return self();
    }

    /**
     * Sets the completion percentage for the {@link CallToActionResponse}.
     *
     * @param completionPercentage The {@link Double} representing the completion percentage.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder completionPercentage(
      Double completionPercentage
    ) {
      target.setCompletionPercentage(completionPercentage);
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
     * Sets the compliance message score for the {@link CallToActionResponse}.
     *
     * @param complianceMessage The {@link Double} representing the compliance message score.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder complianceMessage(
      Double complianceMessage
    ) {
      target.setComplianceMessage(complianceMessage);
      return self();
    }

    /**
     * Sets the compliance message reasons for the {@link CallToActionResponse}.
     *
     * @param complianceMessageReasons The {@link String} representing the compliance message reasons.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder complianceMessageReasons(
      String complianceMessageReasons
    ) {
      target.setComplianceMessageReasons(complianceMessageReasons);
      return self();
    }

    /**
     * Sets the compliance aggregate score for the {@link CallToActionResponse}.
     *
     * @param complianceAggregate The {@link Double} representing the compliance aggregate score.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder complianceAggregate(
      Double complianceAggregate
    ) {
      target.setComplianceAggregate(complianceAggregate);
      return self();
    }

    /**
     * Sets the compliance aggregate reasons for the {@link CallToActionResponse}.
     *
     * @param complianceAggregateReasons The {@link String} representing the compliance aggregate reasons.
     * @return The builder instance for method chaining.
     */
    public CallToActionResponseBuilder complianceAggregateReasons(
      String complianceAggregateReasons
    ) {
      target.setComplianceAggregateReasons(complianceAggregateReasons);
      return self();
    }

    public CallToActionResponseBuilder reasonableRequest(
      Integer reasonableRequest
    ) {
      target.setReasonableRequest(reasonableRequest);
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
}
