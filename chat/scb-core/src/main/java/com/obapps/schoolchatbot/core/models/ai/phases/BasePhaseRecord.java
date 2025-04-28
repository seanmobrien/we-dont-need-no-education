package com.obapps.schoolchatbot.core.models.ai.phases;

import java.time.LocalDateTime;
import java.util.List;

/**
 * BasePhaseRecord is an abstract class that serves as a base for records in the system.
 * It provides a structure for managing metadata and attributes associated with a record,
 * such as document ID, record ID, tags, policy basis, record type, and creation timestamp.
 */
public abstract class BasePhaseRecord {

  /**
   * Default constructor for BasePhaseRecord.
   * This constructor is protected to prevent direct instantiation of the abstract class.
   */
  protected BasePhaseRecord() {}

  /**
   * Retrieves the unique Document ID of the record.
   *
   * @return the Document ID as an Integer.
   */
  public abstract Integer getDocumentId();

  /**
   * Sets the unique Document ID of the record.
   *
   * @param document_id the Document ID to set.
   */
  public abstract void setDocumentId(Integer document_id);

  /**
   * Retrieves the unique Record ID of the record.
   *
   * @return the Record ID as a String.
   */
  public abstract String getRecordId();

  /**
   * Sets the unique Record ID of the record.
   *
   * @param record_id the Record ID to set.
   */
  public abstract void setRecordId(String record_id);

  /**
   * Retrieves the list of tags associated with the record.
   *
   * @return a List of tags as Strings.
   */
  public abstract List<String> getTags();

  /**
   * Sets the list of tags associated with the record.
   *
   * @param tags the List of tags to set.
   */
  public abstract void setTags(List<String> tags);

  /**
   * Retrieves the list of policy basis references for the record.
   *
   * @return a List of policy basis references as Strings.
   */
  public abstract List<String> getPolicyBasis();

  /**
   * Sets the list of policy basis references for the record.
   *
   * @param policy_basis the List of policy basis references to set.
   */
  public abstract void setPolicyBasis(List<String> policy_basis);

  /**
   * Retrieves the type of the record.
   *
   * @return the record type as a String.
   */
  public String getRecordType() {
    return this.getClass().getSimpleName();
  }

  /**
   * Sets the timestamp when the record was created.
   *
   * @param created_on the creation timestamp to set.
   */
  public abstract void setCreatedOn(LocalDateTime created_on);

  /**
   * Retrieves the timestamp when the record was created.
   *
   * @return the creation timestamp as a LocalDateTime.
   */
  public abstract LocalDateTime getCreatedOn();

  /**
   * FieldDescriptions is a static nested class that provides descriptions
   * for the fields in BasePhaseRecord. These descriptions are intended to
   * provide context and guidance for the usage of each field.
   */
  protected static class FieldDescriptions {

    /**
     * Description for the RECORD_ID field.
     * "When set, this value contains a UUID that uniquely identifies this 🧾.
     * This field can be left empty for new records."
     */
    public static final String RECORD_ID =
      "When set, this value contains a UUID that uniquely identifies this 🧾.  This field can be left empty for new records.";

    /**
     * Description for the DOCUMENT_ID field.
     * "The unique Document ID of the 📊📄 this 🧾 was sourced from."
     */
    public static final String DOCUMENT_ID =
      "The unique Document ID of the 📊📄 this 🧾 was sourced from.";

    /**
     * Description for the TAGS field.
     * "A list of tags to associate with this record - e.g., [ \"bullying\", \"harassment\", \"discrimination\" ].
     * Tags are used to facilitate search, categorization, and organization.
     * At least one tag should be provided, but multiples are preferred."
     */
    public static final String TAGS =
      "A list of tags to associate with this record - e.g., [ \"bullying\", \"harassment\", \"discrimination\" ].  Tags are used to facilitate search, categorization, and organization.  At least one tag should be provided, but multiples are preferred.";

    /**
     * Description for the POLICY_BASIS field.
     * "A list of all laws or school board policies that provide a basis for this point,
     * e.g., [ \"Title IX\", \"MN Statute 13.3\", \"Board Policy 503\" ].
     * The value \"common decency\" is used to indicate that the point is based on common sense or decency,
     * and reasonably fits under general ethical obligations as opposed to a specific law or policy.
     * At least one value should be provided, but multiple values are allowed.
     * The value of [\"N/A\"] can be used if there is no other possible alternative."
     */
    public static final String POLICY_BASIS =
      "A list of list of all laws or school board policies that provide a basis for this point, e.g., [ \"Title IX\", \"MN Statute 13.3\", \"Board Policy 503\"] .  The value \"common decency\" is used to indicate that the point is based on common sense or decency, and reasonably fits under general ethical obligations as opposed to a specific law or policy.  At least one value should be provided, but multiple values are allowed.  The value of [\"N/A\"] can be used if there is no other possible altertative.";

    /**
     * Description for the CREATED_ON field.
     * "The timestamp when this record was created.
     * This should be set to the 📨📅 of the 📊📄."
     */
    public static final String CREATED_ON =
      "The timestamp when this record was created.  This should be set to the 📨📅 of the 📊📄";
  }
}
