package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.util.*;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.one.InitialKeyPoint;
import com.obapps.schoolchatbot.chat.assistants.retrievers.KeyPointsRetriever;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.one.IKeyPointAnalyst;
import com.obapps.schoolchatbot.chat.assistants.tools.*;
import com.obapps.schoolchatbot.core.assistants.*;
import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;
import com.obapps.schoolchatbot.core.models.DocumentProperty;
import com.obapps.schoolchatbot.core.models.DocumentPropertyType;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisFunctionAudit;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisStageAudit;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.rag.DefaultRetrievalAugmentor.DefaultRetrievalAugmentorBuilder;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.Result;
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
   * Processes a document by its ID and generates an analysis result.
   * This method includes an option to throw an exception on error.
   *
   * @param documentId The ID of the document to process.
   * @param throwOnError A Boolean flag indicating whether to throw an exception on error.
   * @return An AnalystDocumentResult object containing the analysis result.
   * @throws Exception
   */
  @Override
  public AnalystDocumentResult processDocument(
    Integer documentId,
    Boolean throwOnError
  ) throws Exception {
    var result = AnalystDocumentResult.aggregateBuilder();

    try (var tx = Db.getInstance().createTransaction()) {
      try {
        resetMessageState();
        var dId = documentId;
        if (dId == null) {
          throw new IllegalArgumentException("Document ID cannot be null.");
        }
        if (dId <= 0) {
          throw new IllegalArgumentException(
            "Document ID must be a positive integer."
          );
        }
        IKeyPointAnalyst aiService = getAiService(IKeyPointAnalyst.class);
        var extractionService = new RecordExtractionService<InitialKeyPoint>();
        //Result<List<InitialKeyPoint>> extractedResult =
        extractionService.extractRecords(
          aiService,
          ai -> ai.processStage(dId),
          ctx ->
            ctx
              .getService()
              .resumeExtraction(ctx.getIteration(), ctx.getMatchesFound()),
          (sender, args) -> {
            var iterationResult = args.getIterationResult();
            var docResult = new AnalystDocumentResult(
              iterationResult,
              true,
              0,
              args.getNewRecords(),
              args.getHasSignaledComplete()
            );
            result.append(docResult);
            log.info(
              "Iteration {} ({} items remain): {}",
              args.getIteration(),
              args.getEstimatedItemsRemaining(),
              docResult.getSummary()
            );
            try {
              var rez = iterationResult.content().getResults();

              for (var idx = 0; idx < rez.size(); idx++) {
                var v = rez.get(idx);
                v.setDocumentId(documentId);
                if (v.getRecordId() == null || v.getRecordId().length() < 0) {
                  v.setRecordId(UUID.randomUUID().toString());
                }
                v.saveToDb(db);
              }

              if (iterationResult.content().getProcessingNotes() != null) {
                var notes = iterationResult.content().getProcessingNotes();
                for (var idx = 0; idx < notes.size(); idx++) {
                  DocumentProperty.builder()
                    .documentId(documentId)
                    .propertyValue(notes.get(idx))
                    .propertyType(
                      DocumentPropertyType.KnownValues.ProcessingNote
                    )
                    .build()
                    .addToDb(db);
                  addNote();
                }
              }

              DocumentUnitAnalysisStageAudit.builder()
                .documentId(documentId)
                .iterationId(args.getIteration())
                .completionSignalled(args.getHasSignaledComplete())
                .analysisStageId(getPhase())
                .detectedPoints(args.getNewRecords())
                .addedNotes(0)
                .message(
                  String.format(
                    "(%d) items remain)",
                    args.getEstimatedItemsRemaining()
                  )
                )
                .tokens(iterationResult.tokenUsage())
                .build()
                .saveToDb(
                  Db.getInstance(),
                  DocumentUnitAnalysisFunctionAudit.from(
                    iterationResult.toolExecutions()
                  )
                );
            } catch (SQLException e) {
              log.error(
                "Error saving document audit for document {}: {}",
                documentId,
                e.getMessage(),
                e
              );
              throw new RuntimeException(e);
            }
          }
        );
      } catch (Exception e) {
        tx.setAbort();
        if (throwOnError) {
          throw e;
        }
        log.error(
          "Error processing document {}: {}",
          documentId,
          e.getMessage(),
          e
        );
        result.append(new AnalystDocumentResult(e, 0, 0));
      }
    }
    return result.build();
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
