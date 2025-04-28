package com.obapps.schoolchatbot.core.models;

import com.obapps.core.util.Db;
import dev.langchain4j.model.output.TokenUsage;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Represents an audit entry for document unit analysis stages.
 */
public class DocumentUnitAnalysisStageAudit {

  private Integer analysisAuditId;
  private Integer documentId;
  private Integer analysisStageId;
  private Integer detectedPoints;
  private LocalDateTime timestamp;
  private Integer notes;
  private String message;
  private Integer iteration;
  private Integer tokensInput;
  private Integer tokensOutput;
  private Boolean completionSignalled;
  private Boolean inPostProcessingQueue;

  public DocumentUnitAnalysisStageAudit() {}

  public DocumentUnitAnalysisStageAudit(
    Integer analysisAuditId,
    Integer documentId,
    Integer analysisStageId,
    Integer detectedPoints,
    LocalDateTime timestamp
  ) {
    this.analysisAuditId = analysisAuditId;
    this.documentId = documentId;
    this.analysisStageId = analysisStageId;
    this.detectedPoints = detectedPoints;
    this.timestamp = timestamp;
    this.completionSignalled = null;
    this.inPostProcessingQueue = null;
  }

  public Integer getAnalysisAuditId() {
    return analysisAuditId;
  }

  public void setAnalysisAuditId(Integer analysisAuditId) {
    this.analysisAuditId = analysisAuditId;
  }

  public Integer getDocumentId() {
    return documentId;
  }

  public void setDocumentId(Integer documentId) {
    this.documentId = documentId;
  }

  public Integer getAnalysisStageId() {
    return analysisStageId;
  }

  public void setAnalysisStageId(Integer analysisStageId) {
    this.analysisStageId = analysisStageId;
  }

  public Integer getDetectedPoints() {
    return detectedPoints;
  }

  public void setDetectedPoints(Integer detectedPoints) {
    this.detectedPoints = detectedPoints;
  }

  public LocalDateTime getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(LocalDateTime timestamp) {
    this.timestamp = timestamp;
  }

  public Integer getNotes() {
    return notes;
  }

