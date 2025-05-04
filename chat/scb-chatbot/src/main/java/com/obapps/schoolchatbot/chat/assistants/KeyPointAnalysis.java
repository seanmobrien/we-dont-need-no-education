package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.chat.assistants.retrievers.KeyPointsRetriever;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.one.IKeyPointAnalyst;
import com.obapps.schoolchatbot.chat.assistants.tools.*;
import com.obapps.schoolchatbot.core.assistants.*;
import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import java.sql.SQLException;
import java.util.List;
import java.util.Scanner;
import java.util.UUID;
import java.util.stream.Collectors;

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
      if (contents.getActiveDocument() == null) {
        return null;
      }
      var promptBuilder = new StringBuilder(
        contents
          .getActiveDocumentContent()
          .getDocumentHeaderData(contents.Attachments)
      );

      List<String> keyPoints = contents.KeyPoints.stream()
        .filter(k -> k.isFromCurrentDocument())
        .map(x -> "  📍" + x.getObject().getPropertyValue())
        .collect(Collectors.toList());

      if (keyPoints.size() > 0) {
        promptBuilder.append(
          Strings.getRecordOutput("📍 in 📊📄", String.join("\n", keyPoints))
        );
      }
      promptBuilder.append("\n");
      promptBuilder.append(getDocumentContents());
      promptBuilder.append("\n\n");

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
    return super.prepareAssistantService(
        builder,
        retrievalAugmentor,
        chatMemory
      )
      .tools(tool)
      .systemMessageProvider(id -> Prompts.GetSystemMessageForPhase(1));
  }

  /**
   * Processes a document extract by analyzing key points and saving the results to the database.
   *
   * @param tx          The database transaction context.
   * @param documentId  The unique identifier of the document to process.
   * @return            An instance of {@link AnalystDocumentResult} containing the analysis results.
   *
   * This method performs the following steps:
   * - Extracts records using the {@link IKeyPointAnalyst} interface.
   * - Invokes the callback to handle batch processing of document results.
   * - Ensures all records have the associated document ID set.
   * - Assigns a unique record ID to records if not already set.
   * - Saves each record to the database, logging and rethrowing any SQL exceptions encountered.
   *
   * @throws RuntimeException If an error occurs while saving a record to the database.
   */
  @Override
  public AnalystDocumentResult processDocumentExtract(
    IDbTransaction tx,
    Integer documentId
  ) {
    return extractRecords(
      IKeyPointAnalyst.class,
      documentId,
      (results, args) -> {
        onDocumentBatchProcessed(results, args);
        // Ensure all records have a documentId set
        var records = args.getIterationResult().content().getResults();
        if (records == null || records.isEmpty()) {
          return;
        }
        for (var idx = 0; idx < records.size(); idx++) {
          var v = records.get(idx);
          v.setDocumentId(documentId);
          if (v.getRecordId() == null || v.getRecordId().length() < 0) {
            v.setRecordId(UUID.randomUUID().toString());
          }
          try {
            v.saveToDb(tx);
          } catch (SQLException e) {
            log.error("An error occurred saving key point at index {}", idx, e);
            throw new RuntimeException(e);
          }
        }
      }
    );
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
