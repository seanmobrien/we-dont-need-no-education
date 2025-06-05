package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.ai.extraction.services.IterationEventArgs;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.exceptions.ErrorUtil;
import com.obapps.core.util.DateTimeFormats;
import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.AssociatedResponsiveAction;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.AssociatedResponsiveActionEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.chat.assistants.tools.CallToActionTool;
import com.obapps.schoolchatbot.core.models.AssociatedCallToAction;
import com.obapps.schoolchatbot.core.models.CallToActionResponse;
import com.obapps.schoolchatbot.core.models.DocumentProperty;
import com.obapps.schoolchatbot.core.models.DocumentPropertyType;
import com.obapps.schoolchatbot.embed.EmbedDocuments;
import dev.langchain4j.model.output.TokenUsage;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.tool.ToolExecution;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ResponsiveActionAssignmentQueueProcessor
  implements
    IQueueProcessor<InitialCtaOrResponsiveAction, AssociatedResponsiveAction> {

  private final Logger log;
  private final StandaloneModelClientFactory modelClientFactory;
  private final CtaBrokerService brokerService;
  private final Db db;

  public ResponsiveActionAssignmentQueueProcessor() {
    this(null, null, null);
  }

  public ResponsiveActionAssignmentQueueProcessor(
    Db db,
    StandaloneModelClientFactory modelClientFactory,
    CtaBrokerService brokerService
  ) {
    super();
    log = LoggerFactory.getLogger(this.getClass());
    try {
      this.db = db == null ? Db.getInstance() : db;
    } catch (SQLException e) {
      log.error("Database connection initialization failed", e);
      throw new RuntimeException("Failed to initialize database connection", e);
    }
    this.modelClientFactory = modelClientFactory == null
      ? new StandaloneModelClientFactory()
      : modelClientFactory;
    this.brokerService = brokerService == null
      ? new CtaBrokerService()
      : brokerService;
  }

  public Boolean getIsReady() {
    return (
      brokerService.getQueueSize(MessageQueueName.CtaReconciliationTargetCta) ==
        0 &&
      brokerService.getQueueSize(MessageQueueName.CtaCategorizedCta) == 0
    );
  }

  public synchronized void onBeginProcessing() {
    // Update search indexes with the latest documents/cta's/etc.
    EmbedDocuments.main(false, null);
  }

  @Override
  public String getQueueName() {
    return MessageQueueName.CtaReconciliationTargetResponsiveAction;
  }

  @Override
  public Boolean processBatch(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch
  ) {
    return processBatchWithResult(batch).isSuccess();
  }

  @Override
  public BatchResult<
    Result<List<AssociatedResponsiveAction>>
  > processBatchWithResult(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch
  ) {
    var aggregateProcessingNotes = new ArrayList<String>();
    List<InitialCtaOrResponsiveAction> remainingBatch = new ArrayList<>(batch);
    ArrayList<ToolExecution> toolExecutions = new ArrayList<>();
    ArrayList<AssociatedResponsiveAction> records = new ArrayList<>();
    Result<List<AssociatedResponsiveAction>> aggregatedResults = new Result<
      List<AssociatedResponsiveAction>
    >(records, new TokenUsage(), Collections.emptyList(), null, toolExecutions);

    // Initialize the last remaining count as size of batch + 1 - This keeps the loop from detecting the first run a stall.
    var lastRemainingCount = remainingBatch.size() + 1;
    var iterationCount = 0;
    var stallCount = 0;

    while (!remainingBatch.isEmpty()) {
      iterationCount++;
      if (lastRemainingCount == remainingBatch.size()) {
        stallCount++;
        if (stallCount > 2) {
          return BatchResult.failure(
            "Stalled processing detected.",
            aggregateProcessingNotes
          );
        }
        log.warn(
          "Stalled processing detected after {} iterations.  Remaining batch size: {}",
          iterationCount,
          remainingBatch.size()
        );
      } else {
        lastRemainingCount = remainingBatch.size();
        stallCount = 0;
      }

      BatchResult<Result<List<AssociatedResponsiveAction>>> chunkResult =
        processBatchWithResultIteration(batch.makeBatch(0, 1), remainingBatch);

      aggregateProcessingNotes.addAll(chunkResult.getProcessingNotes());

      if (!chunkResult.isSuccess()) {
        log.warn(
          "Processing failed for a chunk: {}",
          chunkResult.getErrorMessage()
        );
        return BatchResult.failure(
          chunkResult.getErrorMessage(),
          aggregateProcessingNotes
        );
      }
      var rez = chunkResult.getResults();
      records.addAll(rez.content());
      if (rez.toolExecutions() != null) {
        toolExecutions.addAll(rez.toolExecutions());
      }
      aggregatedResults = new Result<List<AssociatedResponsiveAction>>(
        records,
        TokenUsage.sum(aggregatedResults.tokenUsage(), rez.tokenUsage()),
        rez.sources(),
        rez.finishReason(),
        toolExecutions
      );
    }
    return BatchResult.success(aggregatedResults, aggregateProcessingNotes);
  }

  BatchResult<
    Result<List<AssociatedResponsiveAction>>
  > processBatchWithResultIteration(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch,
    List<InitialCtaOrResponsiveAction> unprocessed
  ) {
    if (batch == null || batch.isEmpty()) {
      return BatchResult.failure(
        "Batch is null or empty.",
        List.of(new String[0])
      );
    }
    var models = new ArrayList<>(batch);
    var properties = new HashMap<String, Object>();
    var processingNotes = new ArrayList<String>();
    properties.put("processingNotes", processingNotes);
    var result = RecordExtractionService.extractRecords(
      properties,
      modelClientFactory,
      AiServiceOptions.builder(IResponsiveActionAnalyst.class)
        .setMemoryWindow(20)
        .onSetupService(ai ->
          ai
            .systemMessageProvider(o -> Prompts.GetSystemMessageForPhase(2030))
            .tools(new CallToActionTool(null))
        )
        .build(),
      cb -> {
        var cta = serializeActions(models);
        var ret = cb.assignToCta(cta);
        return ret;
      },
      ctx ->
        ctx
          .getService()
          .resumeAssignToCta(ctx.getIteration(), ctx.getMatchesFound()),
      (s, e) -> onBatchComplete(batch, s, e)
    );

    var rez = result.content();
    // what records were missed?
    var allProcessedIds = rez
      .stream()
      .filter(c -> c.isSavedToDatabase())
      .map(c -> c.id)
      .distinct()
      .collect(Collectors.toList());

    var missed = batch
      .stream()
      .filter(m -> {
        var recordId = m.getRecordId();
        return allProcessedIds
          .stream()
          .noneMatch(id -> id.compareToIgnoreCase(recordId) == 0);
      })
      .collect(Collectors.toList());

    unprocessed.removeIf(c -> {
      var recordId = c.getRecordId();
      return allProcessedIds
        .stream()
        .anyMatch(id -> id.compareToIgnoreCase(recordId) == 0);
    });

    if (missed.size() > 0) {
      var message = String.format(
        "Only %d out of %d records were procesed, please re-submit remaining %d records.",
        allProcessedIds.size(),
        batch.size(),
        missed.size()
      );
      log.warn(
        "{} - {}",
        message,
        missed
          .stream()
          .map(InitialCtaOrResponsiveAction::getRecordId)
          .collect(Collectors.toList())
      );
      processingNotes.add(message);
    } else {
      if (unprocessed.size() > 0) {
        processingNotes.add(
          String.format(
            "All %d records in this batch were processed successfully, but %d records remain unprocessed.",
            batch.size(),
            unprocessed.size()
          )
        );
      } else {
        log.info(
          String.format(
            "All %d records in this batch were processed successfully.",
            batch.size()
          )
        );
      }
    }
    log.trace("\tFull response: {}", Strings.serializeAsJson(rez));

    if (rez == null || rez.isEmpty()) {
      processingNotes.add("No results were processed in this batch.");
      log.warn(
        "No results were procesed in this batch, {} remain.",
        batch.size()
      );
      return BatchResult.builder(result)
        .success(true)
        .processingNotes(processingNotes)
        .errorMessage("No results found for the given models.")
        .build();
    }

    return BatchResult.success(result, processingNotes);
  }

  protected void onBatchComplete(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch,
    Object sender,
    IterationEventArgs<
      AssociatedResponsiveAction,
      AssociatedResponsiveActionEnvelope
    > ctx
  ) {
    ArrayList<String> notes = ctx.getProperty("processingNotes") == null
      ? new ArrayList<>()
      : ctx.getProperty("processingNotes");
    if (ctx.getProperty("processingNotes") == null) {
      ctx.setProperty("processingNotes", notes);
    }

    var itRes = ctx.getIterationResult().content() == null
      ? List.of(new AssociatedResponsiveAction[0])
      : ctx.getIterationResult().content().getResults();

    if (itRes == null || itRes.isEmpty()) {
      batch.setAbort();
      return;
    }

    itRes.forEach(actionResult -> {
      if (actionResult == null || actionResult.id == null) {
        batch.setAbort();
        return;
      }
      var hasBatchedAction = batch
        .stream()
        .filter(a -> a.getRecordId().compareToIgnoreCase(actionResult.id) == 0)
        .findFirst();
      if (hasBatchedAction.isPresent()) {
        var batchedAction = hasBatchedAction.get();
        IDbTransaction dbTx = null;
        try {
          dbTx = db.createTransaction();
          try (var tx = dbTx) {
            var response = CallToActionResponse.builder()
              .documentId(batchedAction.getDocumentId())
              .propertyId(UUID.fromString(batchedAction.getRecordId()))
              .propertyValue(batchedAction.propertyValue)
              .severity(batchedAction.severity)
              .severityReasons(batchedAction.severityReasons)
              .inferred(batchedAction.inferred)
              .sentiment(batchedAction.sentiment)
              .sentimentReasons(batchedAction.sentimentReasons)
              .tags(batchedAction.tags)
              .policyBasis(batchedAction.policyBasis)
              .responseTimestamp(batchedAction.createdOn)
              .associatedCallsToAction(
                actionResult.associatedCallsToAction
                  .stream()
                  .map(a -> {
                    return AssociatedCallToAction.builder()
                      .callToActionId(tx, a.callToActionId)
                      .complianceChapter13(a.complianceChapter13)
                      .complianceChapter13Reasons(a.complianceChapter13Reasons)
                      .build();
                  })
                  .toList()
              )
              .build();
            response.addToDb(tx);

            Optional<Integer> newDocumentId = tx
              .getDb()
              .selectSingleValue(
                "SELECT unit_id FROM document_units WHERE document_property_id=?",
                response.getPropertyId()
              );
            var noteDocId = newDocumentId.isPresent()
              ? newDocumentId.get()
              : response.getDocumentId();

            var relatedDocuments = actionResult.relatedDocuments
              .stream()
              .map(rd ->
                com.obapps.schoolchatbot.core.models.DocumentRelationship.builder()
                  .targetDocumentId(rd.documentId)
                  .relationship(rd.relationshipType)
                  .sourceDocumentId(noteDocId)
                  .build()
              )
              .toList();
            relatedDocuments.forEach(rd -> {
              try {
                rd.saveToDb(tx, false);
              } catch (Exception e) {
                ErrorUtil.handleException(
                  log,
                  e,
                  "Error adding document relationship.  Details:"
                );
                notes.add(
                  String.format(
                    "Error occurred adding document relationship to action %s.\nError: %s\nDocumentId: %s\nRelationship: %s",
                    actionResult.id,
                    e.getMessage() != null ? e.getMessage() : "unknown error",
                    rd.getDocumentId(),
                    rd.getRelationship()
                  )
                );
                batch.setAbort();
              }
            });

            actionResult.processingNotes.forEach(note -> {
              if (note != null && !note.isEmpty()) {
                try {
                  DocumentProperty.builder()
                    .documentId(noteDocId)
                    .propertyValue(note)
                    .propertyType(
                      DocumentPropertyType.KnownValues.ProcessingNote
                    )
                    .build()
                    .addToDb(tx);
                } catch (Exception e) {
                  ErrorUtil.handleException(
                    log,
                    e,
                    "Error adding note.  Details:"
                  );
                  notes.add(
                    String.format(
                      "Error occurred adding note to action %s.\nError: %s\nNote: %s",
                      actionResult.id,
                      e.getMessage() != null ? e.getMessage() : "unknown error",
                      note
                    )
                  );
                }
              }
            });
            batch.setComplete(batchedAction);
            actionResult.isSavedToDatabase(true);
          }
        } catch (Exception e) {
          ErrorUtil.handleException(log, e, "Error during transaction: ");
          if (dbTx != null) {
            dbTx.setAbort();
          }
          batch.setAbort();
          return;
        }
      } else {
        log.warn("No matching record found for id: {}", actionResult.id);
      }
    });

    if (itRes == null || itRes.isEmpty()) {
      log.warn(
        "No categorized records found in iteration {} result.",
        ctx.getIteration()
      );
      return;
    }
  }

  static String serializeActions(List<InitialCtaOrResponsiveAction> models) {
    var records = models
      .stream()
      .map(cta ->
        String.format(
          """
          🗂️
            📩 Id: %s
            Description: %s
            📅: %s
            📊📄 Id: %s
              """,
          cta.getRecordId(),
          cta.getPropertyValue(),
          cta.getCreatedOn() == null
            ? null
            : cta.getCreatedOn().format(DateTimeFormats.localDate),
          cta.getDocumentId()
        )
      )
      .collect(Collectors.joining("\n"));

    return Strings.getRecordOutput("📩", records);
  }
}
