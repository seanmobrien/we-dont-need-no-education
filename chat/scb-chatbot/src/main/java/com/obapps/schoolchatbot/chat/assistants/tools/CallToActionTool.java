package com.obapps.schoolchatbot.chat.assistants.tools;

import com.obapps.core.util.Colors;
import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.chat.assistants.CallToActionAnalysis;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.core.assistants.services.*;
import com.obapps.schoolchatbot.core.assistants.tools.MessageTool;
import com.obapps.schoolchatbot.core.models.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

public class CallToActionTool extends MessageTool<AugmentedContentList> {

  private final Db _innerDb;
  private final JustInTimePolicyLookup policyLookup;
  private final JustInTimeDocumentLookup documentLookup;

  public CallToActionTool(CallToActionAnalysis content) {
    this(content, null, null, null);
  }

  public CallToActionTool(
    CallToActionAnalysis content,
    Db db,
    JustInTimePolicyLookup policyLookup,
    JustInTimeDocumentLookup documentLookup
  ) {
    super(content);
    this._innerDb = db;
    this.policyLookup = policyLookup == null
      ? new JustInTimePolicyLookup()
      : policyLookup;
    this.documentLookup = documentLookup == null
      ? new JustInTimeDocumentLookup()
      : documentLookup;
  }

  private Db db() throws SQLException {
    if (_innerDb == null) {
      return Db.getInstance();
    }
    return _innerDb;
  }

  /**
   * Adds a newly identified and analyzed call to action from the target document to the database.
   *
   * @param action The action to be taken, such as "Provide this record", "Explain why this action was taken",
   *               or "What steps will be taken to keep my child safe".
   * @param inferred A boolean indicating whether this CTA is inferred from the document, or explicitly stated.
   *                 If the point is explicitly stated, this should be false. If the CTA is inferred, this should be true.
   * @param dueDate The date by which responsive action is expected to be taken, in the format "yyyy-MM-dd".
   * @param dueDateEnforceable A boolean indicating whether the due date is enforceable, e.g., has a demonstrable basis
   *                           in law or school board policy.
   * @param reasonableRating A rating from 1-10 as to how reasonable the request for action is. Requests for actions
   *                         the district is obligated to perform, such as a valid records request, are rated at 10.
   *                         Requests that the district is not legally able to perform, such as violating FERPA privacy
   *                         protections, are rated at 1.
   * @param compliance_rating_current A rating from 0-100 regarding the degree to which this email specifically represents
   *                                  compliance with a district's legal and moral obligations in regard to this call to action.
   * @param compliance_rating_current_reasons A comma-separated list of reasons why the compliance rating was assigned,
   *                                          such as "No response provided", "No explanation provided". If no reasons are
   *                                          known, pass null or an empty string. If the compliance rating is not relevant
   *                                          to this email, pass null or an empty string.
   * @param policyBasis A comma-delimited list of any laws or school board policies that provide a basis for this point,
   *                    e.g., "Title IX, MN Statute 13.3, Board Policy 503".
   * @param tags A comma-delimited list of tags that can be used to categorize this point, e.g., "bullying, harassment, discrimination".
   *             This parameter is optional and can be null.
   * @throws Throwable If an unexpected error occurs during the process of adding the call to action to the database.
   */
  @Tool(
    name = "addCallToActionToDatabase",
    value = "Adds a newly identified and analyzed call to action from the target document to our database."
  )
  public void addCallToActionToDatabase(
    @P(
      required = true,
      value = "The action to be taken, such as \"Provide this record\", \"Explain why this action was taken\", or \"What steps will be taken to keep my child safe\"."
    ) String action,
    @P(
      required = true,
      value = "A boolean indicating whether this CTA is inferred from the document, or explicitly stated.  If the point is explicitly stated, then this should be false.  If the CTA is inferred, then this should be true."
    ) Boolean inferred,
    @P(
      required = true,
      value = "The date by which responsive action is expected to be taken."
    ) LocalDate dueDate,
    @P(
      required = true,
      value = "A boolean indicating whether the due date is enforceable - eg has demonstratible basis in law or school board policy."
    ) Boolean dueDateEnforceable,
    @P(
      required = true,
      value = "A rating from 1-10 as to how reasonable the request for action is.  Reasonability includes factors like whether the District is legally or policy-bound to comply with the request, or if enough time is being allowed for the district to adequately response."
    ) Integer reasonableRating,
    @P(
      required = true,
      value = "A comma-delimited list of reasons why the reasonable rating was assigned."
    ) String reasonableRatingReasons,
    @P(
      required = true,
      value = "A rating from 0-100 regarding the degree to which this email in specific represents compliance with a district's legal and moral obligations in regards to this call to action."
    ) Double compliance_rating_current,
    @P(
      required = true,
      value = "A list of reasons why the compliance rating was assigned.  This should be a comma separated list of reasons, such as \"No response provided\", \"No explanation provided\"." +
      "  If no reasons are known, then pass null or an empty string." +
      "  If the compliance rating is not relevant to this email, then pass null or an empty string."
    ) String compliance_rating_current_reasons,
    @P(
      required = true,
      value = "A comma-delimited list of any laws or school board policies that provide a basis for this point.  For example, 'Title IX, MN Statute 13.3, Board Policy 503'"
    ) String policyBasis,
    @P(
      required = false,
      value = "A comma-delimited list of tags that can be used to categorize this point.  For example, 'bullying, harassment, discrimination'."
    ) String tags
  ) throws Throwable {
    var msg = message();
    try {
      // First, email property record
      if (msg.getEmailId() == null) {
        log.warn(
          "Unable to record CTA - no email message ID available.  Details: " +
          action
        );
      }

      //var emailPropertyId =
      // Save Data
      var builder = CallToAction.builder()
        .documentId(msg.getDocumentId())
        .propertyType(DocumentPropertyType.KnownValues.CallToAction)
        .propertyValue(action)
        .tags(tags)
        .policyBasis(policyBasis)
        .createdOn(msg.getDocumentSendDate())
        .openedDate(msg.getDocumentSendDate().toLocalDate())
        .compliancyCloseDate(dueDate)
        .completionPercentage(0.0)
        .complianceMessage(compliance_rating_current)
        .complianceMessageReasons(compliance_rating_current_reasons)
        .inferred(inferred)
        .complianceDateEnforceable(dueDateEnforceable)
        .reasonabilityRating(reasonableRating)
        .reasonableReason(reasonableRatingReasons);

      builder.build().addToDb(db());
    } catch (SQLException ex) {
      Colors.Set(c -> c.RED);
      log.error(
        "Unexpected SQL failure recording key point.  Details: " + action,
        ex
      );
      DocumentProperty.addManualReview(
        c -> db(),
        msg.getDocumentId(),
        ex,
        "addCallToActionToDatabase",
        action,
        dueDate,
        compliance_rating_current,
        compliance_rating_current_reasons,
        policyBasis,
        tags
      );
      Colors.Reset();
      return;
    }
    Colors.Set(color -> color.BRIGHT + color.CYAN);
    addDetectedPoint();
    log.info(
      "Added CTA to  database: {}\n\tCompliance Ratiing: {}\n\tCompliance Reasons: {}\n\t" +
      "Policy Basis: {}\n\tTags: {}\n\tDocument Id: {}",
      action,
      compliance_rating_current,
      compliance_rating_current_reasons,
      Objects.requireNonNullElse(policyBasis, "<none>"),
      Objects.requireNonNullElse(tags, "<none>"),
      message().getDocumentId()
    );
    Colors.Reset();
  }

