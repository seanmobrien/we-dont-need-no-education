package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.core.ai.extraction.services.IterationEventArgs;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CallToActionCategoryEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToActionEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.chat.assistants.tools.CallToActionTool;
import com.obapps.schoolchatbot.core.models.CallToActionCategory;
import dev.langchain4j.service.Result;
import java.sql.SQLException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CtaTitleIXAccessAssesmentQueueProcessor
  implements IQueueProcessor<CategorizedCallToAction, CategorizedCallToAction> {

  private final Db _db;
  private final StandaloneModelClientFactory modelClientFactory;
  private final CtaBrokerService brokerService;
  private final Logger log;

  public CtaTitleIXAccessAssesmentQueueProcessor() {
    this(null, null, null);
  }

  public CtaTitleIXAccessAssesmentQueueProcessor(
    Db db,
    StandaloneModelClientFactory modelClientFactory,
    CtaBrokerService broker
  ) {
    this._db = db;
    this.modelClientFactory = modelClientFactory == null
      ? new StandaloneModelClientFactory()
      : modelClientFactory;
    this.brokerService = broker == null ? new CtaBrokerService() : broker;
    this.log = LoggerFactory.getLogger(this.getClass());
  }

  private Db db() {
    try {
      if (_db == null) {
        return Db.getInstance();
      } else {
        return _db;
      }
    } catch (SQLException e) {
      e.printStackTrace();
      throw new RuntimeException("Error getting DB connection", e);
    }
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

  static String serializeCtas(List<CategorizedCallToAction> models) {
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
              🏷️:
              %s
              📅: %s
              📊📄: %s
              📩:
              %s
              📜
              %s""",
            cta.getRecordId(),
            cta.getPropertyValue(),
            cta
              .getCategories()
              .stream()
              .map(UUID::toString)
              .collect(Collectors.joining("\n")),
            cta
              .getCreatedOn()
              .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            cta.getDocumentId(),
            String.join("\n", cta.getClosureActionItems()),
            String.join("\n", cta.getPolicyBasis())
          )
        )
        .collect(Collectors.joining("\n"))
    );
  }

  @Override
  public String getQueueName() {
    return MessageQueueName.CtaCategorizedCta;
  }

  @Override
  public Boolean processBatch(List<CategorizedCallToAction> models) {
    var res = processBatchWithResult(models);
    return res != null && res.isSuccess();
  }

  @Override
  public BatchResult<
    Result<List<CategorizedCallToAction>>
  > processBatchWithResult(List<CategorizedCallToAction> models) {
    // First thing we want to do is de-duplicate the list of models
    models = CategorizedCallToAction.deDuplicate(models);

    return BatchResult.builder((Result<List<CategorizedCallToAction>>) null)
      .success(false)
      .cause(new Exception("not yet implemented"))
      .errorMessage("Not yet implemented")
      .build();
  }

  public BatchResult<
    Result<List<CategorizedCallToAction>>
  > processBatchWithResultIteration(
    List<CategorizedCallToAction> batch,
    List<CategorizedCallToAction> unprocessed
  ) {
    if (batch == null || batch.isEmpty()) {
      return BatchResult.failure("Batch is null or empty.", List.of());
    }
    var models = new ArrayList<>(batch);
    ArrayList<CallToActionCategory> categories;
    try {
      categories = new ArrayList<>(CallToActionCategory.loadAll(db()));
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
        .onSetup(ai ->
          ai
            .systemMessageProvider(o -> Prompts.GetSystemMessageForPhase(2020))
            .tools(new CallToActionTool(null))
        )
        .build(),
      cb ->
        cb.assessTitleIx(makeCategoryRecord(categories), serializeCtas(models)),
      ctx ->
        ctx
          .getService()
          .resumeTitleIxExtraction(ctx.getIteration(), ctx.getMatchesFound()),
      (s, e) -> onBatchComplete(batch, categories, s, e)
    );

    var rez = result.content();
    // what records were missed?
    var allProcessedIds = rez
      .stream()
      .map(c -> c.getRecordId())
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

    // Combine processing results with original input to get a full response

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
    List<CategorizedCallToAction> batch,
    ArrayList<CallToActionCategory> hnkj,
    Object sender,
    IterationEventArgs<
      CategorizedCallToAction,
      CategorizedCallToActionEnvelope
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
  }
}
