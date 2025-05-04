package com.obapps.schoolchatbot.core.assistants.models.search;

/**
 * Represents the types of records that can be searched in the AI system.
 */
public class AiSearchRecordType {
  /**
   * Represents a case document type.
   */
  public static final String CaseDocument = "case_document";

  /**
   * Represents a policy type.
   */
  public static final String Policy = "policy";  

  /**
   * Represents the subtypes of documents.
   */
  public static class DocumentSubType {
    /**
     * Represents an email document subtype.
     */
    public static final String Email = "email";

    /**
     * Represents an attachment document subtype.
     */
    public static final String Attachment = "attachment";

    /**
     * Represents a notes document subtype.
     */
    public static final String Notes = "notes";
  }

  /**
   * Represents the subtypes of policies.
   */
  public static class PolicySubType  {
    /**
     * Represents a school policy subtype.
     */
    public static final String Policy = "school_policy";

    /**
     * Represents a state law procedure subtype.
     */
    public static final String Procedure = "state_law";

    /**
     * Represents a federal law guideline subtype.
     */
    public static final String Guideline = "federal_law";
  }
}

