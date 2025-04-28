package com.obapps.schoolchatbot.chat.assistants.tools;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.chat.assistants.KeyPointAnalysis;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.core.assistants.services.*;
import com.obapps.schoolchatbot.core.assistants.tools.MessageTool;
import com.obapps.schoolchatbot.core.models.*;
import com.obapps.schoolchatbot.core.repositories.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;

/**
 * The AddKeyPointsTool class provides tools for searching and summarizing key points,
 * policies, and documents. It includes methods for searching related key points,
 * retrieving policy summaries, summarizing documents, and fetching document details.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Search for related key points based on policy basis, tags, and summary.</li>
 *   <li>Retrieve summaries of policies using vector search.</li>
 *   <li>Summarize documents with optional scope filtering (e.g., emails, attachments).</li>
 *   <li>Fetch full details of a document by its ID.</li>
 * </ul>
 *
 * <p>Usage:</p>
 * <ul>
 *   <li>Use {@link #searchForRelatedKeyPoints(String, String, String, Boolean)} to find key points matching specific criteria.</li>
 *   <li>Use {@link #lookupPolicySummary(String, String)} to retrieve a summary of a policy or topic.</li>
 *   <li>Use {@link #lookupDocumentSummary(String, String)} to summarize a document based on a query.</li>
 *   <li>Use {@link #getDocumentDetails(Integer)} to retrieve detailed metadata for a specific document.</li>
 * </ul>
 *
 * <p>Dependencies:</p>
 * <ul>
 *   <li>{@link HistoricKeyPointRepository} for key point storage and retrieval.</li>
 *   <li>{@link JustInTimePolicyLookup} for policy-related operations.</li>
 *   <li>{@link JustInTimeDocumentLookup} for document-related operations.</li>
 * </ul>
 *
 * <p>Exceptions:</p>
 * <ul>
 *   <li>Handles {@link SQLException} for database-related operations.</li>
 *   <li>Logs unexpected failures and provides error messages for failed operations.</li>
 * </ul>
 *
 * <p>Annotations:</p>
 * <ul>
 *   <li>{@link Tool} annotations provide metadata for each method, including name, description, and return details.</li>
 *   <li>{@link P} annotations describe parameters for each method.</li>
 * </ul>
 */
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

  /**
   * Searches for key points that are related to the provided summary, policy basis, and tags.
   * The search is performed using a fuzzy match on the summary and policy basis, and an exact match on the tags.
   * Inferred key points can be excluded from the search results by passing true to excludeInferred.
   *
   * @param matchFromPolicyBasis A comma-delimited list of policies or laws to search for, or an empty string if policy basis should not be considered.
   *                             Returned key points will be associated with all of the referenced policies.
   * @param matchFromTags        If provided, a comma-delimited list of tags to search for, or an empty string if tags should not be considered.
   *                             Returned key points will contain all of the referenced tags.
   * @param matchFromSummary     A string used to search the summary field. Pass an empty string to ignore summary matches.
   * @param excludeInferred      If true, inferred key points will be excluded from the results. If false (the default), inferred key points will be included.
   * @return                     An array of KeyPoint objects that match the search criteria. If no key points are found, an empty array is returned.
   * @throws SQLException        If an unexpected SQL error occurs during the search.
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

  @Tool(
    name = "getDocumentDetails",
    value = "Retrieves full details on a specific document by id."
  )
  public DocumentWithMetadata getDocumentDetails(
    @P(
      required = true,
      value = "The ID of the document to retrieve details for."
    ) Integer documentId
  ) {
    try {
      var data = Db.getInstance();
      return DocumentWithMetadata.fromDb(data, documentId);
    } catch (SQLException e) {
      log.error(
        "Unexpected SQL failure retrieving document details.  Details: " +
        documentId,
        e
      );
      return null;
    }
  }
}
