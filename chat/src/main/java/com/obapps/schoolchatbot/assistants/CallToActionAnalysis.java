package com.obapps.schoolchatbot.assistants;

import com.google.gson.JsonObject;
import com.obapps.schoolchatbot.assistants.retrievers.CallToActionRetriever;
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
import java.util.Map;
import java.util.Scanner;
import java.util.stream.Collectors;

/**
 * Represents the analysis of calls to action within a document.
 * This class extends the DocumentChatAssistant to provide specific functionality
 * for analyzing and interacting with calls to action.
 */
public class CallToActionAnalysis extends DocumentChatAssistant {

  /**
   * Default constructor initializing the assistant with default properties.
   */
  public CallToActionAnalysis() {
    super(new AssistantProps(2));
  }

  /**
   * Constructor initializing the assistant with a specific initial request.
   *
   * @param initialRequest The initial request to set for the assistant.
   */
  public CallToActionAnalysis(String initialRequest) {
    super(new AssistantProps(2).setInitialRequest(initialRequest));
  }

  /**
   * Starts a conversation with the user using the provided scanner and arguments.
   *
   * @param scanner The scanner to read user input.
   * @param args Additional arguments for the conversation.
   */
  public void talkWith(Scanner scanner, Object[] args) {
    super.startConversationWith(scanner);
  }

