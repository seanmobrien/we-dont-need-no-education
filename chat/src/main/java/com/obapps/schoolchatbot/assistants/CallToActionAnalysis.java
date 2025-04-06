package com.obapps.schoolchatbot.assistants;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.obapps.schoolchatbot.assistants.content.*;
import com.obapps.schoolchatbot.assistants.tools.*;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.Strings;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Scanner;

public class CallToActionAnalysis extends DocumentChatAssistant {

  public CallToActionAnalysis() {
    super(new AssistantProps(2));
  }

  public CallToActionAnalysis(String initialRequest) {
    super(new AssistantProps(2).setInitialRequest(initialRequest));
  }

  public void talkWith(Scanner scanner, Object[] args) {
    super.startConversationWith(scanner);
  }

  @Override
  protected UserMessage generatePrompt(UserMessage userMessage) {
    try {
      final String emailMessageInput = getDocumentContents();
      var contentBuilder = new StringBuilder(
        // getDocumentAwareRequestPreamble() +
        "You are currently analyzing communication specifically for the purpose of identifying calls to action.  " +
        "You will be looking for any requests for information - such as \"Please provide me with the following information\" or \"Please provide me with a copy of this record\", as well as other requests  " +
        "the parent has the right to make, such as \"Please explain why this action was taken\" or \"What steps will be taken to keep my child safe\".  " +
        "When a new call to action is found, you will add it to the database for further analysis.\n"
      )
        .append(lookupCtaHistory())
        .append(Strings.getRecordOutput("Email Message", emailMessageInput));

      Colors.Set(c -> c.GREEN + c.BRIGHT);
      var meta = Content.getActiveDocument();
      log.info(
        String.format(
          "Call to Action Content Injection:\n\tDocument Id: %d\n\tDocument Type: %s\n\tEmail Id%s\n%s",
          meta.getDocumentId(),
          meta.getDocumentType(),
          meta.getEmailId(),
          contentBuilder
        )
      );
      Colors.Reset();
      return UserMessage.builder()
        .addContent(new TextContent(contentBuilder.toString()))
        .build();
    } catch (IllegalArgumentException ex) {
      Colors.Set(c -> c.RED + c.BRIGHT);
      log.error("Call to Action Content Injection: " + ex.getMessage(), ex);
      Colors.Reset();
      return UserMessage.builder().addContent(new TextContent("PING")).build();
    }
  }