  public void setNotes(Integer addedNotes) {
    this.notes = addedNotes;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public Integer getIteration() {
    return iteration;
  }

  public void setIteration(Integer iterationId) {
    this.iteration = iterationId;
  }

  public Integer getTokensInput() {
    return tokensInput;
  }

  public void setTokensInput(Integer tokensInput) {
    this.tokensInput = tokensInput;
  }

  public Integer getTokensOutput() {
    return tokensOutput;
  }

  public void setTokensOutput(Integer tokensOutput) {
    this.tokensOutput = tokensOutput;
  }

  public Boolean getCompletionSignalled() {
    return completionSignalled;
  }

  public void setCompletionSignalled(Boolean completionSignalled) {
    this.completionSignalled = completionSignalled;
  }

  public void setInPostProcessingQueue(Boolean inPostProcessingQueue) {
    this.inPostProcessingQueue = inPostProcessingQueue;
  }

  public Boolean getInPostProcessingQueue() {
    return inPostProcessingQueue;
  }

  public static class Builder {

    private Integer analysisAuditId;
    private Integer documentId;
    private Integer analysisStageId;
    private Integer detectedPoints;
    private LocalDateTime timestamp;
    private Integer addedNotes;
    private String message;
    private Integer iterationId;
    private Integer tokensInput;
    private Integer tokensOutput;
    private Boolean completionSignalled;
    private Boolean inPostProcessingQueue;

    public Builder analysisAuditId(Integer analysisAuditId) {
      this.analysisAuditId = analysisAuditId;
      return this;
    }

    public Builder documentId(Integer documentId) {
      this.documentId = documentId;
      return this;
    }

    public Builder analysisStageId(Integer analysisStageId) {
      this.analysisStageId = analysisStageId;
      return this;
    }

    public Builder detectedPoints(Integer detectedPoints) {
      this.detectedPoints = detectedPoints;
      return this;
    }

    public Builder timestamp(LocalDateTime timestamp) {
      this.timestamp = timestamp;
      return this;
    }

    public Builder addedNotes(Integer addedNotes) {
      this.addedNotes = addedNotes;
      return this;
    }

    public Builder message(String message) {
      this.message = message;
      return this;
    }

    public Builder iterationId(Integer iterationId) {
      this.iterationId = iterationId;
      return this;
    }

    public Builder tokensInput(Integer tokensInput) {
      this.tokensInput = tokensInput;
      return this;
    }

    public Builder tokensOutput(Integer tokensOutput) {
      this.tokensOutput = tokensOutput;
      return this;
    }

    public Builder tokens(TokenUsage tokens) {
      return tokensInput(tokens.inputTokenCount()).tokensOutput(
        tokens.outputTokenCount()
      );
    }

    public Builder inPostProcessingQueue(Boolean inPostProcessingQueue) {
      this.inPostProcessingQueue = inPostProcessingQueue;
      return this;
    }

    public Builder completionSignalled(Boolean completionSignalled) {
      this.completionSignalled = completionSignalled;
      return this;
    }

    public DocumentUnitAnalysisStageAudit build() {
      DocumentUnitAnalysisStageAudit audit = new DocumentUnitAnalysisStageAudit(
        analysisAuditId,
        documentId,
        analysisStageId,
        detectedPoints,
        timestamp
      );
      audit.setNotes(addedNotes);
      audit.setMessage(message);
      audit.setIteration(iterationId);
      audit.setTokensInput(tokensInput);
      audit.setTokensOutput(tokensOutput);
      if (completionSignalled != null) {
        audit.setCompletionSignalled(completionSignalled);
      }
      if (inPostProcessingQueue != null) {
        audit.setInPostProcessingQueue(inPostProcessingQueue);
      }
      return audit;
    }
  }

  public static Builder builder() {
    return new Builder();
  }

  public void saveToDb(Db db) throws SQLException {
    saveToDb(db, null);
  }

  public void saveToDb(
    Db db,
    List<DocumentUnitAnalysisFunctionAudit> functions
  ) throws SQLException {
    if (analysisAuditId != null) {
      updateDb(db);
      return;
    }
    var res = db.insertAndGetGeneratedKeys(
      "INSERT INTO document_unit_analysis_stage_audit (document_id, analysis_stage_id, detected_points, notes, message, timestamp, iteration, tokens_input, tokens_output, completion_signalled, in_post_processing_queue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
      documentId,
      analysisStageId,
      detectedPoints,
      notes,
      message,
      Objects.requireNonNullElse(timestamp, LocalDateTime.now()),
      iteration,
      tokensInput,
      tokensOutput,
      completionSignalled,
      inPostProcessingQueue
    );
    if (res == null) {
      throw new SQLException("Failed to insert DocumentUnitAnalysisStageAudit");
    }
    analysisAuditId = res;

    if (functions != null) {
      for (var idx = 0; idx < functions.size(); idx++) {
        var functionAudit = functions.get(idx);
        functionAudit.setAnalysisAuditId(analysisAuditId);
        functionAudit.setFunctionNum(idx + 1);
        functionAudit.saveToDb(db);
      }
    }
  }

  public void updateDb(Db db) throws SQLException {
    if (analysisAuditId == null) {
      throw new SQLException("Cannot update record without analysisAuditId");
    }
    db.executeUpdate(
      "UPDATE document_unit_analysis_stage_audit SET document_id = ?, analysis_stage_id = ?, detected_points = ?, timestamp = ? WHERE analysis_audit_id = ?",
      documentId,
      analysisStageId,
      detectedPoints,
      Objects.requireNonNullElse(timestamp, LocalDateTime.now()),
      analysisAuditId
    );
  }

  public static DocumentUnitAnalysisStageAudit loadFromDb(
    Db db,
    Integer analysisAuditId
  ) throws SQLException {
    var records = db.selectObjects(
      DocumentUnitAnalysisStageAudit.class,
      "SELECT * FROM document_unit_analysis_stage_audit WHERE analysis_audit_id = ?",
      analysisAuditId
    );
    return records.isEmpty() ? null : records.get(0);
  }
}
