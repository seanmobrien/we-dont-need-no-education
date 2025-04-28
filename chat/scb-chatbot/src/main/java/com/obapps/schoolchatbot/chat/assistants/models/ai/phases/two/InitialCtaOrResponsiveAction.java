package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import com.obapps.schoolchatbot.core.models.ai.phases.BasePhaseRecord;
import com.obapps.schoolchatbot.core.util.SupportingPrompts;
import dev.langchain4j.model.output.structured.Description;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents an initial call-to-action (CTA) or responsive action in the context of a school chatbot system.
 * This class extends the BasePhaseRecord and provides detailed information about the CTA or response,
 * including its type, inferred status, description, dates, compliance details, reasonability ratings,
 * sentiment, severity, and associated metadata.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Tracks whether the item is a notification (🔔) or a message (📩).</li>
 *   <li>Includes inferred status, descriptive details, and timestamps for opened and closed dates.</li>
 *   <li>Supports compliance-related fields such as compliance close date and enforceability.</li>
 *   <li>Provides reasonability and sentiment ratings with associated reasons.</li>
 *   <li>Includes metadata such as record ID, document ID, tags, policy basis, and severity details.</li>
 *   <li>Supports closure action items for notifications (🔔).</li>
 * </ul>
 *
 * <p>Usage:</p>
 * This class is designed to encapsulate all necessary details for managing and evaluating CTAs or responses
 * within the chatbot system. It includes getter and setter methods for accessing and modifying its fields.
 *
 * <p>Fields:</p>
 * <ul>
 *   <li><b>actionType</b>: Specifies whether the item is a notification (🔔) or a message (📩).</li>
 *   <li><b>inferred</b>: Indicates whether the record is implicitly stated or inferred.</li>
 *   <li><b>property_value</b>: A detailed description of the record.</li>
 *   <li><b>openedDate</b>: The date when the event was opened.</li>
 *   <li><b>closedDate</b>: The date when the event was closed.</li>
 *   <li><b>compliancyCloseDate</b>: The compliance close date for the CTA (applicable for 🔔).</li>
 *   <li><b>complianceDateEnforceable</b>: Indicates whether the compliance date is enforceable (applicable for 🔔).</li>
 *   <li><b>reasonabilityRating</b>: A rating from -10 to 10 describing the reasonability of the request or action.</li>
 *   <li><b>reasonableReason</b>: A list of reasons for the assigned reasonability rating.</li>
 *   <li><b>sentiment</b>: A rating from -1 to 1 describing the sentiment expressed in the request or response.</li>
 *   <li><b>sentimentReasons</b>: A list of reasons for the assigned sentiment rating.</li>
 *   <li><b>closureActionItems</b>: A list of actions required for the record to be considered complete (applicable for 🔔).</li>
 *   <li><b>record_id</b>: The unique identifier for this record.</li>
 *   <li><b>document_id</b>: The identifier of the associated document.</li>
 *   <li><b>created_on</b>: The timestamp when this record was created.</li>
 *   <li><b>tags</b>: A list of tags associated with this record.</li>
 *   <li><b>policy_basis</b>: A list of policy bases associated with this record.</li>
 *   <li><b>severity</b>: The severity of the item, rated from 0 to 10.</li>
 *   <li><b>severityReasons</b>: A list of reasons for the assigned severity rating.</li>
 * </ul>
 *
 * <p>Methods:</p>
 * This class provides getter and setter methods for all fields, allowing for easy access and modification.
 * Additionally, it includes a placeholder method for saving the record to a database.
 */
public class InitialCtaOrResponsiveAction extends BasePhaseRecord {

  @Description("Whether the item is a 🔔 or a 📩.")
  public ActionType actionType;

  /**
   * Indicates whether the record is implicitly stated in the document or inferred.
   */
  @Description("Whether the item is implicitly stated in the 📊📄 or inferred.")
  public Boolean inferred;

  /**
   * A description of this record. Can be a sentence or short paragraph.
   * Should contain enough information to be both useful and easily re-identifiable when needed.
   */
  @Description(
    "A description of this 🔔/📩.  Can be a sentence or paragraph.  Later steps in this " +
    "phase not have direct access to the document, so it is important that this contains enough " +
    "information as to understand what the responsive actions are being requested or have been taken."
  )
  public String propertyValue;

