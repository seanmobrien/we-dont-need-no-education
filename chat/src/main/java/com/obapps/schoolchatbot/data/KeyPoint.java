package com.obapps.schoolchatbot.data;

import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public class KeyPoint extends DocumentProperty {

  private Integer policyId;
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
    setPropertyType(9);
    setInferred(false);
  }

  /**
   * Constructor for the KeyPoint class that initializes the object using a state bag.
   *
   * @param stateBag A map containing the state data to initialize the object.
   */
  public KeyPoint(Map<String, Object> stateBag) {
    super(stateBag);
    Db.saveIntFromStateBag(stateBag, "policy_id", this::setPolicyId);
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
  }

  /**
   * Gets the policy ID associated with this KeyPoint.
   *
   * @return The policy ID as an Integer.
   */
  public Integer getPolicyId() {
    return policyId;
  }

  /**
   * Sets the policy ID for this KeyPoint.
   *
   * @param policyId The policy ID to set.
   */
  public void setPolicyId(Integer policyId) {
    this.policyId = policyId;
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
  public KeyPoint addToDb() throws SQLException {
    return addToDb(Db.getInstance());
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
      "(property_id, policy_id, relevance, compliance, severity_ranking, inferred, policy_basis, tags) " +
      "VALUES " +
      "(?,?,?,?,?,?,?,?)",
      getPropertyId(),
      //policyId < 1 ? null : policyId,
      null,
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
      "SELECT ep.*, kp.policy_id, kp.relevance, kp.compliance " +
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

  public static class KeyPointBuilder
    extends DocumentPropertyBuilderBase<KeyPoint, KeyPointBuilder> {

    protected KeyPointBuilder() {
      super(new KeyPoint());
    }

    protected KeyPointBuilder(KeyPoint target) {
      super(target);
    }

    public <B extends KeyPointBuilder> B emailProperty(
      DocumentProperty emailProperty
    ) {
      return self()
        .documentId(emailProperty.getDocumentId())
        .propertyId(emailProperty.getPropertyId())
        .propertyType(emailProperty.getPropertyType())
        .propertyValue(emailProperty.getPropertyValue())
        .createdOn(emailProperty.getCreatedOn());
    }

    public <B extends KeyPointBuilder> B policyId(Integer policyId) {
      target.setPolicyId(policyId);
      return self();
    }

    public <B extends KeyPointBuilder> B inferred(Boolean inferred) {
      target.setInferred(inferred);
      return self();
    }

    public <B extends KeyPointBuilder> B relevance(Double relevance) {
      target.setRelevance(relevance);
      return self();
    }

    public <B extends KeyPointBuilder> B compliance(double compliance) {
      target.setCompliance(compliance);
      return self();
    }

    public <B extends KeyPointBuilder> B severity(Integer severity) {
      target.setSeverityRanking(severity);
      return self();
    }

    public <B extends KeyPointBuilder> B tags(String tags) {
      var tagList = List.of(Objects.requireNonNullElse(tags, "").split(","));
      return tags(tagList);
    }

    public <B extends KeyPointBuilder> B tags(List<String> tags) {
      target.setTags(tags);
      return self();
    }

    public <B extends KeyPointBuilder> B policyBasis(String tags) {
      var tagList = List.of(Objects.requireNonNullElse(tags, "").split(","));
      return policyBasis(tagList);
    }

    public <B extends KeyPointBuilder> B policyBasis(List<String> tags) {
      target.setPolicyBasis(tags);
      return self();
    }
  }

  public static KeyPointBuilder builder() {
    return new KeyPointBuilder();
  }
}
