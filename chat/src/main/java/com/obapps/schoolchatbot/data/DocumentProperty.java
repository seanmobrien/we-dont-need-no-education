package com.obapps.schoolchatbot.data;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obapps.schoolchatbot.util.Db;
import com.obapps.schoolchatbot.util.Strings;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.LoggerFactory;

public class DocumentProperty {

  UUID propertyId;
  Integer documentId;
  Integer propertyType;
  String propertyValue;
  LocalDateTime createdOn;
  private List<String> tags;
  private List<String> policyBasis;

  public DocumentProperty() {}

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

  public DocumentProperty(Map<String, Object> stateBag) {
    Db.saveUuidFromStateBag(stateBag, "property_id", this::setPropertyId);
    Db.saveIntFromStateBag(stateBag, "document_id", this::setDocumentId);
    Db.saveIntFromStateBag(
      stateBag,
      "email_property_type_id",
      this::setPropertyType
    );
    Db.saveFromStateBag(stateBag, "property_value", this::setPropertyValue);
    Db.saveLocalDateTimeFromStateBag(
      stateBag,
      "created_on",
      this::setCreatedOn
    );
    Db.saveStringArrayFromStateBag(
      stateBag,
      "policy_basis",
      this::setPolicyBasis
    );
    Db.saveStringArrayFromStateBag(stateBag, "tags", this::setTags);
  }

  public UUID getPropertyId() {
    return propertyId;
  }

  public void setPropertyId(UUID propertyId) {
    this.propertyId = propertyId;
  }

  public Integer getDocumentId() {
    return documentId;
  }

  public void setDocumentId(Integer documentId) {
    this.documentId = documentId;
  }

  public Integer getPropertyType() {
    return propertyType;
  }

  public void setPropertyType(Integer propertyType) {
    this.propertyType = propertyType;
  }

  public String getPropertyValue() {
    return propertyValue;
  }

  public void setPropertyValue(String propertyValue) {
    this.propertyValue = propertyValue;
  }

  public LocalDateTime getCreatedOn() {
    return createdOn;
  }

  public void setCreatedOn(LocalDateTime createdOn) {
    this.createdOn = createdOn;
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

  public String toJson() {
    ObjectMapper objectMapper = Strings.objectMapperFactory();
    try {
      return objectMapper.writeValueAsString(this);
    } catch (JsonProcessingException e) {
      throw new RuntimeException(
        "Error serializing " + this.getClass().getName() + " to JSON",
        e
      );
    }
  }

  @SuppressWarnings("unchecked")
  public <T extends DocumentProperty> T addToDb(Db db) throws SQLException {
    if (propertyId == null) {
      propertyId = UUID.randomUUID();
    }
    if (createdOn == null) {
      createdOn = LocalDateTime.now();
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

  public static DocumentProperty addManualReview(
    Db db,
    Integer documentId,
    Exception e,
    String sender,
    Object... args
  ) {
    return addManualReview(db, documentId, null, e, sender, args);
  }

  public static DocumentProperty addManualReview(
    Db db,
    Integer documentId,
    String message,
    Exception e,
    String sender,
    Object... args
  ) {
    StringBuilder argBuilder = new StringBuilder();
    if (args != null && args.length > 0) {
      for (int i = 0; i < args.length; i++) {
        argBuilder.append(args[i]).append("\n\t");
      }
    } else {
      argBuilder.append("No arguments provided.\n\t");
    }

    try {
      return builder()
        .documentId(documentId)
        .propertyType(101)
        .propertyValue(
          String.format(
            "%s: %s\n" +
            "Sender: %s\n" +
            "Stack Trace: %s\n" +
            "The following arguments were passed:\n\t%s\n",
            Objects.requireNonNullElse(message, e.getMessage()),
            Objects.requireNonNullElse(sender, "Unknown"),
            e.getStackTrace().toString(),
            argBuilder.toString()
          )
        )
        .createdOn(LocalDateTime.now())
        .build()
        .addToDb(db);
    } catch (Exception ex) {
      LoggerFactory.getLogger(DocumentProperty.class).error(
        "Error adding manual review property to document: " + documentId,
        ex
      );
    }
    return null;
  }

  public static DocumentProperty getFromDb(UUID propertyId)
    throws SQLException {
    return getFromDb(Db.getInstance(), propertyId);
  }

  public static DocumentProperty getFromDb(Db db, UUID propertyId)
    throws SQLException {
    var records = db.selectRecords(
      "SELECT * FROM document_property WHERE property_id = ?",
      DocumentProperty.class,
      propertyId
    );
    return records.size() > 0 ? new DocumentProperty(records.get(0)) : null;
  }

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

    public static DocumentPropertyBuilder builder() {
      return new DocumentPropertyBuilder();
    }
  }

  public static DocumentPropertyBuilderBase<?, ?> builder() {
    return new DocumentPropertyBuilder(new DocumentProperty());
  }
}
