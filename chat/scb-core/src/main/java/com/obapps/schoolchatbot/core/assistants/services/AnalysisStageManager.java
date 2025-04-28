package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.Colors;
import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.assistants.types.BaseStageAnalystFactory;
import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;
import com.obapps.schoolchatbot.core.models.PendingStageAnalyst;
import java.sql.SQLException;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AnalysisStageManager {

  private static final Logger log = LoggerFactory.getLogger(
    AnalysisStageManager.class
  );
  private final int stageId;
  private final Db database;
  private final BaseStageAnalystFactory stageAnalystFactory;

  public AnalysisStageManager(
    int stageId,
    Db database,
    BaseStageAnalystFactory stageAnalystFactory
  ) throws SQLException {
    this.stageId = stageId;
    this.database = Objects.requireNonNullElse(database, Db.getInstance());
    this.stageAnalystFactory = stageAnalystFactory;
  }

  /**
   * Processes a document based on the provided document ID.
   *
   * @param docId The ID of the document to be processed.
   * @return An instance of {@link AnalystDocumentResult} containing the result of the document processing.
   *         If an error occurs, the result will contain an exception and default values.
   * @throws Exception This method does not explicitly throw exceptions, but any unexpected errors
   *                   during processing are logged and encapsulated in the returned result.
   */
  public AnalystDocumentResult processDocument(Integer docId) {
    try {
      var analyst = stageAnalystFactory.getStageAnalyst(stageId);
      return analyst.processDocument(docId);
    } catch (Throwable e) {
      // Should never ever ever get here
      log.error(
        "Error processing document ID {}: {}",
        docId,
        e.getMessage(),
        e
      );
      return new AnalystDocumentResult(new Exception(e), 0, 0);
    }
  }

  public void processDocuments() {
    int consecutiveFailures = 0;

    try {
      var pending = PendingStageAnalyst.loadForStage(database, stageId);
      var pendingCount = pending.size();
      if (pendingCount == 0) {
        log.info("No pending documents for stage {}.", stageId);
        System.out.println("No pending documents for stage " + stageId + ".");
        return;
      }
      log.info("Pending documents for stage {}: {}", stageId, pendingCount);
      Colors.writeInLivingColor(
        c -> c.CYAN,
        "Found %d documents pending processing in stage %d.\n",
        pendingCount,
        stageId
      );
      Colors.writeInLivingColor(
        c -> c.ITALIC + c.GREEN,
        "Tracking down an available analyst..."
      );
      var analyst = stageAnalystFactory.getStageAnalyst(stageId);
      var processed = 0;
      for (PendingStageAnalyst row : pending) {
        int documentId = row.getDocumentId();
        try {
          var result = analyst.processDocument(documentId);
          if (!result.getSuccess()) {
            log.error(
              "Error processing document ID {}: {}",
              documentId,
              result.getMessage()
            );
            consecutiveFailures++;
          } else {
            log.info(
              "Document ID {} processed successfully: {}.",
              documentId,
              result.getMessage()
            );
            log.debug(
              "Added {} analysis items and {} notes.",
              result.getNewRecords(),
              result.getNewNotes()
            );
            consecutiveFailures = 0; // Reset on success
          }

          processed++;
          System.out.printf(
            "Document ID %d processed %s (%d of %d): %s\n\n",
            documentId,
            result.getSuccess() ? "successfully" : "with error",
            processed,
            pendingCount,
            result.getMessage()
          );
        } catch (Exception e) {
          log.error(
            "Error processing document ID {}: {}",
            documentId,
            e.getMessage(),
            e
          );
          consecutiveFailures++;
        }
        if (consecutiveFailures >= 3) {
          log.error("Processing stopped after 3 consecutive failures.");
          break;
        }
      }
    } catch (Exception e) {
      log.error("Unexpected error: {}", e.getMessage(), e);
    }
  }
}
