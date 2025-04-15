package com.obapps.schoolchatbot.core.assistants.types;

import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;

public interface IStageAnalyst {
  AnalystDocumentResult processDocument(Integer documentId);
  AnalystDocumentResult processDocument(
    Integer documentId,
    Boolean throwOnError
  ) throws Throwable;
}