  /**
   * Adds a Responsive Action that has been identified within the target document to the database.
   * This includes a link to the Call to Action (CTA) this is in response to, and ratings of compliance
   * for both the specific response and the CTA as a whole.
   *
   * @param call_to_action_id Unique identifier for the call to action this response is in reference to.
   *  If the action is responsive to more than one CTA, add a record for each of them.
   * @param responsive_action The responsive action taken.
   * @param completion_percentage The percentage to which this CTA can be considered fully resolved.
   * @param compliance_response_score A rating from 0-100 regarding the degree to which this email specifically
   * represents compliance with a district's legal and moral obligations in regards to this call to action.
   * @param compliance_response_reasons A comma-delimted list of reasons why the compliance rating was assigned.
   * @param compliance_rating_aggregate A rating from 0-100 regarding the degree to which the District has complied with the CTA
   * when taking into account all action or inaction taken in response.
   * @param compliance_rating_aggregate_reasons A comma-delimited list of reasons why the aggregate compliance rating was assigned.
   * @param reasonableRating  A rating from 1-10 as to how reasonable the response is. This includes factors like whether the response
   * is inline with the request, the degree to which it aligns with the law or policy, and the reasonableness of the request itself.
   * Responses in which the district acts in good faith to fulfill their obligations - for example provides a fully responsive dataset,
   * or refuses to provide a record with valid legal basis - are rated at a 10.  Responses in which the district does not act in good
   * faith or is duplicitous - for example, claiming privacy protections for data a parent has legal basis to access or providing
   * datasets that are not fully responsive or inappropriately redacted, are rated at a 1.
   * @param reasonableRatingReasons A comma-delimted list of reasons why the reasonable rating was assigned.
   * @param severity A rating from 1-10 as to the severity of the response.  This includes factors like the degree to which it is likely to cause harm to
   * the student or parent, or places the district in legal jeopardy.
   * @param inferred A boolean indicating whether this CTA is inferred from the document, or explicitly stated / omitted.
   * @param policyBasis A comma-delimited list of any laws or school board policies that provide a basis for this point.
   * For example, "Title IX, MN Statute 13.3, Board Policy 503".
   * @param tags A comma-delimited list of tags that can be used to categorize this point. For example,
   *  "bullying, harassment, discrimination". This parameter is optional.
   */
  @Tool(
    name = "addCtaResponseToDatabase",
    value = "Adds a Responsive Action that has been identified within the target document to our database.  Includes a link to the CTA this is in response to, and a rating of compliance specifically for this response as well as the CTA as a whole."
  )
  public void addCtaResponseToDatabase(
    @P(
      required = true,
      value = "Unique identifier for the call to action this response is in reference to.  If the action is responsive to more than one CTA, add a record for each of them."
    ) UUID call_to_action_id,
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
    ) String compliance_rating_aggregate_reasons,
    @P(
      required = true,
      value = "A comma-delimited list of any laws or school board policies that provide a basis for this point.  For example, 'Title IX, MN Statute 13.3, Board Policy 503'"
    ) String policyBasis,
    @P(
      required = false,
      value = "A comma-delimited list of tags that can be used to categorize this point.  For example, 'bullying, harassment, discrimination'."
    ) String tags,
    @P(
      required = true,
      value = "A rating from 1-10 as to how reasonable the response is. This includes factors like whether the response is inline with the request, the degree to which it aligns with the law or policy, and the reasonableness of the request itself. Responses in which the district acts in good faith to fulfill their obligations - for example provides a fully responsive dataset, or refuses to provide a record with valid legal basis - are rated at a 10.  Responses in which the district does not act in good faith or is duplicitous - for example, claiming privacy protections for data a parent has legal basis to access or providing datasets that are not fully responsive or inappropriately redacted, are rated at a 1."
    ) Integer reasonableRating,
    @P(
      required = true,
      value = "A comma-delimted list of reasons why the reasonable rating was assigned."
    ) String reasonableRatingReasons,
    @P(
      required = true,
      value = "A rating from 1-10 as to the severity of the response.  This includes factors like the degree to which it is likely to cause harm to the student or parent, or places the district in legal jeopardy."
    ) Integer severity,
    @P(
      required = true,
      value = "A boolean indicating whether this CTA is inferred from the document, or explicitly stated / omitted."
    ) Boolean inferred
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
        .actionPropertyId(call_to_action_id)
        .propertyType(5)
        .propertyValue(responsive_action)
        .createdOn(msg.getDocumentSendDate())
        .completionPercentage(completion_percentage)
        .responseTimestamp(msg.getDocumentSendDate())
        .complianceMessage(compliance_response_score)
        .complianceMessageReasons(compliance_response_reasons)
        .complianceAggregate(compliance_rating_aggregate)
        .complianceAggregateReasons(compliance_rating_aggregate_reasons)
        .policyBasis(policyBasis)
        .tags(tags)
        .reasonableRequest(reasonableRating)
        .reasonableReasons(reasonableRatingReasons)
        .severity(severity)
        .inferred(inferred)
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
      DocumentProperty.addManualReview(
        c -> db(),
        msg.getDocumentId(),
        ex,
        "addCtaResponse",
        call_to_action_id,
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
    log.info(
      "Added CTA to  database: {}\n\tRelated CTA: {}\n\tCompliance Ratiing: {}\n\tCompliance Reasons: {}\n\t" +
      "Policy Basis: {}\n\tTags: {}\n\tDocument Id: {}",
      responsive_action,
      call_to_action_id,
      compliance_response_score,
      compliance_response_reasons,
      Objects.requireNonNullElse(policyBasis, "<none>"),
      Objects.requireNonNullElse(tags, "<none>"),
      message().getDocumentId()
    );
    Colors.Reset();
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
    }
    try {
      return this.policyLookup.summarizePolicy(query, policyType);
    } catch (Exception e) {
      log.error(
        "Unexpected failure searching for policy summary.  Details: " + query,
        e
      );
      var msg = message();
      if (msg != null) {
        if (msg.getDocumentId() == null) {
          log.warn(
            "Unable to add processing note - no Document ID available.  Details: " +
            query
          );
        }
      } else {
        log.warn(
          "Unable to add processing note - no message context available."
        );
      }

      DocumentProperty.addManualReview(
        c -> db(),
        msg.getDocumentId(),
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
      required = true,
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

  /**
   * Retrieves the details of active calls to action from the database, including details
   * about the responsive actions that have already occurred.
   *
   * @param ids A comma-delimited list containing the IDs of calls to action to retrieve.
   * @return An array of {@link HistoricCallToAction} objects representing the details
   *         of the specified calls to action.
   */
  @Tool(
    name = "getCtaDetails",
    value = "Retrieves the details of active calls to action from the database, including details about the responsive actions that have already occured."
  )
  public HistoricCallToAction[] getCtaDetails(
    @P(
      required = true,
      value = "A comma-delimited list containing the id's of calls to action to retrieve"
    ) String ids
  ) {
    var idArray = List.of(ids.split(","))
      .stream()
      .map(s -> s.trim().replaceAll("\"", ""))
      .collect(Collectors.toSet())
      .stream()
      .collect(Collectors.toList());

    return getContent()
      .CallsToAction.stream()
      .filter(cta -> cta.isIdMatch(idArray))
      .collect(Collectors.toList())
      .stream()
      .map(o -> (HistoricCallToAction) o.getObject())
      .toArray(HistoricCallToAction[]::new);
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
      addNote();
    } catch (SQLException e) {
      log.error(
        "Unexpected SQL failure adding processing note.  Details: " + note,
        e
      );
    }
  }
}
