package com.obapps.schoolchatbot.core.models;

import com.obapps.core.types.FunctionThatCanThrow;
import com.obapps.core.util.*;
import com.obapps.core.util.sql.FieldUtil;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.LoggerFactory;

/**
 * Represents a property associated with a document.
 * Provides fields and methods for managing document property details.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Supports multiple constructors for flexible initialization.</li>
 *   <li>Provides getter and setter methods for all attributes.</li>
 *   <li>Includes methods for database interaction, such as adding and retrieving properties.</li>
 *   <li>Supports JSON serialization using Jackson's {@code ObjectMapper}.</li>
 *   <li>Implements a builder pattern for constructing instances.</li>
 * </ul>
 *
 * <p>Usage Example:</p>
 * <pre>{@code
 * DocumentProperty property = new DocumentProperty();
 * property.setPropertyId(UUID.randomUUID());
 * property.setDocumentId(123);
 * property.setPropertyType(1);
 * property.setPropertyValue("Sample Value");
 * property.setCreatedOn(LocalDateTime.now());
 * }</pre>
 *
 * <p>Database Operations:</p>
 * <ul>
 *   <li>{@link #addToDb(Db)} - Adds the current instance to the database.</li>
 *   <li>{@link #getFromDb(UUID)} - Retrieves a property from the database by its ID.</li>
 *   <li>{@link #addManualReview(Db, Integer, Exception, String, Object...)} - Adds a manual review entry for a document.</li>
 * </ul>
 *
 * <p>Builder Pattern:</p>
 * <ul>
 *   <li>{@link DocumentPropertyBuilderBase} - A base builder class for constructing instances.</li>
 *   <li>{@link DocumentPropertyBuilder} - A specific builder implementation for {@code DocumentProperty}.</li>
 *   <li>{@link #builder()} - Creates and returns a new builder instance.</li>
 * </ul>
 *
 * <p>Serialization:</p>
 * <ul>
 *   <li>{@link #toJson()} - Converts the current object to its JSON representation.</li>
 * </ul>
 *
 * <p>Thread Safety:</p>
 * <p>This class is not thread-safe. If multiple threads access an instance concurrently,
 * external synchronization is required.</p>
 *
 * @see java.util.UUID
 * @see java.time.LocalDateTime
 * @see com.fasterxml.jackson.databind.ObjectMapper
 */
public class DocumentProperty {

  /**
   * The unique identifier for the document property.
   */
  private UUID propertyId;

  /**
   * The identifier of the document associated with this property.
   */
  private Integer documentId;

  /**
   * The type of the document property.
   */
  private Integer propertyType;

  /**
   * The value of the document property.
   */
  private String propertyValue;

  /**
   * The creation timestamp of the document property.
   */
  private LocalDateTime createdOn;
  private List<String> tags;
  private List<String> policyBasis;

  /**
   * Default constructor for the DocumentProperty class.
   * Initializes a new instance of the DocumentProperty class with default values.
   */
  public DocumentProperty() {}

  /**
   * Represents a property of a document with its associated details.
   *
   * @param propertyId    The unique identifier for the property.
   * @param documentId    The identifier of the document to which this property belongs.
   * @param propertyType  The type of the property, represented as an integer.
   * @param propertyValue The value of the property as a string.
   */
  public DocumentProperty(
    UUID propertyId,
    Integer documentId,
    Integer propertyType,
    String propertyValue
  ) {
    this.propertyId = propertyId;
    this.documentId = documentId;
    this.propertyType = propertyType;
    this.propertyValue = propertyValue;
  }

  /**
   * Constructs a new DocumentProperty object with the specified parameters.
   *
   * @param propertyId   The unique identifier for the property.
   * @param documentId   The identifier of the document associated with this property.
   * @param propertyType The type of the property.
   * @param propertyValue The value of the property.
   * @param policyBasis  A list of policy basis strings associated with this property.
   * @param tags         A list of tags associated with this property.
   */
  public DocumentProperty(
    UUID propertyId,
    Integer documentId,
    Integer propertyType,
    String propertyValue,
    List<String> policyBasis,
    List<String> tags
  ) {
    this(propertyId, documentId, propertyType, propertyValue);
    this.policyBasis = policyBasis;
    this.tags = tags;
  }

