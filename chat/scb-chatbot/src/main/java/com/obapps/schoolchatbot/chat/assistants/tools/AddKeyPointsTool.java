package com.obapps.schoolchatbot.chat.assistants.tools;

import com.obapps.schoolchatbot.chat.assistants.KeyPointAnalysis;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.core.assistants.services.*;
import com.obapps.schoolchatbot.core.assistants.tools.MessageTool;
import com.obapps.schoolchatbot.core.models.*;
import com.obapps.schoolchatbot.core.repositories.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;

public class AddKeyPointsTool extends MessageTool<AugmentedContentList> {

  private final HistoricKeyPointRepository keyPointRepository;
  private final JustInTimePolicyLookup policyLookup;
  private final JustInTimeDocumentLookup documentLookup;

  /**
   * Constructor for the AddKeyPointsTool class.
   * Initializes the tool with the provided message metadata and sets up a logger.
   *
   * @param messageMetadata The message metadata associated with this tool.
   * @throws SQLException
   */
  public AddKeyPointsTool(KeyPointAnalysis content) {
    this(content, null, null, null);
  }

  /**
   * Constructor for the AddKeyPointsTool class.
   * Initializes the tool with the provided message metadata and sets up a logger.
   *
   * @param messageMetadata The message metadata associated with this tool.
   * @throws SQLException
   */
  public AddKeyPointsTool(
    KeyPointAnalysis content,
    HistoricKeyPointRepository keyPointRepository,
    JustInTimePolicyLookup policyLookup,
    JustInTimeDocumentLookup documentLookup
  ) {
    super(content);
    this.keyPointRepository = keyPointRepository == null
      ? new HistoricKeyPointRepository()
      : keyPointRepository;
    this.policyLookup = policyLookup == null
      ? new JustInTimePolicyLookup(content)
      : policyLookup;
    this.documentLookup = documentLookup == null
      ? new JustInTimeDocumentLookup(content)
      : documentLookup;
  }

