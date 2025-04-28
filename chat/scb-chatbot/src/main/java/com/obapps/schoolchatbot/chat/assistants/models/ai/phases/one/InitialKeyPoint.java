package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.one;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.KeyPoint;
import com.obapps.schoolchatbot.core.models.ai.phases.BasePhaseRecord;
import dev.langchain4j.model.output.structured.Description;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents the initial key point in the analysis phase of the chatbot.
 * This class contains metadata and attributes related to a key point,
 * such as its relevance, compliance, severity, and associated tags.
 */
public class InitialKeyPoint extends BasePhaseRecord {

  /**
   * A description of this key point. Can be a sentence or short paragraph.
   * Should contain enough information to be both useful and easily re-identifiable when needed.
   */
  @Description(
    "A description of this 🗝️.  Can be a sentence or short paragraph.  Should contain enough information to be both useful and easily re-identifiable when needed."
  )
  String property_value;

  /**
   * The relevance of the key point to the document and/or case, on a scale from 0 to 1.
   * 0 = not relevant, 1 = very relevant.
   */
  @Description(
    "The relevance of the 🗝️ to the 📊📄 and / or case, on a scale from 0 to 1."
  )
  Double relevance;

  /**
   * Indicates whether the key point is implicitly stated in the document or inferred.
   */
  @Description("Whether the 🗝️ is implicitly stated in the 📊📄 or inferred.")
  Boolean inferred;

  /**
   * A ranking from 1-10 describing the severity of the issue described by this key point.
   */
  @Description(
    "A ranking from 1-10 describing the severity of the issue described by this key point."
  )
  Integer severity;

  /**
   * A ranking from -1 to 1 describing the degree to which this key point demonstrates compliance
   * with applicable laws and policies. -1 = blatant or systemic disregard, 1 = fully compliant.
   */
  @Description(
    "A ranking from -1 to 1 describing the degree to which this 🗝️ demonstrates compliance with applicable laws and policies, with -1 being blatant or systemic disregard and, and 1 being fully compliant."
  )
  Double compliance;

  /**
   * The unique identifier for this record.
   */
  @Description(FieldDescriptions.RECORD_ID)
  String record_id;

  /**
   * The identifier of the document associated with this key point.
   */
  @Description(FieldDescriptions.DOCUMENT_ID)
  Integer document_id;

  /**
   * The timestamp when this key point was created.
   */
  @Description(FieldDescriptions.CREATED_ON)
  private LocalDateTime created_on;

  /**
   * A list of tags associated with this key point.
   */
  @Description(FieldDescriptions.TAGS)
  List<String> tags;

  /**
   * A list of policy bases associated with this key point.
   */
  @Description(FieldDescriptions.POLICY_BASIS)
  List<String> policy_basis;

  /**
   * Default constructor initializing tags and policy_basis as empty lists.
   */
  public InitialKeyPoint() {
    super();
    tags = new java.util.ArrayList<>();
    policy_basis = new java.util.ArrayList<>();
  }

  /**
   * Gets the property value of this key point.
   *
   * @return The property value.
   */
  public String getPropertyValue() {
    return property_value;
  }

  /**
   * Sets the property value of this key point.
   *
   * @param property_value The property value to set.
   */
  public void setPropertyValue(String property_value) {
    this.property_value = property_value;
  }

  /**
   * Gets the document ID associated with this key point.
   *
   * @return The document ID.
   */
  public Integer getDocumentId() {
    return this.document_id;
  }

  /**
   * Sets the document ID associated with this key point.
   *
   * @param document_id The document ID to set.
   */
  public void setDocumentId(Integer document_id) {
    this.document_id = document_id;
  }

  /**
   * Gets the creation timestamp of this key point.
   *
   * @return The creation timestamp.
   */
  public LocalDateTime getCreatedOn() {
    return created_on;
  }

  /**
   * Sets the creation timestamp of this key point.
   *
   * @param created_on The creation timestamp to set.
   */
  public void setCreatedOn(LocalDateTime created_on) {
    this.created_on = created_on;
  }

  /**
   * Gets the record ID of this key point.
   *
   * @return The record ID.
   */
  public String getRecordId() {
    return this.record_id;
  }

  /**
   * Sets the record ID of this key point.
   *
   * @param record_id The record ID to set.
   */
  public void setRecordId(String record_id) {
    this.record_id = record_id;
  }

  /**
   * Gets the tags associated with this key point.
   *
   * @return The list of tags.
   */
  public List<String> getTags() {
    return this.tags;
  }

  /**
   * Sets the tags associated with this key point.
   *
   * @param tags The list of tags to set.
   */
  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  /**
   * Gets the policy basis associated with this key point.
   *
   * @return The list of policy bases.
   */
  public List<String> getPolicyBasis() {
    return this.policy_basis;
  }

  /**
   * Sets the policy basis associated with this key point.
   *
   * @param policy_basis The list of policy bases to set.
   */
  public void setPolicyBasis(List<String> policy_basis) {
    this.policy_basis = policy_basis;
  }

  /**
   * Gets the severity of this key point.
   *
   * @return The severity value.
   */
  public Integer getSeverity() {
    return severity;
  }

  /**
   * Sets the severity of this key point.
   *
   * @param severity The severity value to set.
   */
  public void setSeverity(Integer severity) {
    this.severity = severity;
  }

