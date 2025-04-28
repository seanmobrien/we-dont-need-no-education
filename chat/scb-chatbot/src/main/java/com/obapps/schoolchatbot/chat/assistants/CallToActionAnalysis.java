package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.util.Colors;
import com.obapps.core.util.IDbTransaction;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.chat.assistants.retrievers.CallToActionRetriever;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.CtaBrokerService;
import com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two.ICtaExtractionAnalyst;
import com.obapps.schoolchatbot.chat.assistants.tools.*;
import com.obapps.schoolchatbot.core.assistants.AssistantProps;
import com.obapps.schoolchatbot.core.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;
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

  private final CtaBrokerService ctaBrokerService;

  /**
   * Default constructor initializing the assistant with default properties.
   */
  public CallToActionAnalysis() {
    this(null);
  }

  /**
   * Default constructor initializing the assistant with default properties.
   */
  public CallToActionAnalysis(CtaBrokerService ctaBrokerService) {
    super(AugmentedContentList.class, new AssistantProps(2));
    this.ctaBrokerService = ctaBrokerService == null
      ? new CtaBrokerService()
      : ctaBrokerService;
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

      promptBuilder.append("\n");
      promptBuilder.append(getDocumentContents());
      promptBuilder.append("\n\n");

      var replyTo = contents.getReplyToDocumentContent();
      if (replyTo != null) {
        promptBuilder
          .append(replyTo.getAbbreviatedDocumentHeaderData("Reply-To"))
          .append(replyTo.getPromptText("Reply-To"))
          .append("\n\n");
      }

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
   * Processes the document extract by analyzing and extracting records from the document.
   * In most implementations, this means passing processing off to our base class's
   * {@link extractRecords} to provide a {@link RecordExtractionService}-based implementation.
   * This allows the subclass to focus on only the specific aspect of phase analysis that it
   * specializes and has expertise in.  Or, if it wanted it to, it could act like it knows better than
   * anybody else and provide its own implementation, slashing thousands of jobs in the process,
   * only to run back to its car company with its tail between its legs once things get tough.
   * Cause, you know, Musk always has to Musk.
   *
   * @param tx          The database transaction context.
   * @param documentId  The ID of the document to be processed.
   * @return            The result of the document analysis as an AnalystDocumentResult.
   * @throws Exception  If an error occurs during the processing of the document.
   */
  @Override
  protected AnalystDocumentResult processDocumentExtract(
    IDbTransaction tx,
    Integer documentId
  ) throws Exception {
    return extractRecords(
      ICtaExtractionAnalyst.class,
      documentId,
      (results, args) -> {
        onDocumentBatchProcessed(
          results,
          args.setProperty("inPostProcessingQueue", true)
        );
        // Ensure all records have a documentId set
        var records = args.getIterationResult().content().getResults();
        if (records == null || records.isEmpty()) {
          return;
        }
        // Pass matches off to the broker service for remediation
        ctaBrokerService.addToQueue(records);
      }
    );
  }

  /**
   * Processes a document by its ID and generates an analysis result.
   * This method includes an option to throw an exception on error.
   *
   * @param documentId The ID of the document to process.
   * @param throwOnError A Boolean flag indicating whether to throw an exception on error.
   * @return An AnalystDocumentResult object containing the analysis result.
   * @throws Exception
  @Override
  public AnalystDocumentResult processDocument(
    Integer documentId,
    Boolean throwOnError
  ) throws Exception {
    var result = AnalystDocumentResult.aggregateBuilder();

    try (var tx = Db.getInstance().createTransaction()) {
      try {
        resetMessageState();
        if (documentId == null || documentId <= 0) {
          throw new IllegalArgumentException(
            "Document ID must be a positive integer."
          );
        }

        ICtaAnalyst aiService = getAiService(ICtaAnalyst.class);
        var extractionService = new RecordExtractionService<
          InitialCtaOrResponsiveAction
        >();
 
        extractionService.extractRecords(
          aiService,
          ai -> ai.processStage(documentId),
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



              // Enure all records have a documentId set
              var records = iterationResult.content().getResults();
              for (var record : records) {
                if (
                  record.getDocumentId() == null || record.getDocumentId() == 0
                ) {
                  record.setDocumentId(documentId);
                }
              }
              // Pass matches off to the broker service for remediation
              ctaBrokerService.addToQueue(records);
              // Add processing notes for posterity
              if (iterationResult.content().getProcessingNotes() != null) {
                for (var note : iterationResult
                  .content()
                  .getProcessingNotes()) {
                  DocumentProperty.builder()
                    .documentId(documentId)
                    .propertyValue(note)
                    .propertyType(
                      DocumentPropertyType.KnownValues.ProcessingNote
                    )
                    .build()
                    .addToDb(db());
                  addNote();
                }
              }
              // Generate an analysis audit record 
              DocumentUnitAnalysisStageAudit.builder()
                .documentId(documentId)
                .iterationId(args.getIteration())
                .inPostProcessingQueue(true)
                .analysisStageId(getPhase())
                .detectedPoints(args.getNewRecords())
                .addedNotes(0)
                .message(
                  String.format(
                    "(%d items remain)",
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
   */

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
