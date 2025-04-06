package com.obapps.schoolchatbot.assistants.tools;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.data.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class CallToActionTool extends MessageTool {

  public CallToActionTool(DocumentChatAssistant content) {
    super(content);
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
      builder.build().addToDb();
    } catch (SQLException ex) {
      Colors.Set(c -> c.RED);
      log.error(
        "Unexpected SQL failure recording key point.  Details: " + action,
        ex
      );
      DocumentProperty.addManualReview(
        msg.getDocumentId(),
        ex,
        "addCallToActionToDatabase",
        action,
        relevantPolicy,
        dueDate,
        compliance_rating_current,
        compliance_rating_current_reasons
      );
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
        .addToDb();
      addDetectedPoint();
    } catch (SQLException ex) {
      Colors.Set(c -> c.RED);
      log.error(
        "Unexpected SQL failure recording key point.  Details: " +
        responsive_action,
        ex
      );
      DocumentProperty.addManualReview(
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
      Colors.Reset();
      return;
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    log.info("Added CTA Response to database:\n\t" + responsive_action);
    Colors.Reset();
  }

  @Tool(
    name = "lookupPolicyInternalId",
    value = "Looks up the internal ID of a policy given a search string, such as the policy name or chapter number."
  )
  public Integer lookupPolicyInternalId(String searchFor) {
    return PolicyTypeMap.Instance.lookupPolicyId(searchFor);
  }
}
