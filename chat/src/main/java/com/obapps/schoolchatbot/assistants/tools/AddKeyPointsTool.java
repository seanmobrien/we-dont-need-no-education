package com.obapps.schoolchatbot.assistants.tools;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.data.repositories.HistoricKeyPointRepository;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.util.Objects;

public class AddKeyPointsTool extends MessageTool {

  private final HistoricKeyPointRepository keyPointRepository;
  private final JustInTimePolicyLookup policyLookup;

  /**
   * Constructor for the AddKeyPointsTool class.
   * Initializes the tool with the provided message metadata and sets up a logger.
   *
   * @param messageMetadata The message metadata associated with this tool.
   */
  public AddKeyPointsTool(DocumentChatAssistant content) {
    this(content, null, null);
  }

  /**
   * Constructor for the AddKeyPointsTool class.
   * Initializes the tool with the provided message metadata and sets up a logger.
   *
   * @param messageMetadata The message metadata associated with this tool.
   */
  public AddKeyPointsTool(
    DocumentChatAssistant content,
    HistoricKeyPointRepository keyPointRepository,
    JustInTimePolicyLookup policyLookup
  ) {
    super(content);
    this.keyPointRepository = keyPointRepository == null
      ? new HistoricKeyPointRepository()
      : keyPointRepository;
    this.policyLookup = policyLookup == null
      ? new JustInTimePolicyLookup()
      : policyLookup;
  }

  @Tool(
    name = "addProcessingNote",
    value = "Adds a note to the processing history of the email.  This is useful for adding notes about the analysis process, or for adding information that may be useful for future analysis.\n"
  )
  public void addProcessingNote(String note) {
    var msg = message();
    try {
      if (msg.getDocumentId() == null) {
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
    } catch (SQLException e) {
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
      value = "A summary of the key point.  It should include enough information to be able to identify the concern and understand the basis for the severity and compliance ratings during subsequent analysis stages."
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
      required = false,
      value = "A comma-delimited list of tags that can be used to categorize this point.  For example, 'bullying, harassment, discrimination'."
    ) String tags
  ) {
    var msg = message();
    KeyPoint keyPoint = null;
    try {
      // First, email property record
      if (msg.getDocumentId() == null) {
        log.warn(
          "Unable store Key Point - no Document ID available.  Details: " +
          keyPointSummary
        );
        return "ERROR: No document context available.";
      }
      keyPoint = KeyPoint.builder()
        .propertyValue(keyPointSummary)
        .documentId(msg.getDocumentId())
        .relevance(relevancePercentage)
        .compliance(compliancePercentage)
        .severity(severity)
        .tags(tags)
        .policyBasis(policyBasis)
        .build();
      keyPoint.addToDb(this.keyPointRepository.db());
    } catch (SQLException ex) {
      log.error(
        "Unexpected SQL failure recording key point.  Details: " +
        keyPointSummary,
        ex
      );
      try {
        DocumentProperty.addManualReview(
          this.keyPointRepository.db(),
          msg.getDocumentId(),
          ex,
          "AddKeyPointsTool",
          keyPointSummary,
          relevancePercentage,
          compliancePercentage,
          severity,
          tags,
          policyBasis
        );
      } catch (SQLException e2) {
        // Supresss - we're already in an error state
      }
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
      message().getDocumentId()
    );
    Colors.Reset();
    return keyPoint.getPropertyId().toString();
  }

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
      required = false,
      value = "If provided, a comma-delimited list of policies or laws to search for.  Returned key points will be associated with all of the referenced policies."
    ) String matchFromPolicyBasis,
    @P(
      required = false,
      value = "If provided, a comma-delimited list of tags to search for.  Returned key points will contain all of the referenced tags."
    ) String matchFromTags,
    @P(
      required = false,
      value = "If provided, a string used to search the summary field."
    ) String matchFromSummary,
    @P(
      required = false,
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
      try {
        DocumentProperty.addManualReview(
          this.keyPointRepository.db(),
          msg.getDocumentId(),
          e,
          "AddKeyPointsTool",
          matchFromPolicyBasis,
          matchFromTags,
          matchFromSummary,
          excludeInferred
        );
      } catch (SQLException e2) {
        // Supresss - we're already in an error state
      }
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
      required = true,
      value = "Used to filter the scope of searched policies.  Supported values are:\n" +
      "  - school_policy: Search only school district policies.\n" +
      "  - state_policy: Search only state policies or law.\n" +
      "  - federal_policy: Search only federal policies or law.\n" +
      "  - Empty String: Search all policies.\n"
    ) String scope
  ) {
    JustInTimePolicyLookup.PolicyType policyType = null;
    if (scope != null) {
      switch (scope) {
        case "school_policy":
          policyType = JustInTimePolicyLookup.PolicyType.SchoolBoard;
          break;
        case "state_policy":
          policyType = JustInTimePolicyLookup.PolicyType.State;
          break;
        case "federal_policy":
          policyType = JustInTimePolicyLookup.PolicyType.Federel;
          break;
        default:
          policyType = JustInTimePolicyLookup.PolicyType.All;
          break;
      }
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
}
