package com.obapps.schoolchatbot.chat.assistants.tools;

import com.obapps.core.exceptions.ErrorUtil;
import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.chat.assistants.CallToActionAnalysis;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.core.assistants.services.*;
import com.obapps.schoolchatbot.core.assistants.tools.MessageTool;
import com.obapps.schoolchatbot.core.models.*;
import com.obapps.schoolchatbot.core.repositories.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.UUID;

public class CallToActionTool extends MessageTool<AugmentedContentList> {

  private final JustInTimePolicyLookup policyLookup;
  private final JustInTimeDocumentLookup documentLookup;
  private HistoricKeyPointRepository keyPointRepository;

  public CallToActionTool(CallToActionAnalysis content) {
    this(content, null, null, null);
  }

  public CallToActionTool(
    CallToActionAnalysis content,
    JustInTimePolicyLookup policyLookup,
    JustInTimeDocumentLookup documentLookup,
    HistoricKeyPointRepository keyPointRepository
  ) {
    super(content);
    this.policyLookup = policyLookup == null
      ? new JustInTimePolicyLookup(content)
      : policyLookup;
    this.documentLookup = documentLookup == null
      ? new JustInTimeDocumentLookup(content)
      : documentLookup;
    this.keyPointRepository = keyPointRepository == null
      ? new HistoricKeyPointRepository()
      : keyPointRepository;
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

  /**
   * Uses vector search to retrieve a summary of a school district policy or a search topic
   * associated with the provided query. The query can be a policy name, a specific topic,
   * or a generalized search string.
   *
   * @param query The search query. This can be a policy name (e.g., "Title IX" or "Policy 506"),
   *              a specific topic, or a generalized search string. This parameter is required.
   * @param scope Used to filter the scope of searched policies. Supported values are:
   *              - "school_policy": Search only school district policies.
   *              - "state_policy": Search only state policies or law.
   *              - "federal_policy": Search only federal policies or law.
   *              - Empty String: Search all policies.
   *              This parameter is required.
   * @return A string containing the summary of the policy associated with the provided query.
   *         If no policy is found, an empty string is returned. If the operation fails,
   *         the method returns "ERROR" followed by a description of the failure
   *         (e.g., "ERROR: No document context available.").
   */
  @Tool(
    name = "lookupPolicySummary",
    value = "Uses vector search to retrieve a summary of school district policy or search topic associated with the provided query.  The query can be a policy name, or a specific topic or search string.  " +
    "The summary is returned as a string.\n  The **scope** property can be used to ensure results are relevant to your request.\n" +
    " ** Returns **\n" +
    "  - A string containing the summary of the policy associated with the provided query.  If no policy is found, an empty string is returned.\n" +
    "  - If the operation failed, the word 'ERROR' and a description of the failure, e.g. 'ERROR: No document context available.'"
  )
  public String lookupPolicySummary(
    @P(
      required = true,
      value = "The search query.  This can be a policy name (eg 'Title IX' or 'Policy 506'), a specific topic, or a genralized search string.    ***Quotation marks are not allowed as input*** - use single-dash (e.g ') instead."
    ) String query,
    @P(
      required = true,
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
      ErrorUtil.handleException(
        log,
        e,
        "Unexpected failure searching for policy summary.  Query: %s\nDetails: " +
        query,
        e
      );
      var msg = message();
      Integer documentId;
      if (msg != null) {
        documentId = msg.getDocumentId();
        if (documentId == null) {
          log.warn(
            "Unable to associate processing note - no Document ID available.  Query: " +
            query
          );
          documentId = -1;
        }
      } else {
        log.warn(
          "Unable to associate processing note - no message context available.  Query: " +
          query
        );
        documentId = -1;
      }
      DocumentProperty.addManualReview(
        documentId,
        e,
        "summarizePolicy",
        query,
        policyType
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
   *              - "cta": Search only calls to action.
   *              - "key_point": Search only key points.
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
      value = "The search query.  This can be any relevant search term.  ***Quotation marks are not allowed as input*** - use single-dash (e.g ') instead."
    ) String query,
    @P(
      required = true,
      value = "Used to filter the scope of searched documents.  Supported values are:\n" +
      "  - email: Search only email records.\n" +
      "  - attachment: Search only attachments.\n" +
      "  - cta: Search only calls to action.\n" +
      "  - key_point: Search only key points.\n" +
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
        case "cta":
          policyType = AzureSearchClient.ScopeType.Cta;
          break;
        case "key_point":
          policyType = AzureSearchClient.ScopeType.KeyPoint;
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
      ErrorUtil.handleException(
        log,
        e,
        "Unexpected failure searching for document summary.  Query: %s\nDetails: " +
        query,
        e
      );
      var msg = message();
      Integer documentId;
      if (msg != null) {
        documentId = msg.getDocumentId();
        if (documentId == null) {
          log.warn(
            "Unable to associate processing note - no Document ID available.  Query: " +
            query
          );
          documentId = -1;
        }
      } else {
        log.warn(
          "Unable to associate processing note - no message context available.  Query: " +
          query
        );
        documentId = -1;
      }
      DocumentProperty.addManualReview(
        documentId,
        e,
        "summarizeDocument",
        query,
        policyType
      );
      return "ERROR: " + e.getMessage();
    }
  }

  @Tool(
    name = "getDocumentDetails",
    value = "Retrieves full details on a specific document by id."
  )
  public DocumentWithMetadata[] getDocumentDetails(
    @P(
      required = true,
      value = "A comma-delimited list of document ID's details should be retrieved for."
    ) String documentIds
  ) {
    ArrayList<DocumentWithMetadata> results = new ArrayList<>();
    if (documentIds == null || documentIds.isEmpty()) {
      return null;
    }

    try (var data = Db.createUnitOfWork()) {
      for (String dId : documentIds.split(",")) {
        var normalDocId = dId.trim().replaceAll("\"", "");
        try {
          try {
            var documentId = Integer.parseInt(normalDocId);
            var doc = DocumentWithMetadata.fromDb(data, documentId);
            if (doc != null) {
              results.add(doc);
            } else {
              log.warn(
                "Unable to retrieve document details for ID: {}.  Document not found.",
                normalDocId
              );
            }
          } catch (NumberFormatException ignore) {
            // Not a number, is it a guid?
            var emailOrPropertyId = UUID.fromString(normalDocId);
            var doc = DocumentWithMetadata.fromDb(data, emailOrPropertyId);
            if (doc != null) {
              results.add(doc);
            } else {
              log.warn(
                "Unable to retrieve document details for ID: {}.  Document not found.",
                normalDocId
              );
            }
          }
        } catch (Exception e) {
          log.error(
            "Unexpected SQL failure retrieving document details.  Details: " +
            dId,
            e
          );
        }
      }
    } catch (SQLException e) {
      log.error("Unexpected error connecting to database.", e);
    }
    return results.toArray(new DocumentWithMetadata[0]);
  }

  @Tool(
    name = "addProcessingNote",
    value = "Adds a note to the processing history of the email.  This is useful for adding notes about the analysis process, or for adding information that may be useful for future analysis.\n"
  )
  public void addProcessingNote(
    @P(
      required = true,
      value = "The note to be added to the processing history of the email.  This is useful for adding notes about the analysis process, or for adding information that may be useful for future analysis.  ***Quotation marks are not allowed as input*** - use single-dash (e.g ') instead."
    ) String note
  ) {
    Integer documentId;
    var msg = message();
    try {
      if (msg == null || msg.getDocumentId() == null) {
        documentId = -1;
      } else {
        documentId = msg.getDocumentId();
      }
      try (var db = Db.createUnitOfWork()) {
        var n = DocumentProperty.builder()
          .documentId(documentId)
          .propertyValue(note)
          .propertyType(DocumentPropertyType.KnownValues.ProcessingNote)
          .build()
          .addToDb(db.createTransaction());
        if (documentId == -1) {
          log.warn(
            "Processing note [{}] was added to the generalized fallback document because there is no current context available.",
            n.getPropertyId()
          );
        }
        addNote();
      }
    } catch (SQLException e) {
      log.error(
        "Unexpected SQL failure adding processing note.  Details: " + note,
        e
      );
    }
  }
}
