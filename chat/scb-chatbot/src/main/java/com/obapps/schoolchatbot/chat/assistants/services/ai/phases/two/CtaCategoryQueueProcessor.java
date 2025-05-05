package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.ai.extraction.services.IterationEventArgs;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.DateTimeFormats;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategoryEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.chat.assistants.tools.CallToActionTool;
import com.obapps.schoolchatbot.core.models.CallToActionCategory;
import dev.langchain4j.model.output.TokenUsage;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.tool.ToolExecution;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CtaCategoryQueueProcessor
  implements
    IQueueProcessor<
      InitialCtaOrResponsiveAction,
      com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
    > {

  private final StandaloneModelClientFactory modelClientFactory;
  private final Db db;
  private final Logger log;
  private final CtaBrokerService brokerService;

  public CtaCategoryQueueProcessor() {
    this(null, null, null);
  }

  public CtaCategoryQueueProcessor(
    Db db,
    StandaloneModelClientFactory modelClientFactory,
    CtaBrokerService brokerService
  ) {
    this.log = LoggerFactory.getLogger(CtaCategoryQueueProcessor.class);
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

  public String getQueueName() {
    return MessageQueueName.CtaReconciliationTargetCta;
  }

  String makeCategoryRecord(List<CallToActionCategory> categories) {
    return Strings.getRecordOutput(
      "🏷️",
      categories == null || categories.isEmpty()
        ? "No categories yet."
        : categories
          .stream()
          .map(category ->
            String.format(
              """
              🗂️
                🏷️ Id: %s
                🏷️ Name: %s
                🏷️ Description: %s
              """,
              category.getCtaCategoryId(),
              category.getCategoryName(),
              category.getCategoryDescription()
            )
          )
          .collect(Collectors.joining("\n"))
    );
  }

  static String joinByNewLine(List<String> list) {
    return list == null || list.isEmpty()
      ? "No items."
      : String.join("\n", list);
  }

  static String serializeCtas(List<InitialCtaOrResponsiveAction> models) {
    return Strings.getRecordOutput(
      "🔔",
      models
        .stream()
        .map(cta ->
          String.format(
            """
            🗂️
              🔔 Id: %s
              Description: %s
              📅: %s
              📊📄: %s
              📩:
              %s
              📜
              %s""",
            cta.getRecordId(),
            cta.getPropertyValue(),
            cta.getCreatedOn() == null
              ? null
              : cta.getCreatedOn().format(DateTimeFormats.localDate),
            cta.getDocumentId(),
            joinByNewLine(cta.getClosureActionItems()),
            joinByNewLine(cta.getPolicyBasis())
          )
        )
        .collect(Collectors.joining("\n"))
    );
  }

  @Override
  public Boolean processBatch(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch
  ) {
    return processBatchWithResult(batch).isSuccess();
  }

  @Override
  public BatchResult<
    Result<
      List<
        com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
      >
    >
  > processBatchWithResult(
    IQueueProcessor.QueueBatchContext<InitialCtaOrResponsiveAction> batch
  ) {
    if (batch == null || batch.isEmpty()) {
      return BatchResult.failure("Batch is null or empty.", List.of());
    }
    var aggregateProcessingNotes = new ArrayList<String>();
    List<InitialCtaOrResponsiveAction> remainingBatch = new ArrayList<>(batch);
    ArrayList<ToolExecution> toolExecutions = new ArrayList<>();
    ArrayList<
      com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
    > records = new ArrayList<>();
    Result<
      List<
        com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
      >
    > aggregatedResults = new Result<
      List<
        com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
      >
    >(records, new TokenUsage(), Collections.emptyList(), null, toolExecutions);

    // Initialize the last remianing count as size of batch + 1 - This keeps the loop from detecting the first run a stall.
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
      // Copy remainingBatch into a new list so source remains stable
      var chunk = new ArrayList<>(remainingBatch);

      BatchResult<
        Result<
          List<
            com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
          >
        >
      > chunkResult = processBatchWithResultIteration(chunk, remainingBatch);

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
      aggregatedResults = new Result<
        List<
          com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
        >
      >(
        records,
        TokenUsage.sum(aggregatedResults.tokenUsage(), rez.tokenUsage()),
        rez.sources(),
        rez.finishReason(),
        toolExecutions
      );
    }
    return BatchResult.success(aggregatedResults, aggregateProcessingNotes);
  }

  public BatchResult<
    Result<
      List<
        com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory
      >
    >
  > processBatchWithResultIteration(
    List<InitialCtaOrResponsiveAction> batch,
    List<InitialCtaOrResponsiveAction> unprocessed
  ) {
    if (batch == null || batch.isEmpty()) {
      return BatchResult.failure("Batch is null or empty.", List.of());
    }
    var models = new ArrayList<>(batch);
    ArrayList<CallToActionCategory> categories;
    try {
      categories = new ArrayList<>(CallToActionCategory.loadAll(db));
    } catch (SQLException e) {
      log.error("Failed to load categories from database", e);
      return BatchResult.failure(e, List.of());
    }
    var properties = new HashMap<String, Object>();
    var processingNotes = new ArrayList<String>();
    properties.put("processingNotes", processingNotes);
    var result = RecordExtractionService.extractRecords(
      properties,
      modelClientFactory,
      AiServiceOptions.builder(ICtaCategorizerAnalyst.class)
        .setMemoryWindow(20)
        .onSetupService(ai ->
          ai
            .systemMessageProvider(o -> Prompts.GetSystemMessageForPhase(2010))
            .tools(new CallToActionTool(null))
        )
        .build(),
      cb ->
        cb.categorizeBatch(
          makeCategoryRecord(categories),
          serializeCtas(models)
        ),
      ctx ->
        ctx
          .getService()
          .resumeCtaExtraction(
            ctx.getIteration(),
            ctx.getMatchesFound(),
            makeCategoryRecord(categories)
          ),
      (s, e) -> onBatchComplete(batch, categories, s, e)
    );

    var rez = result.content();
    // what records were missed?
    var allProcessedIds = rez
      .stream()
      .flatMap(c -> c.callToActionIds.stream())
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
    List<InitialCtaOrResponsiveAction> batch,
    ArrayList<CallToActionCategory> categories,
    Object sender,
    IterationEventArgs<
      com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory,
      CallToActionCategoryEnvelope
    > ctx
  ) {
    ArrayList<String> notes = ctx.getProperty("processingNotes");
    if (notes == null) {
      notes = new ArrayList<>();
      ctx.setProperty("processingNotes", notes);
    }
    if (ctx.getIterationResult().content().getProcessingNotes() != null) {
      notes.addAll(ctx.getIterationResult().content().getProcessingNotes());
    }
    var itRes = ctx.getIterationResult().content() == null
      ? null
      : ctx.getIterationResult().content().getResults();

    if (itRes == null || itRes.isEmpty()) {
      log.warn(
        "No categorized records found in iteration {} result.",
        ctx.getIteration()
      );
      return;
    }
    // Look for categories that are new to this batch
    itRes
      .stream()
      // track down new categories
      .filter(
        category ->
          category.categoryId == null ||
          category.categoryId.isEmpty() ||
          category.categoryId.startsWith("NEW-")
      )
      .collect(Collectors.toList())
      .stream()
      // That are not matches for items added in previous batches
      .filter(category ->
        categories
          .stream()
          .noneMatch(c -> c.getCategoryName().equals(category.categoryName))
      )
      .forEach(category -> {
        if (!addCategory(category, categories)) {
          log.warn("Failed to add category: {}", category.categoryName);
        }
      });

    itRes.forEach(categoryResult -> {
      if (categoryResult == null || categoryResult.callToActionIds == null) {
        return;
      }
      var cat = categories
        .stream()
        .filter(c ->
          c
            .getCtaCategoryId()
            .equals(UUID.fromString(categoryResult.categoryId))
        )
        .findFirst()
        .orElse(null);
      categoryResult.callToActionIds.forEach(ctaResult -> {
        // Find original item from batch
        var ctaSource = batch
          .stream()
          .filter(m -> m.getRecordId().compareToIgnoreCase(ctaResult) == 0)
          .findFirst()
          .orElse(null);
        if (ctaSource == null) {
          return;
        }
        brokerService.addToCategorizedQueue(
          com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction.builder()
            .copy(ctaSource)
            .categories(List.of(cat.getCtaCategoryId()))
            .build()
        );
      });
    });
  }

  protected Boolean addCategory(
    com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategory cat,
    ArrayList<CallToActionCategory> categories
  ) {
    var saved = CallToActionCategory.builder()
      .setCategoryName(cat.categoryName)
      .setCategoryDescription(cat.categoryDescription)
      .build();
    try {
      saved.saveToDb(db);
      cat.categoryId = saved.getCtaCategoryId().toString();
    } catch (SQLException e) {
      log.error("Failed to save new category {}", cat.categoryName, e);
      return false;
    }
    categories.add(saved);
    return true;
  }
}