  /**
   * Constructs a new DocumentProperty object and initializes its fields using the provided state bag.
   *
   * @param stateBag A map containing key-value pairs used to initialize the properties of the DocumentProperty object.
   *                 The following keys are expected in the state bag:
   *                 - "property_id": A UUID representing the property ID.
   *                 - "document_id": An integer representing the document ID.
   *                 - "email_property_type_id": An integer representing the property type.
   *                 - "property_value": A value representing the property value.
   *                 - "created_on": A LocalDateTime representing the creation timestamp.
   *                 - "policy_basis": A string array representing the policy basis.
   *                 - "tags": A string array representing the tags.
   */
  public DocumentProperty(Map<String, Object> stateBag) {
    FieldUtil.saveUuidFromStateBag(
      stateBag,
      "property_id",
      this::setPropertyId
    );
    FieldUtil.saveIntFromStateBag(stateBag, "document_id", this::setDocumentId);
    FieldUtil.saveIntFromStateBag(
      stateBag,
      "email_property_type_id",
      this::setPropertyType
    );
    FieldUtil.saveFromStateBag(
      stateBag,
      "property_value",
      this::setPropertyValue
    );
    FieldUtil.saveLocalDateTimeFromStateBag(
      stateBag,
      "created_on",
      this::setCreatedOn
    );
    FieldUtil.saveStringArrayFromStateBag(
      stateBag,
      "policy_basis",
      this::setPolicyBasis
    );
    FieldUtil.saveStringArrayFromStateBag(stateBag, "tags", this::setTags);
  }

  /**
   * Retrieves the unique identifier of the property.
   *
   * @return the UUID representing the property ID.
   */
  public UUID getPropertyId() {
    return propertyId;
  }

  /**
   * Sets the unique identifier for the property.
   *
   * @param propertyId the UUID representing the property ID to set
   */
  public void setPropertyId(UUID propertyId) {
    this.propertyId = propertyId;
  }

  /**
   * Retrieves the unique identifier of the document.
   *
   * @return the document ID as an Integer.
   */
  public Integer getDocumentId() {
    return documentId;
  }

  /**
   * Sets the unique identifier for the document.
   *
   * @param documentId the unique identifier of the document to set
   */
  public void setDocumentId(Integer documentId) {
    this.documentId = documentId;
  }

  /**
   * Retrieves the type of the property.
   *
   * @return the property type as an Integer.
   */
  public Integer getPropertyType() {
    return propertyType;
  }

  /**
   * Sets the property type for this document.
   *
   * @param propertyType the type of the property to set, represented as an Integer
   */
  public void setPropertyType(Integer propertyType) {
    this.propertyType = propertyType;
  }

  /**
   * Retrieves the value of the property.
   *
   * @return the value of the property as a String.
   */
  public String getPropertyValue() {
    return propertyValue;
  }

  /**
   * Sets the value of the property.
   *
   * @param propertyValue the new value to set for the property
   */
  public void setPropertyValue(String propertyValue) {
    this.propertyValue = propertyValue;
  }

  /**
   * Retrieves the date and time when the document was created.
   *
   * @return the creation timestamp as a {@link LocalDateTime} object.
   */
  public LocalDateTime getCreatedOn() {
    return createdOn;
  }

  /**
   * Sets the creation timestamp for the document.
   *
   * @param createdOn the LocalDateTime representing when the document was created
   */
  public void setCreatedOn(LocalDateTime createdOn) {
    this.createdOn = createdOn;
  }

  /**
   * Retrieves the creation timestamp as a formatted string.
   *
   * @param format The desired date-time format.
   * @return The formatted creation timestamp, or null if not set.
   */
  public String getCreatedOn(String format) {
    return this.getCreatedOn(format, null);
  }

  /**
   * Retrieves the creation timestamp as a formatted string with a default value.
   *
   * @param format The desired date-time format.
   * @param defaultValue The default value to return if the creation timestamp is null.
   * @return The formatted creation timestamp, or the default value if not set.
   */
  public String getCreatedOn(String format, String defaultValue) {
    var v = this.getCreatedOn();
    return v == null
      ? defaultValue
      : v.format(DateTimeFormatter.ofPattern(format));
  }

  /**
   * Gets the tags associated with this DocumentProperty.
   *
   * @return A list of tags as Strings.
   */
  public List<String> getTags() {
    return tags;
  }

