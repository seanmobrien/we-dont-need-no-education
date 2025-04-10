package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Objects;

/**
 * The {@code CallToAction} class represents a call-to-action (CTA) associated with a document.
 * It extends the {@link DocumentProperty} class and provides additional fields and methods
 * specific to CTAs, such as opened date, closed date, compliance details, and completion percentage.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Tracks the lifecycle of a CTA with opened, closed, and compliance close dates.</li>
 *   <li>Stores compliance-related information, including compliance messages and reasons.</li>
 *   <li>Supports database operations for persisting and retrieving CTA details.</li>
 *   <li>Implements a builder pattern for constructing instances.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>{@code
 * CallToAction cta = CallToAction.builder()
 *     .openedDate(LocalDate.now())
 *     .completionPercentage(50.0)
 *     .complianceMessage(90.0)
 *     .build();
 * }</pre>
 *
 * @see DocumentProperty
 */
/**
 * Represents a call-to-action (CTA) associated with a document.
 * Provides fields and methods for managing CTA lifecycle, compliance, and completion details.
 */
public class CallToAction extends DocumentProperty {

  /**
   * The date when the CTA was opened.
   */
  private LocalDate openedDate;

  /**
   * The date when the CTA was closed.
   */
  private LocalDate closedDate;

  /**
   * The compliance close date for the CTA.
   */
  private LocalDate compliancyCloseDate;

  /**
   * The completion percentage of the CTA.
   */
  private Double completionPercentage = 0.0;

  /**
   * The compliance message score for the CTA.
   */
  private Double complianceMessage = 100.0;

  /**
   * Reasons for the compliance message.
   */
  private String complianceMessageReasons;

  /**
   * Indicates whether the CTA is inferred.
   */
  private Boolean inferred;

  /**
   * Indicates whether the compliance date is enforceable.
   */
  private Boolean complianceDateEnforceable;

  /**
   * The reasonability rating of the CTA.
   */
  private Integer reasonabilityRating;

  /**
   * Default constructor initializing a new instance with default values.
   */
  public CallToAction() {
    super();
    setPropertyType(DocumentPropertyType.KnownValues.CallToAction);
  }

