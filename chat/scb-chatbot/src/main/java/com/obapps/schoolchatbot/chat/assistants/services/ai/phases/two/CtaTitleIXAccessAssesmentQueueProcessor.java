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
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToAction;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.CategorizedCallToActionEnvelope;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import com.obapps.schoolchatbot.chat.assistants.tools.CallToActionTool;
import com.obapps.schoolchatbot.core.models.CallToActionCategory;
import com.obapps.schoolchatbot.core.models.HistoricCallToAction;
import dev.langchain4j.service.Result;
import java.sql.SQLException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CtaTitleIXAccessAssesmentQueueProcessor
  implements IQueueProcessor<CategorizedCallToAction, CategorizedCallToAction> {

  private final Db _db;
  private final StandaloneModelClientFactory modelClientFactory;
  private final Logger log;

  public CtaTitleIXAccessAssesmentQueueProcessor() {
    this(null, null);
  }

  public CtaTitleIXAccessAssesmentQueueProcessor(
    Db db,
    StandaloneModelClientFactory modelClientFactory
  ) {
    this._db = db;
    this.modelClientFactory = modelClientFactory == null
      ? new StandaloneModelClientFactory()
      : modelClientFactory;
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

  public Boolean getIsReady() {
    return true;
  }

  public synchronized void onBeginProcessing() {
    // No-op
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
  public Boolean processBatch(
    IQueueProcessor.QueueBatchContext<CategorizedCallToAction> models
  ) {
    var res = processBatchWithResult(models);
    return res != null && res.isSuccess();
  }

  @Override
  public BatchResult<
    Result<List<CategorizedCallToAction>>
  > processBatchWithResult(
    IQueueProcessor.QueueBatchContext<CategorizedCallToAction> batch
  ) {
    var actionRes = processBatchWithResultIteration(batch, new ArrayList<>());
    return actionRes;
  }

  public BatchResult<
    Result<List<CategorizedCallToAction>>
  > processBatchWithResultIteration(
    IQueueProcessor.QueueBatchContext<CategorizedCallToAction> batch,
    List<CategorizedCallToAction> processed
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
        .setMemoryWindow(100)
        .onSetupService(ai ->
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
      (s, e) -> onBatchComplete(batch, processed, s, e)
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
      if (processed.size() != batch.size()) {
        var batchSize = batch.size();
        processingNotes.add(
          String.format(
            "All %d records in this batch were processed successfully, but %d records remain unprocessed.",
            batch.size(),
            batchSize,
            processed.size()
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
    IQueueProcessor.QueueBatchContext<CategorizedCallToAction> batch,
    List<CategorizedCallToAction> processed,
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
    itRes.forEach(result -> {
      var recordId = result.getRecordId();
      var fromBatch = batch
        .stream()
        .filter(
          m ->
            Strings.compareIgnoreCase(recordId, m.recordId) &&
            m.getCategories().containsAll(result.getCategories())
        )
        .findFirst()
        .orElse(null);
      if (fromBatch == null) {
        log.warn(
          "No original record found for record id {} in iteration {}.",
          recordId,
          ctx.getIteration()
        );
        return;
      }
      if (saveRecord(fromBatch, result)) {
        batch.setComplete(fromBatch);
        processed.add(fromBatch);
      }
    });
  }

  Boolean saveRecord(
    CategorizedCallToAction fromBatch,
    CategorizedCallToAction processed
  ) {
    if (fromBatch == null || processed == null) {
      return false;
    }
    HistoricCallToAction cta = null;
    try {
      try (var db = Db.createUnitOfWork()) {
        var tx = db.createTransaction();
        try (tx) {
          var recordId = UUID.fromString(fromBatch.getRecordId());
          cta = HistoricCallToAction.getCallsToAction(
            _db,
            recordId,
            false,
            true
          );
          if (cta == null) {
            cta = HistoricCallToAction.HistoricCallToActionBuilder.builder()
              .propertyId(recordId)
              .propertyValue(fromBatch.getPropertyValue())
              .documentId(fromBatch.getDocumentId())
              .createdOn(fromBatch.getCreatedOn())
              .openedDate(fromBatch.getCreatedOn().toLocalDate())
              .compliancyCloseDate(
                DateTimeFormats.asLocalDate(fromBatch.compliancyCloseDate)
              )
              .complianceDateEnforceable(fromBatch.complianceDateEnforceable)
              .inferred(fromBatch.inferred)
              .closureActions(fromBatch.getClosureActionItems())
              .policyBasis(fromBatch.getPolicyBasis())
              .tags(fromBatch.getTags())
              .severity(fromBatch.getSeverity())
              .severityReasons(fromBatch.getSeverityReasons())
              .titleIxApplicable(processed.reasonablyTitleIx)
              .titleIxApplicableReasons(processed.getReasonablyTitleIxReasons())
              .sentiment(fromBatch.sentiment)
              .sentimentReasons(fromBatch.sentimentReasons)
              .categories(
                fromBatch
                  .getCategories()
                  .stream()
                  .map(m ->
                    CallToActionCategory.builder().setCtaCategoryId(m).build()
                  )
                  .toList()
              )
              .relatedDocuments(
                processed.relatedDocuments
                  .stream()
                  .map(m ->
                    com.obapps.schoolchatbot.core.models.DocumentRelationship.builder()
                      .targetDocumentId(m.documentId)
                      .relationship(m.relationshipType)
                      .build()
                  )
                  .toList()
              )
              .build();
            cta.addToDb(tx);
          } else {
            var updateCta = copyToExisting(fromBatch, processed, cta);
            if (updateCta) {
              cta.updateDb(tx);
            }
          }
        } catch (Exception e) {
          tx.setAbort();
          log.error(
            "An error occurred saving call to action Failed to create transaction",
            e
          );
          return false;
        }
      }
    } catch (SQLException e) {
      log.error(
        String.format(
          "Failed to save CTA - %s\nRecord id %s.\nFaulting record data:\n%s",
          fromBatch.getRecordId(),
          cta == null
            ? (Strings.safelySerializeAsJson(fromBatch) +
              "\n" +
              Strings.safelySerializeAsJson(processed))
            : Strings.safelySerializeAsJson(cta)
        ),
        e
      );
      return false;
    }
    return true;
  }

  boolean copyToExisting(
    CategorizedCallToAction fromBatch,
    CategorizedCallToAction processed,
    HistoricCallToAction cta
  ) {
    var updateCta = false;
    // Do a quick comparison of text
    if (
      !Strings.compareIgnoreCase(
        cta.getPropertyValue(),
        fromBatch.getPropertyValue()
      )
    ) {
      var p1 = cta.getPropertyValue();
      var p2 = fromBatch.getPropertyValue();
      cta.setPropertyValue(String.format("%s\n%s", p1, p2));
      log.warn(
        "CTA text discrepancy detected; in database:\n{}\nFrom batch:\n{}",
        p1,
        p2
      );
      // No change, no need to save
      updateCta = true;
    }
    if (cta.getTitleIxApplicable() < processed.reasonablyTitleIx) {
      cta.setTitleIxApplicable(processed.reasonablyTitleIx);
      updateCta = true;
    }
    var existingReasons = new ArrayList<>(
      Objects.requireNonNullElse(
        cta.getTitleIxApplicableReasons(),
        List.of(new String[0])
      )
    );
    var newReasons = processed
      .getReasonablyTitleIxReasons()
      .stream()
      .filter(reason -> !existingReasons.contains(reason))
      .collect(Collectors.toList());
    if (!newReasons.isEmpty()) {
      existingReasons.addAll(newReasons);
      cta.setTitleIxApplicableReasons(existingReasons);
      updateCta = true;
    }

    var existingClosureActions = new ArrayList<>(
      Objects.requireNonNullElse(
        cta.getClosureActions(),
        List.of(new String[0])
      )
    );
    var newClosureActions = fromBatch
      .getClosureActionItems()
      .stream()
      .filter(action -> !existingClosureActions.contains(action))
      .collect(Collectors.toList());
    if (!newClosureActions.isEmpty()) {
      existingClosureActions.addAll(newClosureActions);
      cta.setClosureActions(existingClosureActions);
      updateCta = true;
    }

    cta.setRelatedDocuments(
      processed.relatedDocuments
        .stream()
        .map(m ->
          com.obapps.schoolchatbot.core.models.DocumentRelationship.builder()
            .targetDocumentId(m.documentId)
            .relationship(m.relationshipType)
            .build()
        )
        .toList()
    );

    return updateCta;
  }
}