  /**
   * Sets the tags for this DocumentProperty.
   *
   * @param tags The list of tags to set.
   */
  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  /**
   * Gets the policy basis associated with this DocumentProperty.
   *
   * @return A list of policy basis as Strings.
   */
  public List<String> getPolicyBasis() {
    return policyBasis;
  }

  /**
   * Sets the policy basis for this DocumentProperty.
   *
   * @param policyBasis The list of policy basis to set.
   */
  public void setPolicyBasis(List<String> policyBasis) {
    this.policyBasis = policyBasis;
  }

  /**
   * Converts the current object to its JSON representation.
   *
   * @return A JSON string representation of the current object.
   * @throws RuntimeException If an error occurs during serialization.
   */
  public String toJson() {
    return Strings.serializeAsJson(this);
  }

  /**
   * Adds the current DocumentProperty instance to the database.
   * If the `propertyId` is null, a new UUID is generated for it.
   * If the `createdOn` timestamp is null, the current timestamp is assigned.
   *
   * @param db The database instance used to execute the insert operation.
   * @param <T> The type of the DocumentProperty subclass.
   * @return The current instance of the DocumentProperty (or subclass) after being added to the database.
   * @throws SQLException If an error occurs while executing the database operation.
   */
  @SuppressWarnings("unchecked")
  public <T extends DocumentProperty> T addToDb(Db db) throws SQLException {
    if (propertyId == null) {
      propertyId = UUID.randomUUID();
    }
    if (createdOn == null) {
      createdOn = LocalDateTime.now();
    }
    if (db == null) {
      db = Db.getInstance();
    }
    db.executeUpdate(
      "INSERT INTO document_property (property_id, document_id, email_property_type_id, property_value, created_on, policy_basis, tags) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
      propertyId,
      documentId,
      propertyType,
      propertyValue,
      createdOn,
      policyBasis == null || policyBasis.size() == 0 ? null : policyBasis,
      tags == null || tags.size() == 0 ? null : tags
    );
    return (T) this;
  }

  /**
   * Updates an existing DocumentProperty record in the database.
   * If the `propertyId` is null, the update operation will not proceed.
   *
   * @param db The database instance used to execute the update operation.
   * @param <T> The type of the DocumentProperty subclass.
   * @return The current instance of the DocumentProperty (or subclass) after being updated in the database.
   * @throws SQLException If an error occurs while executing the database operation.
   */
  @SuppressWarnings("unchecked")
  public <T extends DocumentProperty> T updateDb(Db db) throws SQLException {
    if (propertyId == null) {
      throw new IllegalArgumentException(
        "propertyId cannot be null for update operation."
      );
    }
    if (db == null) {
      db = Db.getInstance();
    }
    db.executeUpdate(
      "UPDATE document_property SET property_value = ?, policy_basis = COALESCE(?, policy_basis), tags = COALESCE(?, tags) WHERE property_id = ?",
      propertyValue,
      policyBasis == null || policyBasis.size() == 0 ? null : policyBasis,
      tags == null || tags.size() == 0 ? null : tags,
      propertyId
    );
    return (T) this;
  }

  /**
   * Adds a manual review entry for a document with the specified details.
   *
   * @param documentId  The ID of the document to associate with the manual review.
   * @param e           The exception or issue that triggered the manual review.
   * @param sender      The identifier of the sender or user initiating the review.
   * @param args        Additional arguments or metadata related to the manual review.
   */
  public static void addManualReview(
    Integer documentId,
    Exception e,
    String sender,
    Object... args
  ) {
    try {
      addManualReview(Db::getInstanceNoThrow, documentId, e, sender, args);
    } catch (Exception ex) {
      LoggerFactory.getLogger(DocumentProperty.class).error(
        "Error adding manual review for document: " + documentId,
        ex
      );
    }
  }

  /**
   * Adds a manual review entry for a document with the specified details.
   *
   * @param db          The database instance to use for the operation.
   * @param documentId  The ID of the document to associate with the manual review.
   * @param e           The exception or issue that triggered the manual review.
   * @param sender      The identifier of the sender or user initiating the review.
   * @param args        Additional arguments or metadata related to the manual review.
   */
  public static void addManualReview(
    FunctionThatCanThrow<SQLException, Object, Db> db,
    Integer documentId,
    Exception e,
    String sender,
    Object... args
  ) {
    addManualReview(db, documentId, null, e, sender, args);
  }

