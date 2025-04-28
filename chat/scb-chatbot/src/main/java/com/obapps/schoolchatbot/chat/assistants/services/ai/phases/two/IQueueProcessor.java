package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import dev.langchain4j.service.Result;
import java.util.List;

public interface IQueueProcessor<TModel, TBatchResult> {
  public String getQueueName();

  public Boolean processBatch(List<TModel> models);

  public BatchResult<Result<List<TBatchResult>>> processBatchWithResult(
    List<TModel> models
  );
}
