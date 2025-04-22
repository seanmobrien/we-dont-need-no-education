package com.obapps.schoolchatbot.core.assistants.types;

public abstract class BaseStageAnalystFactory {

  public abstract IStageAnalystController getStageAnalyst(int stageId);
}