  @Override
  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    ContentRetriever... additionalRetrievers
  ) {
    return super.prepareRetrievalAugmentor(
      builder,
      additionalRetrievers
    ).contentInjector(this);
  }

  @Override
  protected <T> AiServices<T> prepareAssistantService(
    AiServices<T> builder,
    RetrievalAugmentor retrievalAugmentor,
    ChatMemory chatMemory
  ) {
    // No chat memory saves on context space
    return super.prepareAssistantService(
      builder,
      retrievalAugmentor,
      null
    ).tools(new CallToActionTool(this));
  }

  @Override
  protected String onAssistantResponse(
    String response,
    String lastUserMessage
  ) {
    return "exit";
  }

  protected String lookupCtaHistory() {
    return "TODO: Add Call to Action Retriever and pull from there.\n";
    /*
    var contentBuilder = new StringBuilder();
    
    try {
      var ctaHistory = Db.getInstance()
        .selectRecords(
          "SELECT * FROM document_unit_cta_history(?)",
          getDocumentId()
        );
      StringBuilder contentBuilder = new StringBuilder();
      if (!ctaHistory.isEmpty()) {
        contentBuilder
          .append(
            "  Additionally, you are looking for responses to calls to action made in previous emails.  These responses should be added to the " +
            "database as call to action response records.  If there are open (e.g. not 100% completee) and the email takes no action to address, add a response record for " +
            "that call to action with appropriate adjustments to the compliance rating.  The current call to action resultset is provided below.  Calls to Action or Responses " +
            "with a 'from_this_message' value of true were already identified in this email and should not be re-added.\n"
          )
          .append(
            String.format(
              "\nBEGIN Call To Action History:\n%s\nEND Call to Action History\n",
              serializeCallsToAction(ctaHistory)
            )
          );
      }
      return contentBuilder.toString() + "\n";
    } catch (SQLException ex) {
      log.error("Unable to retrieve call to action history", ex);
      return (
        "IMPORTANT:\nAn error occurred while retrieving the call to action history.  Add a CTA to the database that specifically " +
        "states a technical error occurred during message analysis and manual review is required.  Error Details: " +
        ex.getMessage()
      );
    }
    */
  }

  String serializeCallsToAction(
    AugmentedContentList content,
    List<Map<String, Object>> ctaHistory
  ) {
    var lastActionId = "";
    var actionJsonArray = new JsonArray();
    JsonObject jsonAction = null;
    var meta = content.getActiveDocument();
    var documentId = meta.getDocumentId();
    for (var record : ctaHistory) {
      if (record == null) continue;
      var actionId = Objects.requireNonNullElse(
        record.get("action_property_id"),
        ""
      ).toString();
      if (!lastActionId.equals(actionId)) {
        copyFromLastResponse(jsonAction);
        jsonAction = new JsonObject();
        actionJsonArray.add(jsonAction);
        jsonAction.add("responses", new JsonArray());
        if (
          record.get("document_id") != null &&
          record.get("document_id") == documentId
        ) {
          jsonAction.addProperty("from_this_message", true);
        }
        jsonAction.addProperty("action_id", actionId);
        saveProperty(record, "opened_date", jsonAction);
        saveProperty(record, "action_description", jsonAction);
        saveProperty(record, "compliance_close_date", jsonAction);
        saveProperty(record, "impacted_policy", jsonAction);
        saveProperty(record, "completion_percentage", jsonAction);
        saveProperty(record, "compliance_aggregate_score", jsonAction);
        saveProperty(record, "impacted_policy", jsonAction);
      } else {
        var jsonResponse = new JsonObject();
        jsonAction.get("responses").getAsJsonArray().add(jsonResponse);
        if (
          record.get("document_id") != null &&
          record.get("document_id") == documentId
        ) {
          jsonAction.addProperty("from_this_message", true);
        }
        saveProperty(record, "response_timestamp", jsonResponse);
        saveProperty(
          record,
          "action_description",
          jsonResponse,
          "responsive_action"
        );
        saveProperty(record, "compliance_response_score", jsonResponse);
        saveProperty(record, "compliance_response_reason", jsonResponse);
        saveProperty(record, "compliance_aggregate_score", jsonResponse);
        saveProperty(record, "compliance_aggregate_reason", jsonResponse);
        saveProperty(record, "completion_percentage", jsonResponse);
      }
    }
    copyFromLastResponse(jsonAction);
    return actionJsonArray.toString();
  }

  void copyFromLastResponse(JsonObject jsonAction) {
    if (jsonAction == null) return;
    // Copy aggregated values from the last action
    var arr = jsonAction.get("responses").getAsJsonArray();
    if (arr.size() > 0) {
      jsonAction.remove("completion_percentage");
      jsonAction.remove("compliance_aggregate_score");
      var lastItem = arr.get(arr.size() - 1).getAsJsonObject();
      jsonAction.addProperty(
        "completion_percentage",
        lastItem.get("completion_percentage").getAsInt()
      );
      jsonAction.addProperty(
        "compliance_aggregate_score",
        lastItem.get("compliance_aggregate_score").getAsInt()
      );
    }
  }

  void saveProperty(
    Map<String, Object> source,
    String sourceField,
    JsonObject target
  ) {
    saveProperty(source, sourceField, target, sourceField);
  }

  void saveProperty(
    Map<String, Object> source,
    String sourceField,
    JsonObject target,
    String targetField
  ) {
    var value = source.get(sourceField);
    if (value != null) {
      if (value instanceof Number) {
        target.addProperty(targetField, ((Number) value));
      } else {
        target.addProperty(targetField, value.toString());
      }
    }
  }

  public static void run(Scanner scanner, String[] args) {
    var emailSummarizer = new CallToActionAnalysis();
    if (args.length > 0) {
      try {
        if (Integer.parseInt(args[0]) > 0) {
          emailSummarizer.setAutoResponse(args[0]);
        }
      } catch (IllegalArgumentException ex) {
        // Not an int
      }
    }
    emailSummarizer.talkWith(scanner, args);
  }
}