  /**
   * Constructs a CallToAction object using the provided state bag.
   *
   * @param stateBag A map containing key-value pairs to initialize the properties.
   */
  public CallToAction(Map<String, Object> stateBag) {
    super(stateBag);
    setPropertyType(DocumentPropertyType.KnownValues.CallToAction);
    Db.saveLocalDateFromStateBag(stateBag, "opened_date", this::setOpenedDate);
    Db.saveLocalDateFromStateBag(stateBag, "closed_date", this::setClosedDate);
    Db.saveLocalDateFromStateBag(
      stateBag,
      "compliancy_close_date",
      this::setCompliancyCloseDate
    );
    Db.saveDoubleFromStateBag(
      stateBag,
      "completion_percentage",
      this::setCompletionPercentage
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
    Db.saveBooleanFromStateBag(stateBag, "inferred", this::setInferred);
    Db.saveBooleanFromStateBag(
      stateBag,
      "compliance_date_enforceable",
      this::setComplianceDateEnforceable
    );
    Db.saveIntFromStateBag(
      stateBag,
      "reasonable_request",
      this::setReasonabilityRating
    );
  }

  /**
   * Retrieves the date when the CTA was opened.
   *
   * @return The opened date as a {@link LocalDate}.
   */
  public LocalDate getOpenedDate() {
    return openedDate;
  }

  public String getOpenedDate(String format) {
    return this.getOpenedDate(format, null);
  }

  public String getOpenedDate(String format, String defaultValue) {
    var v = this.getOpenedDate();
    return v == null
      ? defaultValue
      : v.format(DateTimeFormatter.ofPattern(format));
  }

  /**
   * Sets the date when the CTA was opened.
   *
   * @param openedDate The {@link LocalDate} representing the opened date.
   */
  public void setOpenedDate(LocalDate openedDate) {
    this.openedDate = openedDate;
  }

  /**
   * Retrieves the date when the CTA was closed.
   *
   * @return The closed date as a {@link LocalDate}.
   */
  public LocalDate getClosedDate() {
    return closedDate;
  }

  /**
   * Retrieves the closed date as a formatted string.
   *
   * @param format The desired date format.
   * @return The formatted closed date, or null if not set.
   */
  public String getClosedDate(String format) {
    return this.getClosedDate(format, null);
  }

  /**
   * Retrieves the closed date as a formatted string with a default value.
   *
   * @param format The desired date format.
   * @param defaultValue The default value to return if the closed date is null.
   * @return The formatted closed date, or the default value if not set.
   */
  public String getClosedDate(String format, String defaultValue) {
    var v = this.getClosedDate();
    return v == null
      ? defaultValue
      : v.format(DateTimeFormatter.ofPattern(format));
  }

  /**
   * Sets the date when the CTA was closed.
   *
   * @param closedDate The {@link LocalDate} representing the closed date.
   */
  public void setClosedDate(LocalDate closedDate) {
    this.closedDate = closedDate;
  }

  /**
   * Retrieves the compliance close date for the CTA.
   *
   * @return The compliance close date as a {@link LocalDate}.
   */
  public LocalDate getCompliancyCloseDate() {
    return compliancyCloseDate;
  }

  /**
   * Retrieves the compliance close date as a formatted string.
   *
   * @param format The desired date format.
   * @return The formatted compliance close date, or null if not set.
   */
  public String getCompliancyCloseDate(String format) {
    return this.getCompliancyCloseDate(format, null);
  }

  /**
   * Retrieves the compliance close date as a formatted string with a default value.
   *
   * @param format The desired date format.
   * @param defaultValue The default value to return if the compliance close date is null.
   * @return The formatted compliance close date, or the default value if not set.
   */
  public String getCompliancyCloseDate(String format, String defaultValue) {
    var v = this.getCompliancyCloseDate();
    return v == null
      ? defaultValue
      : v.format(DateTimeFormatter.ofPattern(format));
  }

  /**
   * Sets the compliance close date for the CTA.
   *
   * @param compliancyCloseDate The {@link LocalDate} representing the compliance close date.
   */
  public void setCompliancyCloseDate(LocalDate compliancyCloseDate) {
    if (compliancyCloseDate != null) {
      this.compliancyCloseDate = compliancyCloseDate;
    }
  }

  /**
   * Retrieves the completion percentage of the CTA.
   *
   * @return The completion percentage as a {@link Double}.
   */
  public Double getCompletionPercentage() {
    return completionPercentage;
  }

  /**
   * Sets the completion percentage of the CTA.
   *
   * @param completionPercentage The {@link Double} representing the completion percentage.
   */
  public void setCompletionPercentage(Double completionPercentage) {
    this.completionPercentage = Objects.requireNonNullElse(
      completionPercentage,
      0.0
    );
  }

  /**
   * Retrieves the compliance message score for the CTA.
   *
   * @return The compliance message score as a {@link Double}.
   */
  public Double getComplianceMessage() {
    return complianceMessage;
  }

  /**
   * Sets the compliance message score for the CTA.
   *
   * @param complianceMessage The {@link Double} representing the compliance message score.
   */
  public void setComplianceMessage(Double complianceMessage) {
    this.complianceMessage = Objects.requireNonNullElse(complianceMessage, 0.0);
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
   * Retrieves the inferred status of the CTA.
   *
   * @return The inferred status as a {@link Boolean}.
   */
  public Boolean getInferred() {
    return inferred;
  }

  /**
   * Sets the inferred status of the CTA.
   *
   * @param inferred The {@link Boolean} representing the inferred status.
   */
  public void setInferred(Boolean inferred) {
    this.inferred = Objects.requireNonNullElse(inferred, false);
  }

  /**
   * Retrieves the compliance date enforceable status of the CTA.
   *
   * @return The compliance date enforceable status as a {@link Boolean}.
   */
  public Boolean getComplianceDateEnforceable() {
    return complianceDateEnforceable;
  }

  /**
   * Sets the compliance date enforceable status of the CTA.
   *
   * @param complianceDateEnforceable The {@link Boolean} representing the compliance date enforceable status.
   */
  public void setComplianceDateEnforceable(Boolean complianceDateEnforceable) {
    this.complianceDateEnforceable = Objects.requireNonNullElse(
      complianceDateEnforceable,
      false
    );
  }

  /**
   * Retrieves the reasonability rating of the CTA.
   *
   * @return The reasonability rating as an {@link Integer}.
   */
  public Integer getReasonabilityRating() {
    return reasonabilityRating;
  }

  /**
   * Sets the reasonability rating of the CTA.
   *
   * @param reasonabilityRating The {@link Integer} representing the reasonability rating.
   */
  public void setReasonabilityRating(Integer reasonabilityRating) {
    this.reasonabilityRating = Objects.requireNonNullElse(
      reasonabilityRating,
      0
    );
  }

  /**
   * Determines whether the call to action is open.
   *
   * @return {@code true} if the call to action is open (i.e., the closed date is
   *         not set or the completion percentage is less than 100%);
   *         {@code false} otherwise.
   */
  public Boolean isOpen() {
    return (
      this.getClosedDate() == null || this.getCompletionPercentage() < 100.0
    );
  }

  /**
   * Adds the current {@code CallToAction} instance to the database.
   *
   * @param db The database instance used to execute the insert operation.
   * @return The current instance of {@code CallToAction} after being added to the database.
   * @throws SQLException If an error occurs while executing the database operation.
   */
  @SuppressWarnings("unchecked")
  @Override
  public CallToAction addToDb(Db db) throws SQLException {
    super.addToDb(db);
    db.executeUpdate(
      "INSERT INTO call_to_action_details " +
      "(property_id, opened_date, closed_date, compliancy_close_date, completion_percentage, compliance_message, compliance_message_reasons) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
      getPropertyId(),
      openedDate,
      closedDate,
      compliancyCloseDate,
      completionPercentage,
      complianceMessage,
      complianceMessageReasons
    );
    return this;
  }

  /**
   * A base builder class for constructing instances of {@link CallToAction}.
   * This class extends {@link DocumentPropertyBuilderBase} and provides
   * methods to set various properties of a {@link CallToAction} object.
   *
   * @param <T1> The type of the {@link CallToAction} being built.
   * @param <B>  The type of the builder extending this base class.
   */
  public static class CallToActionBuilderBase<
    T1 extends CallToAction, B extends CallToActionBuilderBase<T1, B>
  >
    extends DocumentPropertyBuilderBase<T1, B> {

    /**
     * Constructor for the {@code CallToActionBuilderBase}.
     *
     * @param target The target {@link CallToAction} instance to build.
     */
    protected CallToActionBuilderBase(T1 target) {
      super(target);
    }

    /**
     * Sets the opened date for the {@link CallToAction}.
     *
     * @param openedDate The {@link LocalDate} representing the opened date.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 openedDate(LocalDate openedDate) {
      target.setOpenedDate(openedDate);
      return self();
    }

    /**
     * Sets the closed date for the {@link CallToAction}.
     *
     * @param closedDate The {@link LocalDate} representing the closed date.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 closedDate(LocalDate closedDate) {
      target.setClosedDate(closedDate);
      return self();
    }

    /**
     * Sets the compliance close date for the {@link CallToAction}.
     *
     * @param compliancyCloseDate The {@link LocalDate} representing the compliance close date.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 compliancyCloseDate(
      LocalDate compliancyCloseDate
    ) {
      target.setCompliancyCloseDate(compliancyCloseDate);
      return self();
    }

    /**
     * Sets the completion percentage for the {@link CallToAction}.
     *
     * @param completionPercentage The {@link Double} representing the completion percentage.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 completionPercentage(Double completionPercentage) {
      target.setCompletionPercentage(completionPercentage);
      return self();
    }

    /**
     * Sets the compliance message score for the {@link CallToAction}.
     *
     * @param complianceMessage The {@link Double} representing the compliance message score.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 complianceMessage(Double complianceMessage) {
      target.setComplianceMessage(complianceMessage);
      return self();
    }

    /**
     * Sets the compliance message reasons for the {@link CallToAction}.
     *
     * @param complianceMessageReasons The {@link String} representing the compliance message reasons.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 complianceMessageReasons(
      String complianceMessageReasons
    ) {
      target.setComplianceMessageReasons(complianceMessageReasons);
      return self();
    }

    /**
     * Sets the inferred status for the {@link CallToAction}.
     *
     * @param inferred The {@link Boolean} representing the inferred status.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 inferred(Boolean inferred) {
      target.setInferred(inferred);
      return self();
    }

    /**
     * Sets the compliance date enforceable status for the {@link CallToAction}.
     *
     * @param complianceDateEnforceable The {@link Boolean} representing the compliance date enforceable status.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 complianceDateEnforceable(
      Boolean complianceDateEnforceable
    ) {
      target.setComplianceDateEnforceable(complianceDateEnforceable);
      return self();
    }

    /**
     * Sets the reasonability rating for the {@link CallToAction}.
     *
     * @param reasonabilityRating The {@link Integer} representing the reasonability rating.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 reasonabilityRating(Integer reasonabilityRating) {
      target.setReasonabilityRating(reasonabilityRating);
      return self();
    }
  }

  /**
   * A builder class for constructing instances of {@link CallToAction}.
   * This class extends {@link CallToActionBuilderBase} and provides
   * a concrete implementation for building {@link CallToAction} objects.
   */
  public static class CallToActionBuilder
    extends CallToActionBuilderBase<CallToAction, CallToActionBuilder> {

    /**
     * Constructor for the {@code CallToActionBuilder}.
     */
    protected CallToActionBuilder() {
      super(new CallToAction());
    }

    /**
     * Creates and returns a new instance of the {@code CallToActionBuilder}.
     *
     * @return A new {@link CallToActionBuilder} instance.
     */
    public static CallToActionBuilder builder() {
      return new CallToActionBuilder();
    }
  }

  /**
   * Creates and returns a new instance of the {@code CallToActionBuilderBase}.
   * This method provides a convenient way to construct a {@link CallToAction} object using the builder pattern.
   *
   * @return A new {@link CallToActionBuilderBase} instance.
   */
  public static CallToActionBuilderBase<
    ? extends CallToAction,
    ? extends CallToActionBuilderBase<?, ?>
  > builder() {
    return new CallToActionBuilder();
  }
}
