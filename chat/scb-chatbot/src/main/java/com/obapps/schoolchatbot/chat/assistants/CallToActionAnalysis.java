package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.util.Colors;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.chat.assistants.retrievers.CallToActionRetriever;
import com.obapps.schoolchatbot.chat.assistants.tools.*;
import com.obapps.schoolchatbot.core.assistants.AssistantProps;
import com.obapps.schoolchatbot.core.assistants.DocumentChatAssistant;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.Result;
import java.util.Scanner;
import java.util.stream.Collectors;

/**
 * Represents the analysis of calls to action within a document.
 * This class extends the DocumentChatAssistant to provide specific functionality
 * for analyzing and interacting with calls to action.
 */
public class CallToActionAnalysis
  extends DocumentChatAssistant<AugmentedContentList> {

  /**
   * Default constructor initializing the assistant with default properties.
   */
  public CallToActionAnalysis() {
    super(AugmentedContentList.class, new AssistantProps(2));
  }

  /**
   * Constructor initializing the assistant with a specific initial request.
   *
   * @param initialRequest The initial request to set for the assistant.
   */
  public CallToActionAnalysis(String initialRequest) {
    super(
      AugmentedContentList.class,
      new AssistantProps(2).setInitialRequest(initialRequest)
    );
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
  protected UserMessage generatePrompt(AugmentedContentList contents) {
    try {
      if (contents.getActiveDocument() == null) {
        return null;
      }
      var promptBuilder = new StringBuilder(
        contents
          .getActiveDocumentContent()
          .getDocumentHeaderData(contents.Attachments)
      );
      promptBuilder.append(lookupCtaHistory());

      promptBuilder.append("\n");
      promptBuilder.append(getDocumentContents());
      promptBuilder.append("\n\n");

      return UserMessage.builder()
        .addContent(new TextContent(promptBuilder.toString()))
        .build();
    } catch (IllegalArgumentException ex) {
      Colors.Set(c -> c.RED + c.BRIGHT);
      log.error("Call to Action Content Injection: " + ex.getMessage(), ex);
      Colors.Reset();
      return UserMessage.builder().addContent(new TextContent("PING")).build();
    }
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
        "Identified 🔔",
        ctaBuilder.length() > 0
          ? ctaBuilder.toString()
          : "❌ No active 🔔 detected - use 🔍 🛠️ if needed.\n"
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

    var openCallsToAction = Content.CallsToAction.stream()
      .map(c -> c.getObject())
      .collect(Collectors.toList());
    if (openCallsToAction.isEmpty()) {
      return "";
    }

    for (var cta : openCallsToAction) {
      serializedCallsToAction
        .append("🗂️\n")
        .append("  Id: 📎 ")
        .append(cta.getPropertyId())
        .append("\n");
      serializedCallsToAction
        .append("  📝: ")
        .append(cta.getPropertyValue())
        .append("\n");
      serializedCallsToAction
        .append("  From 📊📄: ")
        .append(cta.getDocumentId().equals(activeDocumentId) ? "Yes" : "No")
        .append("\n  🔽 📩\n");
      var responses = cta.getResponses();
      if (responses != null && !responses.isEmpty()) {
        for (var response : responses) {
          serializedCallsToAction
            .append("  ➖ 📩: ")
            .append(response.getPropertyValue())
            .append("\n");
          serializedCallsToAction
            .append("    From 📊📄: ")
            .append(cta.getDocumentId().equals(activeDocumentId) ? "Yes" : "No")
            .append("\n");
        }
      } else {
        serializedCallsToAction.append("    ❌ None\n");
      }
    }
    return serializedCallsToAction.toString();
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
    return super.prepareAssistantService(
        builder,
        retrievalAugmentor,
        chatMemory
      )
      .tools(new CallToActionTool(this))
      .systemMessageProvider(id -> Prompts.GetSystemMessageForPhase(2));
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
    Result<String> response,
    String lastUserMessage
  ) {
    return "exit";
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