  /*

  @Tool(
    name = "addProcessingNote",
    value = "Adds a note to the processing history of the email.  This is useful for adding notes about the analysis process, or for adding information that may be useful for future analysis.\n"
  )
  public void addProcessingNote(String note) {
    var msg = message();
    var msgId = msg.getDocumentId();
    try {
      if (msgId == null) {
        log.warn(
          "Unable to add processing note - no Document ID available.  Details: " +
          note
        );
        return;
      }
      DocumentProperty.builder()
        .documentId(msg.getDocumentId())
        .propertyValue(note)
        .propertyType(DocumentPropertyType.KnownValues.ProcessingNote)
        .build()
        .addToDb(this.keyPointRepository.db());
      addNote();
    } catch (SQLException e) {
      DocumentProperty.addManualReview(msgId, e, "AddNote", note);
      log.error(
        "Unexpected SQL failure adding processing note.  Details: " + note,
        e
      );
    }
  }

  @Tool(
    name = "addKeyPointToDatabase",
    value = "Adds an analyzed key point identified from the target document to our database for further analysis.  Each Key Point is related to at least one " +
    "legal obligation the school is subject to.\n" +
    " ** Returns **\n" +
    "  - If the operation succeeded, a unique identifier for the key point.\n" +
    "  - If the operation failed, the word 'ERROR' and a description of the failure, e.g. 'ERROR: No document context available.'"
  )
  public String addKeyPointToDatabase(
    @P(
      required = true,
      value = "A summary of the key point.  It should include enough information to be able to identify the concern and understand the basis for the severity and compliance ratings during subsequent analysis stages.  ***Quotation marks are not allowed as input*** - use single-dash (e.g ') instead.  "
    ) String keyPointSummary,
    @P(
      required = true,
      value = "A rating from 1-100 describing the degree to which the policy in question is relevant to this point and/or warrants further analysis and investigation given the available information."
    ) Double relevancePercentage,
    @P(
      required = true,
      value = "A rating from 1-100 describing the level of compliance with relevant policies the school district is demonstrating."
    ) Double compliancePercentage,
    @P(
      required = true,
      value = "A rating of 1-10 describing the severity level of the concern, with 1 being a minor issue and 10 being a major issue."
    ) Integer severity,
    @P(
      required = true,
      value = "Whether the point is inferred from context or explicitly stated.  If true, the point is inferred."
    ) Boolean inferred,
    @P(
      required = true,
      value = "A comma-delimited list of any laws or school board policies that provide a basis for this point.  For example, 'Title IX, MN Statute 13.3, Board Policy 503'"
    ) String policyBasis,
    @P(
      required = true,
      value = "A comma-delimited list of tags that can be used to categorize this point.  For example, 'bullying, harassment, discrimination'."
    ) String tags
  ) {
    var msg = message();
    var msgId = msg.getDocumentId();
    KeyPoint keyPoint = null;

    try {
      // First, email property record
      if (msgId == null) {
        log.warn(
          "Unable store Key Point - no Document ID available.  Details: " +
          keyPointSummary
        );
        return "ERROR: No document context available.";
      }
      keyPoint = KeyPoint.builder()
        .propertyValue(keyPointSummary)
        .documentId(msgId)
        .relevance(relevancePercentage)
        .compliance(compliancePercentage)
        .severity(severity)
        .tags(tags)
        .policyBasis(policyBasis)
        .build();
      keyPoint.addToDb(this.keyPointRepository.db());
    } catch (SQLException ex) {
      log.error(
        "Unexpected SQL failure recording key point.  Details: " + msgId,
        keyPointSummary,
        ex
      );
      DocumentProperty.addManualReview(
        msgId,
        ex,
        "AddKeyPointsTool",
        keyPointSummary,
        relevancePercentage,
        compliancePercentage,
        severity,
        tags,
        policyBasis
      );
      return "ERROR: " + ex.getMessage();
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    addDetectedPoint();
    log.info(
      "Added Key Point to database: {}\n\tRelevance: {}\n\tCompliance Percentage: {}\n\t" +
      "Policy Basis: {}\n\tTags: {}\n\tDocument Id: {}",
      keyPointSummary,
      relevancePercentage,
      compliancePercentage,
      Objects.requireNonNullElse(policyBasis, "<none>"),
      Objects.requireNonNullElse(tags, "<none>"),
      msgId
    );
    Colors.Reset();
    return keyPoint.getPropertyId().toString();
  }

  @Tool(
    name = "signalAnalysisPhaseComplete",
    value = "Called once all key points have been extracted from the document to signal that the analysis phase is complete for the provided document ID.\n" +
    " ** Returns **\n" +
    "  - If the operation succeeded, a message indicating success.\n" +
    "  - If the operation failed, the word 'ERROR' and a description of the failure, e.g. 'ERROR: No document context available.'"
  )
  public void signalAnalysisPhaseComplete(Integer documentId) {
    processingCompletedCalled(documentId);
  }
*/
  @Tool(
    name = "searchForRelatedKeyPoints",
    value = "Searches for key points that are related to the provided summary, policy basis, and tags.  The search is performed using " +
    "a fuzzy match on the summary and policy basis, and an exact match on the tags.  The results are returned as an array of KeyPoint objects.  " +
    "Inferred key points can be excluded from the search results by pasing true to excludeInferred.\n" +
    " ** Returns **\n" +
    "  - An array of KeyPoint objects that match the search criteria.  If no key points are found, an empty array is returned."
  )
  public KeyPoint[] searchForRelatedKeyPoints(
    @P(
      required = true,
      value = "A comma-delimited list of policies or laws to search for, or an empty string if policy basis should not be considered.  Returned key points will be associated with all of the referenced policies.  "
    ) String matchFromPolicyBasis,
    @P(
      required = true,
      value = "If provided, a comma-delimited list of tags to search forfor, or an empty string if tags should not be considered.  Returned key points will contain all of the referenced tags."
    ) String matchFromTags,
    @P(
      required = true,
      value = "A string used to search the summary field.  Pass an empty string to ignore summary matches. "
    ) String matchFromSummary,
    @P(
      required = true,
      value = "If true, inferred key points will be excluded from the results.  If false (the default), inferred key points will be included."
    ) Boolean excludeInferred
  ) {
    var msg = message();
    var documentId = msg == null ? -1 : msg.getDocumentId();
    try {
      var hits =
        this.keyPointRepository.searchForKeyPoints(
            matchFromPolicyBasis,
            matchFromTags,
            matchFromSummary,
            excludeInferred,
            documentId
          );
      if (hits == null || hits.isEmpty()) {
        return new KeyPoint[0];
      }
      var keyPoints = new KeyPoint[hits.size()];
      for (int i = 0; i < hits.size(); i++) {
        keyPoints[i] = hits.get(i);
      }
      log.info(
        "Found {} key points matching search criteria: {}, {}, {}",
        hits.size(),
        matchFromPolicyBasis,
        matchFromTags,
        matchFromSummary
      );
      return keyPoints;
    } catch (SQLException e) {
      log.error(
        "Unexpected SQL failure searching for key points.  Details: " +
        matchFromPolicyBasis +
        ", " +
        matchFromTags +
        ", " +
        matchFromSummary,
        e
      );
      DocumentProperty.addManualReview(
        s -> this.keyPointRepository.db(),
        msg.getDocumentId(),
        e,
        "AddKeyPointsTool",
        matchFromPolicyBasis,
        matchFromTags,
        matchFromSummary,
        excludeInferred
      );
      return new KeyPoint[0];
    }
  }