  /**
   * Adds a manual review property to a document in the database.
   * @param documentId  The ID of the document to which the property will be added.
   * @param message     A message describing the reason for the manual review. If null, the exception message will be used.
   * @param e           The exception associated with the manual review.
   * @param sender      The sender or originator of the manual review. If null, "Unknown" will be used.
   * @param args        Additional arguments providing context for the manual review.
   */
  public static void addManualReview(
    Integer documentId,
    String message,
    Exception e,
    String sender,
    Object... args
  ) {
    try {
      addManualReview(Db::getInstanceNoThrow, documentId, e, sender, args);
    } catch (Exception ex) {
      LoggerFactory.getLogger(DocumentProperty.class).error(
        "Error adding manual review for document: " + documentId,
        ex
      );
    }
  }

  /**
   * Adds a manual review property to a document in the database.
   *
   * @param db          The database instance where the property will be added.
   * @param documentId  The ID of the document to which the property will be added.
   * @param message     A message describing the reason for the manual review. If null, the exception message will be used.
   * @param e           The exception associated with the manual review.
   * @param sender      The sender or originator of the manual review. If null, "Unknown" will be used.
   * @param args        Additional arguments providing context for the manual review.
   */
  public static void addManualReview(
    FunctionThatCanThrow<SQLException, Object, Db> db,
    Integer documentId,
    String message,
    Exception e,
    String sender,
    Object... args
  ) {
    String formattedMessage = null;
    try {
      StringBuilder argBuilder = new StringBuilder();
      if (args == null || args.length == 0) {
        argBuilder.append("No arguments provided.\n\t");
      } else {
        argBuilder.append("Arguments:");
        List.of(args).forEach(b -> {
          argBuilder.append("\n\t- ");
          if (b == null) {
            argBuilder.append("[null]");
          } else {
            argBuilder
              .append(b.getClass().getName())
              .append(": ")
              .append(b.toString());
          }
        });
      }
      formattedMessage = String.format(
        "Message: %s\n" +
        "Sender: %s\n" +
        "Stack Trace: %s\n" +
        "The following contextual data was provided:\n\t%s\n",
        Objects.requireNonNullElse(message, e.getMessage()),
        Objects.requireNonNullElse(sender, "Unknown"),
        List.of(e.getStackTrace())
          .stream()
          .map(StackTraceElement::toString)
          .reduce("", (a, b) -> a + "\n\t" + b),
        argBuilder.toString()
      );

      builder()
        .documentId(documentId)
        .propertyType(DocumentPropertyType.KnownValues.ManualReviewRequest)
        .propertyId(UUID.randomUUID())
        .propertyValue(formattedMessage)
        .createdOn(LocalDateTime.now())
        .build()
        .addToDb(db.apply(null));
    } catch (Exception ex) {
      if (formattedMessage == null) {
        formattedMessage = "Error building formatted message.";
      }
      LoggerFactory.getLogger(DocumentProperty.class).error(
        String.format(
          "Error adding manual review property to document: %d\n%s",
          documentId,
          formattedMessage
        ),
        ex
      );
    }
  }

  /**
   * Retrieves a DocumentProperty from the database using the specified property ID.
   *
   * @param propertyId The unique identifier of the property to retrieve.
   * @return The DocumentProperty object corresponding to the given property ID.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentProperty getFromDb(UUID propertyId)
    throws SQLException {
    return getFromDb(Db.getInstance(), propertyId);
  }

  /**
   * Retrieves a DocumentProperty object from the database using the specified property ID.
   *
   * @param db The database instance to use for the query.
   * @param propertyId The unique identifier of the document property to retrieve.
   * @return A DocumentProperty object if a matching record is found, or {@code null} if no record exists.
   * @throws SQLException If a database access error occurs.
   */
  public static DocumentProperty getFromDb(Db db, UUID propertyId)
    throws SQLException {
    var records = db.selectRecords(
      "SELECT * FROM document_property WHERE property_id = ?",
      DocumentProperty.class,
      propertyId
    );
    return records.size() > 0 ? new DocumentProperty(records.get(0)) : null;
  }

