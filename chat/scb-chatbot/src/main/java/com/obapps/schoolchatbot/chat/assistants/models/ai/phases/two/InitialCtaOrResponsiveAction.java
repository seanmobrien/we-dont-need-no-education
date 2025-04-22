package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.chat.assistants.models.ai.BasePhaseRecord;
import dev.langchain4j.model.output.structured.Description;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class InitialCtaOrResponsiveAction extends BasePhaseRecord {

  @Description("Whether the item is a 🔔 or a 📩.")
  public ActionType actionType;

  /**
   * Indicates whether the key point is implicitly stated in the document or inferred.
   */
  @Description("Whether the item is implicitly stated in the 📊📄 or inferred.")
  public Boolean inferred;

  /**
   * A description of this key point. Can be a sentence or short paragraph.
   * Should contain enough information to be both useful and easily re-identifiable when needed.
   */
  @Description(
    "A description of this 🔔/📩.  Can be a sentence or short paragraph.  Should contain enough information to be both useful and easily re-identifiable when needed."
  )
  public String property_value;

  /**
   * The date when the event was opened.
   */
  @Description("The date when the 🔔/📩 was opened.")
  public LocalDate openedDate;

  /**
   * The date when the event was closed.
   */
  @Description("The date when the 🔔 was closed.")
  public LocalDate closedDate;

  /**
   * The compliance close date for the CTA.
   */
  @Description(
    "The date by which a 🔔 can reasonably expected to be completed. " +
    "This field is only applicable for 🔔 and can be ignored for 📩."
  )
  public LocalDate compliancyCloseDate;

  /**
   * Indicates whether the compliance date is enforceable.
   */
  @Description(
    "Whether the due date is enforceable, e.g., has a demonstrable basis " + //
    "in law or school board policy.  This field is only applicable for 🔔 and " +
    "can be ignored for 📩."
  )
  public Boolean complianceDateEnforceable;

  /**
   * The reasonability rating of the CTA.
   */
  @Description(
    "A rating from -10 through 10 as to how reasonable the request or action is.\nRequests for actions " + //
    "the district is obligated to perform, such as a valid records request, are rated at 10. " + //
    "Requests that the district is not legally able to perform, such as violating FERPA privacy " + //
    "protections without basis (Title IX, etc), are rated at -10.\nResponses that fully comply with " +
    "district obligations and meet the spirit of the request are rated at 10.  Responses that " +
    "use deception or misdirection to avoid compliance are rated at -10.\nIgnoring an obligation " +
    "is rated at -10.  Ignoring aspects of a valid request are rated at -8."
  )
  public Integer reasonabilityRating;

  /**
   * The reasonable reason text.
   */
  @Description(
    "A list of reasons the reasonabilityRating has been assigned.  At least " +
    "one reason should be provided."
  )
  public List<String> reasonableReason;

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

  public void saveToDb(Db db) {
    // TODO Auto-generated method stub
    throw new UnsupportedOperationException("Unimplemented method 'saveToDb'");
  }
}
