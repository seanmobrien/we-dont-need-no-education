package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import com.obapps.schoolchatbot.util.Strings;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public class KeyPoint extends DocumentProperty {

  private Double relevance;
  private double compliance;
  private Integer severityRanking;
  private List<String> tags;
  private List<String> policyBasis;
  private Boolean inferred;

  /**
   * Gets whether this KeyPoint is inferred.
   *
   * @return True if inferred, otherwise false.
   */
  public Boolean getInferred() {
    return inferred;
  }

  /**
   * Sets whether this KeyPoint is inferred.
   *
   * @param inferred True if inferred, otherwise false.
   */
  public void setInferred(Boolean inferred) {
    this.inferred = inferred;
  }

  /**
   * Default constructor for the KeyPoint class.
   * Initializes a new instance of the KeyPoint class with default values.
   */
  public KeyPoint() {
    super();
    setPropertyType(DocumentPropertyType.KnownValues.KeyPoint);
    setInferred(false);
  }

  /**
   * Constructor for the KeyPoint class that initializes the object using a state bag.
   *
   * @param stateBag A map containing the state data to initialize the object.
   */
  public KeyPoint(Map<String, Object> stateBag) {
    super(stateBag);
    setPropertyType(DocumentPropertyType.KnownValues.KeyPoint);
    Db.saveDoubleFromStateBag(stateBag, "relevance", this::setRelevance);
    Db.saveDoubleFromStateBag(stateBag, "compliance", this::setCompliance);
    Db.saveIntFromStateBag(
      stateBag,
      "severity_ranking",
      this::setSeverityRanking
    );
    Db.saveStringArrayFromStateBag(
      stateBag,
      "policy_basis",
      this::setPolicyBasis
    );
    Db.saveStringArrayFromStateBag(stateBag, "tags", this::setTags);
    Db.saveBooleanFromStateBag(stateBag, "inferred", this::setInferred);
  }

  /**
   * Gets the severity ranking of this KeyPoint.
   *
   * @return The severity ranking as an Integer.
   */
  public Integer getSeverityRanking() {
    return severityRanking;
  }

  /**
   * Sets the severity ranking for this KeyPoint.
   *
   * @param severityRanking The severity ranking to set.
   */
  public void setSeverityRanking(Integer severityRanking) {
    this.severityRanking = severityRanking;
  }

  /**
   * Gets the tags associated with this KeyPoint.
   *
   * @return A list of tags as Strings.
   */
  public List<String> getTags() {
    return tags;
  }

  /**
   * Sets the tags for this KeyPoint.
   *
   * @param tags The list of tags to set.
   */
  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  /**
   * Gets the policy basis associated with this KeyPoint.
   *
   * @return A list of policy basis as Strings.
   */
  public List<String> getPolicyBasis() {
    return policyBasis;
  }

  /**
   * Sets the policy basis for this KeyPoint.
   *
   * @param policyBasis The list of policy basis to set.
   */
  public void setPolicyBasis(List<String> policyBasis) {
    this.policyBasis = policyBasis;
  }

  /**
   * Gets the relevance score of this KeyPoint.
   *
   * @return The relevance score as a Double.
   */
  public Double getRelevance() {
    return relevance;
  }

  /**
   * Sets the relevance score for this KeyPoint.
   *
   * @param relevance The relevance score to set.
   */
  public void setRelevance(Double relevance) {
    this.relevance = relevance;
  }

  /**
   * Gets the compliance value of this KeyPoint.
   *
   * @return The compliance value as a double.
   */
  public double getCompliance() {
    return compliance;
  }

  /**
   * Sets the compliance value for this KeyPoint.
   *
   * @param compliance The compliance value to set.
   */
  public void setCompliance(double compliance) {
    this.compliance = compliance;
  }

  @SuppressWarnings("unchecked")
  @Override
  public KeyPoint addToDb(Db db) throws SQLException {
    var propertyRecord = super.addToDb(db);
    if (propertyRecord == null || getPropertyId() == null) {
      throw new SQLException("Unexpected error adding email_property record");
    }

    var records = db.executeUpdate(
      "INSERT INTO key_points_details " +
      "(property_id, relevance, compliance, severity_ranking, inferred, policy_basis, tags) " +
      "VALUES " +
      "(?,?,?,?,?,?,?)",
      getPropertyId(),
      relevance,
      compliance,
      severityRanking,
      inferred,
      policyBasis,
      tags
    );
    if (records < 1) {
      throw new SQLException(
        "Unexpected error adding key_points_details record"
      );
    }
    return this;
  }

  /**
   * Loads a KeyPoint object based on the provided email property ID.
   *
   * @param emailPropertyId the ID of the email property to load the KeyPoint for
   * @return the loaded KeyPoint object
   * @throws SQLException if a database access error occurs
   */
  public static KeyPoint loadKeyPoint(UUID emailPropertyId)
    throws SQLException {
    return loadKeyPoint(Db.getInstance(), emailPropertyId);
  }

  /**
   * Loads a KeyPoint object from the database based on the given email property ID.
   *
   * @param db               The database connection object used to execute the query.
   * @param emailPropertyId  The ID of the email property to retrieve the associated KeyPoint.
   * @return                 A KeyPoint object if a matching record is found, or null if no record exists.
   * @throws SQLException    If a database access error occurs or the query fails.
   */
  public static KeyPoint loadKeyPoint(Db db, UUID emailPropertyId)
    throws SQLException {
    var record = db.selectRecords(
      "SELECT ep.property_value, ep.email_property_type_id, ep.property_id, " +
      "ep.document_id, ep.created_on, kp.* " +
      "FROM document_property ep " +
      "JOIN key_points_details kp ON ep.property_id = kp.property_id " +
      "WHERE ep.property_id = ?",
      emailPropertyId
    );
    if (record.size() > 0) {
      return new KeyPoint(record.get(0));
    }
    return null;
  }

  /**
   * Builder class for constructing instances of {@link KeyPoint}.
   * This class extends {@link DocumentPropertyBuilderBase} to provide
   * additional methods specific to {@link KeyPoint}.
   */
  public static class KeyPointBuilder
    extends KeyPointBuilderBase<KeyPoint, KeyPointBuilder> {

    public KeyPointBuilder() {
      super(new KeyPoint());
    }
  }

  /**
   * Base builder class for constructing instances of {@link KeyPoint}.
   * This class extends {@link DocumentPropertyBuilderBase} to provide
   * additional methods specific to {@link KeyPoint}.  It supports creating
   * a builder class for objects that are or inherit from {@link KeyPoint}.
   */
  public static class KeyPointBuilderBase<
    T1 extends KeyPoint, B extends KeyPointBuilderBase<T1, B>
  >
    extends DocumentPropertyBuilderBase<T1, B> {

    /**
     * Constructor for creating a new {@link KeyPointBuilder} instance
     * with an existing {@link KeyPoint} target.
     *
     * @param target The existing {@link KeyPoint} instance to modify.
     */
    protected KeyPointBuilderBase(T1 target) {
      super(target);
    }

    /**
     * Copies the properties from the given {@link KeyPoint} instance to the current builder instance.
     *
     * @param keyPoint the {@link KeyPoint} instance whose properties are to be copied
     * @param <B> the type of the builder extending {@link KeyPointBuilder}
     * @return the current builder instance with the copied properties
     */
    public <B2 extends B> B2 copy(KeyPoint keyPoint) {
      return self()
        .documentId(target.getDocumentId())
        .createdOn(target.getCreatedOn())
        .propertyType(target.getPropertyType())
        .propertyValue(target.getPropertyValue())
        .inferred(target.getInferred())
        .relevance(target.getRelevance())
        .compliance(target.getCompliance())
        .severity(target.getSeverityRanking())
        .tags(target.getTags())
        .policyBasis(target.getPolicyBasis())
        .createdOn(target.getCreatedOn());
    }

    /**
     * Sets the email property of the {@link KeyPoint} using a {@link DocumentProperty}.
     *
     * @param emailProperty The {@link DocumentProperty} containing email-related data.
     * @param <B>           The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 emailProperty(DocumentProperty emailProperty) {
      return self()
        .documentId(emailProperty.getDocumentId())
        .propertyId(emailProperty.getPropertyId())
        .propertyType(emailProperty.getPropertyType())
        .propertyValue(emailProperty.getPropertyValue())
        .createdOn(emailProperty.getCreatedOn());
    }

    /**
     * Sets whether the {@link KeyPoint} is inferred.
     *
     * @param inferred A {@link Boolean} indicating if the key point is inferred.
     * @param <B>      The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 inferred(Boolean inferred) {
      target.setInferred(inferred);
      return self();
    }

    /**
     * Sets the relevance score of the {@link KeyPoint}.
     *
     * @param relevance A {@link Double} representing the relevance score.
     * @param <B>       The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 relevance(Double relevance) {
      target.setRelevance(relevance);
      return self();
    }

    /**
     * Sets the compliance score of the {@link KeyPoint}.
     *
     * @param compliance A {@code double} representing the compliance score.
     * @param <B>        The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 compliance(double compliance) {
      target.setCompliance(compliance);
      return self();
    }

    /**
     * Sets the severity ranking of the {@link KeyPoint}.
     *
     * @param severity An {@link Integer} representing the severity ranking.
     * @param <B>      The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 severity(Integer severity) {
      target.setSeverityRanking(severity);
      return self();
    }

    /**
     * Sets the tags for the {@link KeyPoint} using a comma-separated string.
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
     * Sets the tags for the {@link KeyPoint} using a list of strings.
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
     * Sets the policy basis for the {@link KeyPoint} using a comma-separated string.
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
     * Sets the policy basis for the {@link KeyPoint} using a list of strings.
     *
     * @param policy A {@link List} of {@link String} representing the policy basis.
     * @param <B>    The type of the builder.
     * @return The builder instance for method chaining.
     */
    public <B2 extends B> B2 policyBasis(List<String> policy) {
      target.setPolicyBasis(policy);
      return self();
    }
  }

  /**
   * Creates and returns a new instance of the {@link KeyPointBuilder}.
   * This method provides a convenient way to construct a {@link KeyPoint} object
   * using the builder pattern.
   *
   * @return a new {@link KeyPointBuilder} instance.
   */
  public static KeyPointBuilderBase<
    ? extends KeyPoint,
    ? extends KeyPointBuilderBase<?, ?>
  > builder() {
    return new KeyPointBuilder();
  }
}
