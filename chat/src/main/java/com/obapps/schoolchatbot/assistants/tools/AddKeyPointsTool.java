package com.obapps.schoolchatbot.assistants.tools;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.Db;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.util.Objects;

public class AddKeyPointsTool extends MessageTool {

  /**
   * Constructor for the AddKeyPointsTool class.
   * Initializes the tool with the provided message metadata and sets up a logger.
   *
   * @param messageMetadata The message metadata associated with this tool.
   */
  public AddKeyPointsTool(DocumentChatAssistant content) {
    super(content);
  }

  @Tool(
    name = "addKeyPointToDatabase",
    value = "Adds a key point identified from the email to our database for further analysis.  " +
    "If the Internal Policy ID of the policy or law the key point relates to is known, pass it in.  " +
    "Otherwise ensure the key point includes information that can be used to identify the policy in question.  " +
    "  The percentage to which the policy relates to the email content is passed as relevancePercentage." +
    "  The degree to which the school's actions and words demonstrate compliance with policy is passed as compliancePercentage."
  )
  public void addKeyPointToDatabase(
    @P(
      required = true,
      value = "A summary of the key point.  It should include enough information to be clear about how the policy is spoken to in the current email.  If the Internal Policy Id " +
      "of the policy is not known the summary should include enough information to identify which policy, law, or other school obligation the point relates to.  If the Internal Policy Id is known this information can be omitted."
    ) String keyPointSummary,
    @P(
      required = true,
      value = "The percentage to which the point is relevant and/or warrants further analysis and investigation given the information found in the email."
    ) Double relevancePercentage,
    @P(
      required = true,
      value = "The percentage to which the this point demonstrates the school is in compliance with the associated obligation, with 0 representing total non-compliance."
    ) Double compliancePercentage,
    @P(
      required = true,
      value = "A rating from 1-10 of the severity of the point, with 1 being a minor issue and 10 being a major issue."
    ) Integer severity,
    @P(
      required = false,
      value = "Whether the point is inferred or explicitly stated.  If true, the point is inferred."
    ) Boolean inferred,
    @P(
      required = false,
      value = "If applicable, a comma-delimited list of any laws or school board policies that provide a basis for this point.  For example, 'Title IX, MN Statute 13.3, Board Policy 503'"
    ) String policyBasis,
    @P(
      required = false,
      value = "A comma-delimited list of tags that can be used to categorize this point.  For example, 'bullying, harassment, discrimination'."
    ) String tags
  ) {
    var msg = message();
    try {
      // First, email property record
      if (msg.getDocumentId() == null) {
        log.warn(
          "Unable store Key Point - no Document ID available.  Details: " +
          keyPointSummary
        );
        return;
      }

      var kpBuilder = KeyPoint.builder()
        .propertyType(9)
        .propertyValue(keyPointSummary)
        .documentId(msg.getDocumentId())
        .relevance(relevancePercentage)
        .compliance(compliancePercentage)
        .severity(severity)
        .tags(tags)
        .policyBasis(policyBasis);
      kpBuilder.build().addToDb();
    } catch (SQLException ex) {
      log.error(
        "Unexpected SQL failure recording key point.  Details: " +
        keyPointSummary,
        ex
      );
      DocumentProperty.addManualReview(
        message().getDocumentId(),
        ex,
        "AddKeyPointsTool",
        keyPointSummary,
        relevancePercentage,
        compliancePercentage,
        severity,
        tags,
        policyBasis
      );

      return;
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    addDetectedPoint();
    log.info(
      "Added Key Point to database:\n\tRelevance: " +
      relevancePercentage +
      "\n\tCompliance Percentage: " +
      compliancePercentage +
      "\n\tpPolicy Basis: " +
      Objects.requireNonNullElse(policyBasis, "<none>") +
      "\n\tTags: " +
      Objects.requireNonNullElse(tags, "<none>") +
      "\n\tKey Point:" +
      keyPointSummary
    );
    Colors.Reset();
  }

  @Tool(
    name = "lookupInternalId",
    value = "Looks up the internal ID of a policy given the policy number, name, or identifier of the file within a vector store."
  )
  Integer lookupInternalId(
    @P(
      required = false,
      value = "The policy number or chapter of the statute."
    ) String policyNumber,
    @P(
      required = false,
      value = "The name of the policy or statute."
    ) String policyName,
    @P(
      required = false,
      value = "The ID of the file within a vector store; eg, assistant-7CJsuiaeoSn2vLQUbDeq4n"
    ) String fileId
  ) {
    try {
      if (fileId != null) {
        var res = Db.getInstance()
          .selectSingleValue(
            "SELECT policy_id FROM policies_statutes WHERE indexed_file_id=?",
            fileId
          );
        if (res != null) {
          return Integer.parseInt(res.toString());
        }
      }
      var res2 = PolicyTypeMap.Instance.lookupPolicyId(policyName);
      if (res2 != 0) return res2;
    } catch (SQLException ex) {
      log.error("Unexpected SQL failure looking up internal ID", ex);
    }
    return -1;
  }
}
