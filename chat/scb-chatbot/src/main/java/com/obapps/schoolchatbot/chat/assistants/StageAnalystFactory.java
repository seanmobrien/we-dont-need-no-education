package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.schoolchatbot.core.assistants.types.BaseStageAnalystFactory;
import com.obapps.schoolchatbot.core.assistants.types.IStageAnalystController;

public class StageAnalystFactory extends BaseStageAnalystFactory {

  @Override
  public IStageAnalystController getStageAnalyst(int stageId) {
    switch (stageId) {
      case 1:
        return new KeyPointAnalysis();
      case 2:
        return new CallToActionAnalysis();
      default:
        throw new IllegalArgumentException("Invalid stage ID: " + stageId);
    }
  }
}
