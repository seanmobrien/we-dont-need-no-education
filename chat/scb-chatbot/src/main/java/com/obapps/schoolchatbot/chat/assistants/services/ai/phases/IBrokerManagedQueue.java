package com.obapps.schoolchatbot.chat.assistants.services.ai.phases;

public interface IBrokerManagedQueue {
  void Start();

  void Stop();

  Boolean getIsRuning();
}