  @Tool(
    name = "lookupPolicySummary",
    value = "Uses vector search to retrieve a summary of school district policy or search topic associated with the provided query.  The query can be a policy name, or a specific topic or search string.  " +
    "The summary is returned as a string.\n  When analyzing a situation for legal compliance, you should rely on **tool-based search results** when available.\n" +
    " ** Returns **\n" +
    "  - A string containing the summary of the policy associated with the provided query.  If no policy is found, an empty string is returned.\n" +
    "  - If the operation failed, the word 'ERROR' and a description of the failure, e.g. 'ERROR: No document context available.'"
  )
  public String lookupPolicySummary(
    @P(
      required = true,
      value = "The search query.  This can be a policy name (eg 'Title IX' or 'Policy 506'), a specific topic, or a genralized search string."
    ) String query,
    @P(
      required = false,
      value = "Used to filter the scope of searched policies.  Supported values are:\n" +
      "  - school_policy: Search only school district policies.\n" +
      "  - state_policy: Search only state policies or law.\n" +
      "  - federal_policy: Search only federal policies or law.\n" +
      "  - Empty String: Search all policies.\n"
    ) String scope
  ) {
    AzurePolicySearchClient.ScopeType policyType = null;
    if (scope != null) {
      switch (scope) {
        case "school_policy":
          policyType = AzurePolicySearchClient.ScopeType.SchoolBoard;
          break;
        case "state_policy":
          policyType = AzurePolicySearchClient.ScopeType.State;
          break;
        case "federal_policy":
          policyType = AzurePolicySearchClient.ScopeType.Federal;
          break;
        default:
          policyType = AzurePolicySearchClient.ScopeType.All;
          break;
      }
    } else {
      policyType = AzurePolicySearchClient.ScopeType.All;
    }
    try {
      return this.policyLookup.summarizePolicy(query, policyType);
    } catch (Exception e) {
      log.error(
        "Unexpected failure searching for policy summary.  Details: " + query,
        e
      );
      return "ERROR: " + e.getMessage();
    }
  }

  /**
   * Uses vector search to retrieve a summary of a document.
   *
   * The summary is returned as a string. The **scope** property can be used to ensure
   * results are relevant to your request.
   *
   * **Returns**
   * - A string containing the summary of the document associated with the provided query.
   *   If no document is found, an empty string is returned.
   * - If the operation failed, the word 'ERROR' and a description of the failure, e.g.
   *   'ERROR: No document context available.'
   *
   * @param query The search query. This can be a policy name (e.g., 'Title IX' or 'Policy 506'),
   *              a specific topic, or a generalized search string. This parameter is required.
   * @param scope Used to filter the scope of searched documents. Supported values are:
   *              - "email": Search only email records.
   *              - "attachment": Search only attachments.
   *              - Empty String: Search all documents.
   *              This parameter is required.
   * @return A string containing the summary of the document or an error message if the operation fails.
   */
  @Tool(
    name = "lookupDocumentSummary",
    value = "Uses vector search to retrieve a summary of a document.  " +
    "The summary is returned as a string.\n  The **scope** property can be used to ensure results are relevant to your request.\n" +
    " ** Returns **\n" +
    "  - A string containing the summary of the document associated with the provided query.  If no document is found, an empty string is returned.\n" +
    "  - If the operation failed, the word 'ERROR' and a description of the failure, e.g. 'ERROR: No document context available.'"
  )
  public String lookupDocumentSummary(
    @P(
      required = true,
      value = "The search query.  This can be a policy name (eg 'Title IX' or 'Policy 506'), a specific topic, or a genralized search string."
    ) String query,
    @P(
      required = false,
      value = "Used to filter the scope of searched documents.  Supported values are:\n" +
      "  - email: Search only email records.\n" +
      "  - attachment: Search only attachments.\n" +
      "  - Empty String: Search all documents.\n"
    ) String scope
  ) {
    AzureSearchClient.ScopeType policyType = null;
    if (scope != null) {
      switch (scope) {
        case "email":
          policyType = AzureSearchClient.ScopeType.Email;
          break;
        case "attachment":
          policyType = AzureSearchClient.ScopeType.Attachment;
          break;
        default:
          policyType = AzureSearchClient.ScopeType.All;
          break;
      }
    } else {
      policyType = AzureSearchClient.ScopeType.All;
    }
    try {
      return this.documentLookup.summarizeDocument(query, policyType);
    } catch (Exception e) {
      log.error(
        "Unexpected failure searching for nessage summary.  Details: " + query,
        e
      );
      return "ERROR: " + e.getMessage();
    }
  }
}