  /**
   * A base builder class for constructing instances of {@link DocumentProperty}.
   * This class provides a fluent API for setting various properties of a
   * {@link DocumentProperty} object. It is designed to be extended by more
   * specific builder implementations.
   *
   * @param <T1> The type of the {@link DocumentProperty} being built.
   * @param <B>  The type of the builder extending this base class.
   */
  public static class DocumentPropertyBuilderBase<
    T1 extends DocumentProperty, B extends DocumentPropertyBuilderBase<T1, B>
  > {

    protected final T1 target;

    protected DocumentPropertyBuilderBase(T1 target) {
      this.target = target;
    }

    @SuppressWarnings("unchecked")
    protected <C extends B> C self() {
      return (C) this;
    }

    @SuppressWarnings("unchecked")
    public <C extends B> C propertyId(UUID propertyId) {
      target.setPropertyId(propertyId);
      return (C) self();
    }

    @SuppressWarnings("unchecked")
    public <C extends B> C documentId(Integer documentId) {
      target.setDocumentId(documentId);
      return (C) self();
    }

    @SuppressWarnings("unchecked")
    public <C extends B> C propertyType(Integer propertyType) {
      target.setPropertyType(propertyType);
      return (C) self();
    }

    @SuppressWarnings("unchecked")
    public <C extends B> C propertyValue(String propertyValue) {
      target.setPropertyValue(propertyValue);
      return (C) self();
    }

    @SuppressWarnings("unchecked")
    public <C extends B> C createdOn(LocalDateTime createdOn) {
      target.setCreatedOn(createdOn);
      return (C) self();
    }

    /**
     * Sets the tags for the {@link DocumentProperty} using a comma-separated string.
     *
     * @param tags A {@link String} containing comma-separated tags.
     * @param <B>  The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 tags(String tags) {
      var tagList = Strings.commasToList(Objects.requireNonNullElse(tags, ""));
      return tags(tagList);
    }

    /**
     * Sets the tags for the {@link DocumentProperty} using a list of strings.
     *
     * @param tags A {@link List} of {@link String} representing the tags.
     * @param <B>  The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 tags(List<String> tags) {
      target.setTags(tags);
      return self();
    }

    /**
     * Sets the policy basis for the {@link DocumentProperty} using a comma-separated string.
     *
     * @param policy A {@link String} containing comma-separated policy basis.
     * @param <B>    The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 policyBasis(String policy) {
      var policies = Strings.commasToList(
        Objects.requireNonNullElse(policy, "")
      );
      return policyBasis(policies);
    }

    /**
     * Sets the policy basis for the {@link DocumentProperty} using a list of strings.
     *
     * @param policy A {@link List} of {@link String} representing the policy basis.
     * @param <B>    The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 policyBasis(List<String> policy) {
      target.setPolicyBasis(policy);
      return self();
    }

    public T1 build() {
      return target;
    }
  }

  /**
   * A builder class for constructing instances of {@link DocumentProperty}.
   * This class extends the {@link DocumentPropertyBuilderBase} to provide
   * specific functionality for building {@link DocumentProperty} objects.
   *
   * <p>Usage example:</p>
   * <pre>{@code
   * DocumentProperty documentProperty = new DocumentPropertyBuilder()
   *     .withSomeProperty(value)
   *     .build();
   * }</pre>
   *
   * <p>Key methods:</p>
   * <ul>
   *   <li>{@link #build()} - Constructs and returns the {@link DocumentProperty} instance.</li>
   * </ul>
   */
  public static class DocumentPropertyBuilder
    extends DocumentPropertyBuilderBase<
      DocumentProperty,
      DocumentPropertyBuilder
    > {

    protected DocumentPropertyBuilder() {
      super(new DocumentProperty());
    }

    protected DocumentPropertyBuilder(DocumentProperty target) {
      super(target);
    }

    @Override
    public DocumentProperty build() {
      return target;
    }
  }

  /**
   * Creates and returns a new instance of the DocumentPropertyBuilder.
   * This builder is used to construct instances of the DocumentProperty class.
   *
   * @return a new instance of DocumentPropertyBuilderBase configured with a new DocumentProperty object.
   */
  public static DocumentPropertyBuilderBase<?, ?> builder() {
    return new DocumentPropertyBuilder(new DocumentProperty());
  }
}