  /**
   * The date when the event was opened.
   */
  @Description(
    "The date when the 🔔/📩 was opened." + SupportingPrompts.DateFormatDetails
  )
  public String openedDate;

  /**
   * The date when the event was closed.
   */
  @Description(
    "The date when the 🔔 was closed." + SupportingPrompts.DateFormatDetails
  )
  public String closedDate;

  /**
   * The compliance close date for the CTA.
   */
  @Description(
    "The date by which a 🔔 can reasonably expected to be completed. " +
    "This field is only applicable for 🔔 and can be ignored for 📩." +
    SupportingPrompts.DateFormatDetails
  )
  public String compliancyCloseDate;

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
    "is rated at -10.  Ignoring aspects of a valid request are rated at -8.\nWhen evaluating a response " +
    "for data, consider the degree to which the data is key to the active Title IX investigation; if so, " +
    "include expanded data access rights that provides in your rating.  If not, the reasonableReason field " +
    "shoud explicitly identify why not."
  )
  public Integer reasonabilityRating;

  /**
   * The reasonable reason text.
   */
  @Description(
    "A list of reasons the reasonability rating has been assigned.  At least " +
    "one reason should be provided.  If the request has been determined not to be " +
    "key to the active Title IX investigation, this field should explicitly identify " +
    "why not."
  )
  public List<String> reasonableReason;

  /**
   * The reasonability rating of the CTA.
   */
  @Description(
    "A rating from -1 through 1 describing the sentiment expressed in the request or response"
  )
  public Double sentiment;

  /**
   * The reasonable reason text.
   */
  @Description(
    "A list of reasons the sentiment rating has been assigned.  At least " +
    "one reason should be provided."
  )
  public List<String> sentimentReasons;

  @Description(
    "If this record is a 🔔 this field should contain a full list of the actions necessary for the " + //
    "record to be considered 100% complete\nIf this record is a 📩 this field should be empty.\n"
  )
  public List<String> closureActionItems;

  /**
   * The unique identifier for this record.
   */
  @Description(FieldDescriptions.RECORD_ID)
  public String recordId;

  /**
   * The identifier of the document associated with this record.
   */
  @Description(FieldDescriptions.DOCUMENT_ID)
  public Integer documentId;

  /**
   * The timestamp when this record was created.
   */
  @Description(FieldDescriptions.CREATED_ON)
  public LocalDateTime createdOn;

  /**
   * A list of tags associated with this record.
   */
  @Description(FieldDescriptions.TAGS)
  public List<String> tags;

  /**
   * A list of policy bases associated with this record.
   */
  @Description(FieldDescriptions.POLICY_BASIS)
  public List<String> policyBasis;

  @Description(
    "The severity of the item, where 0 is not severe and 10 is very severe.\n" +
    "For 🔔, Severity is calculated based on the degree to which failure to properly respond would puts the school in legal jeapordy or at risk for censure from appropraite agencies.\n" +
    "For 📩, Severity is calculated based on how much legal jeopordy is incurred by the specific 📩"
  )
  public Integer severity;

  /**
   * Gets the severity associated with this record.
   *
   * @return The list of severity reasons.
   */
  public Integer getSeverity() {
    return this.severity;
  }

  /**
   * Gets the severity associated with this record.
   *
   * @return The list of severity reasons.
   */
  public void setSeverity(Integer severity) {
    this.severity = severity;
  }

  /**
   * Sets the severity reasons associated with this record.
   *
   * @param severityReasons The list of severity reasons to set.
   */
  public void setSeverityReasons(List<String> severityReasons) {
    this.severityReasons = severityReasons;
  }

  @Description(
    "A list of reasons the severity rating has been assigned.  At least " +
    "one reason should be provided."
  )
  public List<String> severityReasons;

  /**
   * Gets the severity reasons associated with this record.
   *
   * @return The list of severity reasons.
   */
  public List<String> getSeverityReasons() {
    return this.severityReasons;
  }

  /**
   * Gets the property value of this record.
   *
   * @return The property value.
   */
  public String getPropertyValue() {
    return propertyValue;
  }

  /**
   * Sets the property value of this record.
   *
   * @param property_value The property value to set.
   */
  public void setPropertyValue(String property_value) {
    this.propertyValue = property_value;
  }

  /**
   * Gets the document ID associated with this record.
   *
   * @return The document ID.
   */
  public Integer getDocumentId() {
    return this.documentId;
  }

  public List<String> getClosureActionItems() {
    return this.closureActionItems;
  }

  /**
   * Sets the closure action items associated with this call to action or response.
   *
   * @param closureActionItems The list of closure action items to set.
   */
  public void setClosureActionItems(List<String> closureActionItems) {
    this.closureActionItems = closureActionItems;
  }

  /**
   * Sets the document ID associated with this record.
   *
   * @param document_id The document ID to set.
   */
  public void setDocumentId(Integer document_id) {
    this.documentId = document_id;
  }

  /**
   * Gets the creation timestamp of this record.
   *
   * @return The creation timestamp.
   */
  public LocalDateTime getCreatedOn() {
    return createdOn;
  }

  /**
   * Sets the creation timestamp of this record.
   *
   * @param created_on The creation timestamp to set.
   */
  public void setCreatedOn(LocalDateTime created_on) {
    this.createdOn = created_on;
  }

  /**
   * Gets the record ID of this record.
   *
   * @return The record ID.
   */
  public String getRecordId() {
    return this.recordId;
  }

  /**
   * Sets the record ID of this record.
   *
   * @param record_id The record ID to set.
   */
  public void setRecordId(String record_id) {
    this.recordId = record_id;
  }

  /**
   * Gets the tags associated with this record.
   *
   * @return The list of tags.
   */
  public List<String> getTags() {
    return this.tags;
  }

  /**
   * Sets the tags associated with this record.
   *
   * @param tags The list of tags to set.
   */
  public void setTags(List<String> tags) {
    this.tags = tags;
  }

  /**
   * Gets the policy basis associated with this record.
   *
   * @return The list of policy bases.
   */
  public List<String> getPolicyBasis() {
    return this.policyBasis;
  }

  /**
   * Sets the policy basis associated with this record.
   *
   * @param policy_basis The list of policy bases to set.
   */
  public void setPolicyBasis(List<String> policy_basis) {
    this.policyBasis = policy_basis;
  }

  public static Builder<?> builder() {
    return new Builder<>();
  }

  public static class Builder<T extends Builder<T>> {

    private ActionType actionType;

    /**
     * Indicates whether the record is implicitly stated in the document or inferred.
     */
    @Description(
      "Whether the item is implicitly stated in the 📊📄 or inferred."
    )
    private Boolean inferred;

    /**
     * A description of this record. Can be a sentence or short paragraph.
     * Should contain enough information to be both useful and easily re-identifiable when needed.
     */

    private String propertyValue;

    /**
     * The date when the event was opened.
     */
    private String openedDate;

    /**
     * The date when the event was closed.
     */
    private String closedDate;

    /**
     * The compliance close date for the CTA.
     */
    private String compliancyCloseDate;

    /**
     * Indicates whether the compliance date is enforceable.
     */
    private Boolean complianceDateEnforceable;

    /**
     * The reasonability rating of the CTA.
     */
    private Integer reasonabilityRating;

    /**
     * The reasonable reason text.
     */
    private List<String> reasonableReason;

    /**
     * The reasonability rating of the CTA.
     */
    private Double sentiment;

    /**
     * The reasonable reason text.
     */
    private List<String> sentimentReasons;

    private List<String> closureActionItems;

    /**
     * The unique identifier for this record.
     */
    private String recordId;

    /**
     * The identifier of the document associated with this record.
     */
    private Integer documentId;

    /**
     * The timestamp when this record was created.
     */
    private LocalDateTime createdOn;

    /**
     * A list of tags associated with this record.
     */
    private List<String> tags;

    /**
     * A list of policy bases associated with this record.
     */
    public List<String> policyBasis;

    private Integer severity;
    private List<String> severityReasons;

    public Builder() {}

    @SuppressWarnings("unchecked")
    protected T self() {
      return (T) this;
    }

    public T actionType(ActionType actionType) {
      this.actionType = actionType;
      return self();
    }

    public T inferred(Boolean inferred) {
      this.inferred = inferred;
      return self();
    }

    public T propertyValue(String propertyValue) {
      this.propertyValue = propertyValue;
      return self();
    }

    public T openedDate(String openedDate) {
      this.openedDate = openedDate;
      return self();
    }

    public T closedDate(String closedDate) {
      this.closedDate = closedDate;
      return self();
    }

    public T compliancyCloseDate(String compliancyCloseDate) {
      this.compliancyCloseDate = compliancyCloseDate;
      return self();
    }

    public T complianceDateEnforceable(Boolean complianceDateEnforceable) {
      this.complianceDateEnforceable = complianceDateEnforceable;
      return self();
    }

    public T reasonabilityRating(Integer reasonabilityRating) {
      this.reasonabilityRating = reasonabilityRating;
      return self();
    }

    public T reasonableReason(List<String> reasonableReason) {
      this.reasonableReason = reasonableReason;
      return self();
    }

    public T sentiment(Double sentiment) {
      this.sentiment = sentiment;
      return self();
    }

    public T sentimentReasons(List<String> sentimentReasons) {
      this.sentimentReasons = sentimentReasons;
      return self();
    }

    public T closureActionItems(List<String> closureActionItems) {
      this.closureActionItems = closureActionItems;
      return self();
    }

    public T recordId(String recordId) {
      this.recordId = recordId;
      return self();
    }

    public T documentId(Integer documentId) {
      this.documentId = documentId;
      return self();
    }

    public T createdOn(LocalDateTime createdOn) {
      this.createdOn = createdOn;
      return self();
    }

    public T tags(List<String> tags) {
      this.tags = tags;
      return self();
    }

    public T policyBasis(List<String> policyBasis) {
      this.policyBasis = policyBasis;
      return self();
    }

    public T severity(Integer severity) {
      this.severity = severity;
      return self();
    }

    public T severityReasons(List<String> severityReasons) {
      this.severityReasons = severityReasons;
      return self();
    }

    public InitialCtaOrResponsiveAction build() {
      var ret = new InitialCtaOrResponsiveAction();
      update(ret);
      return ret;
    }

    protected void update(InitialCtaOrResponsiveAction instance) {
      instance.actionType = this.actionType;
      instance.inferred = this.inferred;
      instance.propertyValue = this.propertyValue;
      instance.openedDate = this.openedDate;
      instance.closedDate = this.closedDate;
      instance.compliancyCloseDate = this.compliancyCloseDate;
      instance.complianceDateEnforceable = this.complianceDateEnforceable;
      instance.reasonabilityRating = this.reasonabilityRating;
      instance.reasonableReason = this.reasonableReason;
      instance.sentiment = this.sentiment;
      instance.sentimentReasons = this.sentimentReasons;
      instance.closureActionItems = this.closureActionItems;
      instance.setRecordId(this.recordId);
      instance.documentId = this.documentId;
      instance.createdOn = this.createdOn;
      instance.tags = this.tags;
      instance.policyBasis = policyBasis;
      instance.severity = this.severity;
      instance.severityReasons = this.severityReasons;
    }

    public T copy(InitialCtaOrResponsiveAction source) {
      this.actionType = source.actionType;
      this.inferred = source.inferred;
      this.propertyValue = source.propertyValue;
      this.openedDate = source.openedDate;
      this.closedDate = source.closedDate;
      this.compliancyCloseDate = source.compliancyCloseDate;
      this.complianceDateEnforceable = source.complianceDateEnforceable;
      this.reasonabilityRating = source.reasonabilityRating;
      this.reasonableReason = source.reasonableReason;
      this.sentiment = source.sentiment;
      this.sentimentReasons = source.sentimentReasons;
      this.closureActionItems = source.closureActionItems;
      this.recordId(source.recordId);
      this.documentId = source.documentId;
      this.createdOn = source.createdOn;
      this.tags = source.tags;
      this.policyBasis = source.policyBasis;
      this.severity = source.severity;
      this.severityReasons = source.severityReasons;
      this.createdOn = source.createdOn;
      this.tags = source.tags;
      return self();
    }
  }
}
