package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.chat.assistants.retrievers.KeyPointsRetriever;
import com.obapps.schoolchatbot.chat.assistants.tools.*;
import com.obapps.schoolchatbot.core.assistants.*;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.Result;
import java.sql.SQLException;
import java.util.Scanner;

/**
 * Represents the KeyPointAnalysis assistant.
 *
 * <p>This class extends the {@link DocumentChatAssistant} to provide specific
 * functionality for analyzing and interacting with key points in documents.</p>
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Supports starting a conversation with the user.</li>
 *   <li>Generates prompts for analyzing key points in documents.</li>
 *   <li>Prepares retrieval augmentors and assistant services for key point analysis.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>
 * {@code
 * KeyPointAnalysis analysis = new KeyPointAnalysis();
 * analysis.talkWith(scanner, args);
 * }
 * </pre>
 */
public class KeyPointAnalysis
  extends DocumentChatAssistant<AugmentedContentList> {

  private Db db;

  /**
   * Default constructor initializing the assistant with default properties.
   */
  public KeyPointAnalysis() {
    this(new AssistantProps(1));
  }

  /**
   * Constructor initializing the assistant with a specific initial request.
   *
   * @param initialRequest The initial request to set for the assistant.
   */
  public KeyPointAnalysis(String initialRequest) {
    this(new AssistantProps(1).setInitialRequest(initialRequest));
  }

  protected KeyPointAnalysis(AssistantProps props) {
    super(AugmentedContentList.class, props);
  }

  /**
   * Starts a conversation with the user using the provided scanner.
   *
   * @param scanner The scanner to read user input.
   */
  public void talkWith(Scanner scanner) {
    super.startConversationWith(scanner);
  }

  /**
   * Starts a conversation with the user using the provided scanner and arguments.
   *
   * @param scanner The scanner to read user input.
   * @param args The arguments to configure the assistant.
   */
  @Override
  public UserMessage generatePrompt(AugmentedContentList contents) {
    try {
      var promptBuilder = new StringBuilder();
      promptBuilder.append(
        Prompts.getPromptForPhase(this.getPhase(), contents)
      );
      var keyPoints = contents.KeyPoints.stream()
        .filter(k -> k.isFromCurrentDocument())
        .map(x -> String.format("  - %s", x.getObject().getPropertyValue()))
        .toList();
      var dp = keyPoints.size();
      var recordBuilder = new StringBuilder();
      if (dp > 0) {
        recordBuilder
          .append("You have already identified the following Key Points:\n")
          .append(String.join("\n", keyPoints));
      } else {
        promptBuilder.append(
          "No Key Points have been found on this record yet.\n"
        );
      }
      promptBuilder.append(
        Strings.getRecordOutput(
          "Identified Key Points",
          recordBuilder.toString()
        )
      );
      promptBuilder.append("\n");
      promptBuilder.append(getDocumentContents());
      promptBuilder.append("\n\n");

      Colors.Reset();
      return UserMessage.builder()
        .addContent(new TextContent(promptBuilder.toString()))
        .build();
    } catch (IllegalArgumentException ex) {
      Colors.Set(c -> c.RED + c.BRIGHT);
      log.error("Key Point Content Injection: " + ex.getMessage(), ex);
      Colors.Reset();
      return UserMessage.builder().addContent(new TextContent("PING")).build();
    }
  }

  public Db db() throws SQLException {
    this.db = db == null ? Db.getInstance() : db;
    return this.db;
  }

  @Override
  protected DefaultRetrievalAugmentorBuilder prepareRetrievalAugmentor(
    DefaultRetrievalAugmentorBuilder builder,
    ContentRetriever... additionalRetrievers
  ) {
    return super.prepareRetrievalAugmentor(
      builder,
      new KeyPointsRetriever()
    ).contentInjector(this);
  }

  AddKeyPointsTool tool;

  @Override
  protected <T> AiServices<T> prepareAssistantService(
    AiServices<T> builder,
    RetrievalAugmentor retrievalAugmentor,
    ChatMemory chatMemory
  ) {
    tool = new AddKeyPointsTool(this);
    // No chat memory saves on context space
    return super.prepareAssistantService(
      builder,
      retrievalAugmentor,
      null
    ).tools(tool);
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
   * Runs the KeyPointAnalysis assistant with the specified scanner and arguments.
   *
   * @param scanner The scanner to read user input.
   * @param args The arguments to configure the assistant.
   */
  public static void run(Scanner scanner, String[] args) {
    KeyPointAnalysis emailSummarizer = new KeyPointAnalysis();
    if (args.length > 0) {
      try {
        if (Integer.parseInt(args[0]) > 0) {
          emailSummarizer.setAutoResponse(args[0]);
        }
      } catch (IllegalArgumentException ex) {
        // Not an int
      }
    }
    emailSummarizer.talkWith(scanner);
  }
}