  /**
   * Generates a prompt for the assistant based on the user's message.
   *
   * @param userMessage The user's message to process.
   * @return A UserMessage containing the generated prompt.
   */
  @Override
  protected UserMessage generatePrompt(UserMessage userMessage) {
    try {
      final String emailMessageInput = getDocumentContents();
      var contentBuilder = new StringBuilder();

      contentBuilder.append(
        Prompts.getPromptForPhase(this.getPhase(), Content)
      );
      contentBuilder.append(lookupCtaHistory());
      contentBuilder.append("\n");
      contentBuilder.append(emailMessageInput);
      contentBuilder.append("\n\n");

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

  /**
   * Prepares the retrieval augmentor with additional retrievers.
   *
   * @param builder The builder for the retrieval augmentor.
   * @param additionalRetrievers Additional content retrievers to include.
   * @return The configured retrieval augmentor builder.
   */
  @Override
  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    ContentRetriever... additionalRetrievers
  ) {
    return super.prepareRetrievalAugmentor(
      builder,
      new CallToActionRetriever()
    ).contentInjector(this);
  }

  /**
   * Prepares the assistant service with the specified augmentor and memory.
   *
   * @param builder The AI services builder.
   * @param retrievalAugmentor The retrieval augmentor to use.
   * @param chatMemory The chat memory to use, or null for no memory.
   * @param <T> The type of the AI service.
   * @return The configured AI services instance.
   */
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

  /**
   * Handles the assistant's response to the user.
   *
   * @param response The assistant's response.
   * @param lastUserMessage The last message from the user.
   * @return A string indicating the next action, such as "exit".
   */
  @Override
  protected String onAssistantResponse(
    String response,
    String lastUserMessage
  ) {
    return "exit";
  }

  /**
   * Looks up the history of calls to action for the active document.
   *
   * @return A string representation of the call-to-action history.
   */
  protected String lookupCtaHistory() {
    var contentBuilder = new StringBuilder();
    var ctaBuilder = new StringBuilder(serializeCallsToAction());
    contentBuilder.append(
      Strings.getRecordOutput(
        "Identified CTAs",
        ctaBuilder.length() > 0
          ? ctaBuilder.toString()
          : "No active CTAs at this time.\n"
      )
    );
    ctaBuilder = serializeResponsiveAction();
    contentBuilder.append(
      Strings.getRecordOutput(
        "Identified Responsive Actions",
        ctaBuilder.length() > 0
          ? ctaBuilder.toString()
          : "No Responsive Actions found in message yet.\n"
      )
    );
    return contentBuilder.toString();
  }

  /**
   * Serializes the active calls to action into a string format.
   *
   * @return A string representation of the serialized calls to action.
   */
  String serializeCallsToAction() {
    var serializedCallsToAction = new StringBuilder();
    var activeDocumentId = Content.getActiveDocument().getDocumentId();

    for (var cta : Content.CallsToAction.stream()
      .map(c -> c.getObject())
      .filter(c -> c.isOpen())
      .collect(Collectors.toList())) {
      serializedCallsToAction.append(
        "    | Id                                       | Call to Action                                                        | From this Message  |\n"
      );
      serializedCallsToAction.append(
        "    |------------------------------------------|-----------------------------------------------------------------------|--------------------|\n"
      );
      var action = Strings.formatForMultipleLines(65, cta.getPropertyValue());
      serializedCallsToAction.append(
        String.format(
          "    | %40s | %65s | %17s |\n",
          cta.getPropertyId(),
          action.get(0),
          cta.getDocumentId() == activeDocumentId ? "Yes" : "No"
        )
      );
      for (var idex = 1; idex < action.size(); idex++) {
        serializedCallsToAction.append(
          String.format(
            "    |                                          | %65s |                    |\n",
            action.get(idex)
          )
        );
      }
      /*
      for (var response : cta.getResponses()) {
        // 36

        var date = response.getResponseTimestamp("MM/dd/yyyy");
        var action = Strings.formatForMultipleLines(36, response.getPropertyValue());
        var fromThisMessage = response.getDocumentId() == activeDocumentId
          ? "Y"
          : "N";
        serializedCallsToAction.append(
          String.format(
            "    | %-10s | %-37s | %14.2f   | %9.2f  |-%7s\n",
            date,
            action.get(0),
            response.getComplianceMessage(),
            response.getCompletionPercentage(),
            fromThisMessage
          )
        );
        if (action.length() > 37) {
          serializedCallsToAction.append(
            Strings.formatForMultipleLines(
              37, action,
              "    |            | ",
              " |                     |               |\n"              
            )
          );
        }
      } */
    }

    return serializedCallsToAction.toString();
  }

  /**
   * Serializes the active calls to action into a string format.
   *
   * @return A string representation of the serialized calls to action.
   */
  StringBuilder serializeResponsiveAction() {
    var serializedCallsToAction = new StringBuilder();
    var activeDocumentId = Content.getActiveDocument().getDocumentId();

    for (var cta : Content.CallsToAction.stream()
      .flatMap(c -> c.getObject().getResponses().stream())
      .filter(c -> c.getDocumentId() == activeDocumentId)
      .collect(Collectors.toList())) {
      serializedCallsToAction.append(
        "    | Id                                       | Responsive Action                                                     | From this Message  |\n"
      );
      serializedCallsToAction.append(
        "    |------------------------------------------|-----------------------------------------------------------------------|--------------------|\n"
      );
      serializedCallsToAction.append(
        String.format(
          "    | %40s | %65s | %17s |\n",
          cta.getPropertyId(),
          cta.getPropertyValue(),
          cta.getDocumentId() == activeDocumentId ? "Yes" : "No"
        )
      );
    }
    return serializedCallsToAction;
  }

  /**
   * Saves a property from a source map to a target JSON object.
   *
   * @param source The source map containing the property.
   * @param sourceField The field name in the source map.
   * @param target The target JSON object to save the property to.
   */
  void saveProperty(
    Map<String, Object> source,
    String sourceField,
    JsonObject target
  ) {
    saveProperty(source, sourceField, target, sourceField);
  }

  /**
   * Saves a property from a source map to a target JSON object with a specified target field name.
   *
   * @param source The source map containing the property.
   * @param sourceField The field name in the source map.
   * @param target The target JSON object to save the property to.
   * @param targetField The field name in the target JSON object.
   */
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

  /**
   * Runs the CallToActionAnalysis assistant with the specified scanner and arguments.
   *
   * @param scanner The scanner to read user input.
   * @param args The arguments to configure the assistant.
   */
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
