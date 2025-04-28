package com.obapps.schoolchatbot.chat.assistants.services.ai.phases.two;

import com.obapps.schoolchatbot.chat.MessageQueueName;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.BatchResult;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two.InitialCtaOrResponsiveAction;
import dev.langchain4j.service.Result;
import java.util.List;

public class ResponsiveActionAssignmentQueueProcessor
  implements
    IQueueProcessor<
      InitialCtaOrResponsiveAction,
      InitialCtaOrResponsiveAction
    > {

  @Override
  public String getQueueName() {
    return MessageQueueName.CtaReconciliationTargetResponsiveAction;
  }

  @Override
  public Boolean processBatch(List<InitialCtaOrResponsiveAction> models) {
    return false;
  }

  @Override
  public BatchResult<
    Result<List<InitialCtaOrResponsiveAction>>
  > processBatchWithResult(List<InitialCtaOrResponsiveAction> models) {
    return BatchResult.builder(
      (Result<List<InitialCtaOrResponsiveAction>>) null
    )
      .success(false)
      .cause(new Exception("not yet implemented"))
      .errorMessage("Not yet implemented")
      .build();
  }
}
