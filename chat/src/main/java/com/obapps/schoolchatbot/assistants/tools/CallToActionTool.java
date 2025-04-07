package com.obapps.schoolchatbot.assistants.tools;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.Db;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class CallToActionTool extends MessageTool {

  private final Db _innerDb;
  private final JustInTimePolicyLookup policyLookup;

  public CallToActionTool(DocumentChatAssistant content) {
    this(content, null, null);
  }

  public CallToActionTool(
    DocumentChatAssistant content,
    Db db,
    JustInTimePolicyLookup policyLookup
  ) {
    super(content);
    this._innerDb = db;
    this.policyLookup = policyLookup == null
      ? new JustInTimePolicyLookup()
      : policyLookup;
  }

  private Db db() throws SQLException {
    if (_innerDb == null) {
      return Db.getInstance();
    }
    return _innerDb;
  }

  @Tool(
    name = "addCallToActionToDatabase",
    value = "Adds a newly identified call to action to our database."
  )
  public void addCallToActionToDatabase(
    @P(
      required = true,
      value = "The action to be taken, such as \"Provide this record\", \"Explain why this action was taken\", or \"What steps will be taken to keep my child safe\"."
    ) String action,
    @P(
      required = false,
      value = "If the call to action is relevant to a legally mandated obligation, such as a MN Statute 13 request for an educational record, provide the statute number or name here." +
      "  If the call to action is not legally mandated, this value should be a null or empty string.  Statute can be provided either via an Internal Policy Id, or the locality (eg \"Federal\", " +
      "\"School\", \"State\") and the name or number of the policy or statute; for example, \"MN 13\", or \"Federal FERPA\""
    ) String relevantPolicy,
    @P(
      required = true,
      value = "If a mandated response timeframe can be determined, provide the date the response must be completed by to remain complaint with that obligation.  If no timeframe is known, then pass null or an empty string."
    ) String dueDate,
    @P(
      required = true,
      value = "A rating from 0-100 regarding the degree to which this email in specific represents compliance with a district's legal and moral obligations in regards to this call to action."
    ) Double compliance_rating_current,
    @P(
      required = true,
      value = "A list of reasons why the compliance rating was assigned.  This should be a comma separated list of reasons, such as \"No response provided\", \"No explanation provided\"." +
      "  If no reasons are known, then pass null or an empty string." +
      "  If the compliance rating is not relevant to this email, then pass null or an empty string."
    ) String compliance_rating_current_reasons
  ) {
    var msg = message();
    try {
      // First, email property record
      if (msg.getEmailId() == null) {
        log.warn(
          "Unable to record CTA - no email message ID available.  Details: " +
          action
        );
      }
      var policyId = PolicyTypeMap.Instance.lookupPolicyId(relevantPolicy);

      // Parse the date string into a LocalDate
      // Define a formatter matching the date format
      DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
      var parsedDueDate = dueDate == null || dueDate.isEmpty()
        ? null
        : LocalDate.parse(dueDate, formatter);

      //var emailPropertyId =
      // Save Data
      var builder = CallToAction.builder()
        .documentId(msg.getDocumentId())
        .propertyType(4)
        .propertyValue(action)
        .createdOn(msg.getDocumentSendDate())
        .openedDate(msg.getDocumentSendDate().toLocalDate())
        .compliancyCloseDate(parsedDueDate)
        .completionPercentage(0.0)
        .complianceMessage(compliance_rating_current)
        .complianceMessageReasons(compliance_rating_current_reasons);
      if (policyId > 0) {
        builder.policyId(policyId);
      }
      builder.build().addToDb(db());
    } catch (SQLException ex) {
      Colors.Set(c -> c.RED);
      log.error(
        "Unexpected SQL failure recording key point.  Details: " + action,
        ex
      );
      try {
        DocumentProperty.addManualReview(
          db(),
          msg.getDocumentId(),
          ex,
          "addCallToActionToDatabase",
          action,
          relevantPolicy,
          dueDate,
          compliance_rating_current,
          compliance_rating_current_reasons
        );
      } catch (SQLException e2) {
        // Supresss - we're already in an error state
      }
      Colors.Reset();
      return;
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    addDetectedPoint();
    log.info("Added new CTA to database:\n\t" + action);
    Colors.Reset();
  }

  @Tool(
    name = "addCtaResponseToDatabase",
    value = "Adds responsive action in reagards to a CTA that was opened on an earlier email to the database."
  )
  public void addCtaResponseToDatabase(
    @P(
      required = true,
      value = "The action id identifying the CTA"
    ) String action_id,
    @P(
      required = true,
      value = "The responsive action taken."
    ) String responsive_action,
    @P(
      required = true,
      value = "The percentage to which this CTA can be consider fully resolved."
    ) Double completion_percentage,
    @P(
      required = true,
      value = "A rating from 0-100 regarding the degree to which this email in specific represents compliance with a district's legal and moral obligations in regards to this call to action."
    ) Double compliance_response_score,
    @P(
      required = true,
      value = "A list of reasons why the compliance rating was assigned.  This should be a comma separated list of reasons, such as \"No response provided\", \"No explanation provided\"." +
      "  If no reasons are known, then pass null or an empty string."
    ) String compliance_response_reasons,
    @P(
      required = true,
      value = "A rating from 0-100 regarding the degree to which the District is in compliance with the CTA as a whole."
    ) Double compliance_rating_aggregate,
    @P(
      required = true,
      value = "A list of reasons why the aggregate compliance rating was assigned.  This should be a comma separated list of reasons, such as \"No response provided\", \"No explanation provided\"." +
      "  If no reasons are known, then pass null or an empty string."
    ) String compliance_rating_aggregate_reasons
  ) {
    var msg = message();
    try {
      // First, email property record
      if (msg.getDocumentId() < 1) {
        log.warn(
          "Unable to record CTA - no email message ID available.  Details: " +
          responsive_action
        );
      }
      CallToActionResponse.builder()
        .documentId(msg.getDocumentId())
        .actionPropertyId(UUID.fromString(action_id))
        .propertyType(5)
        .propertyValue(responsive_action)
        .createdOn(msg.getDocumentSendDate())
        .completionPercentage(completion_percentage)
        .responseTimestamp(msg.getDocumentSendDate())
        .complianceMessage(compliance_response_score)
        .complianceMessageReasons(compliance_response_reasons)
        .complianceAggregate(compliance_rating_aggregate)
        .complianceAggregateReasons(compliance_rating_aggregate_reasons)
        .build()
        .addToDb(db());
      addDetectedPoint();
    } catch (SQLException ex) {
      Colors.Set(c -> c.RED);
      log.error(
        "Unexpected SQL failure recording key point.  Details: " +
        responsive_action,
        ex
      );
      try {
        DocumentProperty.addManualReview(
          db(),
          msg.getDocumentId(),
          ex,
          "addCtaResponse",
          action_id,
          responsive_action,
          completion_percentage,
          compliance_response_score,
          compliance_response_reasons,
          compliance_rating_aggregate,
          compliance_rating_aggregate_reasons
        );
      } catch (SQLException e2) {
        // Supresss - we're already in an error state
      }

      Colors.Reset();
      return;
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    log.info("Added CTA Response to database:\n\t" + responsive_action);
    Colors.Reset();
  }

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
        .addToDb(db());
    } catch (SQLException e) {
      log.error(
        "Unexpected SQL failure adding processing note.  Details: " + note,
        e
      );
    }
  }
}