  /**
   * Gets the compliance of this key point.
   *
   * @return The compliance value.
   */
  public Double getCompliance() {
    return compliance;
  }

  /**
   * Sets the compliance of this key point.
   *
   * @param compliance The compliance value to set.
   */
  public void setCompliance(Double compliance) {
    this.compliance = compliance;
  }

  /**
   * Gets the relevance of this key point.
   *
   * @return The relevance value.
   */
  public Double getRelevance() {
    return relevance;
  }

  /**
   * Gets whether this key point is inferred.
   *
   * @return True if inferred, false otherwise.
   */
  public Boolean getInferred() {
    return inferred;
  }

  /**
   * Sets the relevance of this key point.
   *
   * @param relevance The relevance value to set.
   */
  public void setRelevance(Double relevance) {
    this.relevance = relevance;
  }

  /**
   * Sets whether this key point is inferred.
   *
   * @param inferred True if inferred, false otherwise.
   */
  public void setInferred(Boolean inferred) {
    this.inferred = inferred;
  }

  /**
   * Saves this key point to the database.
   *
   * @param db The database instance to save the key point to.
   * @return The saved KeyPoint object.
   * @throws SQLException If a database access error occurs.
   */
  public KeyPoint saveToDb(Db db) throws SQLException {
    if (db == null) {
      db = Db.getInstance();
    }
    var keyPoint = KeyPoint.builder()
      .propertyValue(this.property_value)
      .documentId(this.getDocumentId())
      .relevance(this.getRelevance())
      .compliance(this.getCompliance())
      .severity(this.getSeverity())
      .tags(this.getTags())
      .policyBasis(this.getPolicyBasis())
      .inferred(this.getInferred())
      .createdOn(this.getCreatedOn())
      .build();
    keyPoint.addToDb(db);
    return keyPoint;
  }

  /**
   * Builder class for constructing InitialKeyPoint objects.
   */
  public static class Builder {

    private String id;
    private Integer document_id;
    private String property_value;
    private LocalDateTime created_on;
    List<String> tags;
    List<String> policy_basis;

    private Double relevance;
    private Boolean inferred;
    private Integer severity;
    private Double compliance;

    /**
     * Sets the record ID for the key point.
     *
     * @param id The record ID.
     * @return The Builder instance.
     */
    public Builder setRecordId(String id) {
      this.id = id;
      return this;
    }

    /**
     * Sets the creation timestamp for the key point.
     *
     * @param created_on The creation timestamp.
     * @return The Builder instance.
     */
    public Builder setCreatedOn(LocalDateTime created_on) {
      this.created_on = created_on;
      return this;
    }

    /**
     * Sets the document ID for the key point.
     *
     * @param document_id The document ID.
     * @return The Builder instance.
     */
    public Builder setDocumentId(Integer document_id) {
      this.document_id = document_id;
      return this;
    }

    /**
     * Sets the property value for the key point.
     *
     * @param property_value The property value.
     * @return The Builder instance.
     */
    public Builder setPropertyValue(String property_value) {
      this.property_value = property_value;
      return this;
    }

    /**
     * Sets the tags for the key point.
     *
     * @param tags The list of tags.
     * @return The Builder instance.
     */
    public Builder setTags(List<String> tags) {
      this.tags = tags;
      return this;
    }

    /**
     * Sets the policy basis for the key point.
     *
     * @param policy_basis The list of policy bases.
     * @return The Builder instance.
     */
    public Builder setPolicyBasis(List<String> policy_basis) {
      this.policy_basis = policy_basis;
      return this;
    }

    /**
     * Sets the relevance for the key point.
     *
     * @param relevance The relevance value.
     * @return The Builder instance.
     */
    public Builder setRelevance(Double relevance) {
      this.relevance = relevance;
      return this;
    }

    /**
     * Sets whether the key point is inferred.
     *
     * @param inferred True if inferred, false otherwise.
     * @return The Builder instance.
     */
    public Builder setInferred(Boolean inferred) {
      this.inferred = inferred;
      return this;
    }

    /**
     * Sets the severity for the key point.
     *
     * @param severity The severity value.
     * @return The Builder instance.
     */
    public Builder setSeverity(Integer severity) {
      this.severity = severity;
      return this;
    }

    /**
     * Sets the compliance for the key point.
     *
     * @param compliance The compliance value.
     * @return The Builder instance.
     */
    public Builder setCompliance(Double compliance) {
      this.compliance = compliance;
      return this;
    }

    /**
     * Builds and returns an InitialKeyPoint object.
     *
     * @return The constructed InitialKeyPoint object.
     */
    public InitialKeyPoint build() {
      InitialKeyPoint keyPoint = new InitialKeyPoint();
      keyPoint.record_id = id;
      keyPoint.document_id = this.document_id;
      keyPoint.property_value = this.property_value;
      keyPoint.relevance = this.relevance;
      keyPoint.inferred = this.inferred;
      keyPoint.severity = this.severity;
      keyPoint.compliance = this.compliance;
      keyPoint.tags = this.tags;
      keyPoint.policy_basis = this.policy_basis;
      keyPoint.created_on = this.created_on;
      return keyPoint;
    }
  }
}
