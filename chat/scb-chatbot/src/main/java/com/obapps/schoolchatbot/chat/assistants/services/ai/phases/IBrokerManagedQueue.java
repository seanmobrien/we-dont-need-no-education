package com.obapps.schoolchatbot.chat.assistants.services.ai.phases;

public interface IBrokerManagedQueue {
  void start();

  Boolean stop(Boolean force);

  void shutdown();

  Boolean getIsRunning();
}
