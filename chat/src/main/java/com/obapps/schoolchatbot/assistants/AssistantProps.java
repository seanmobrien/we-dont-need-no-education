package com.obapps.schoolchatbot.assistants;

public class AssistantProps {

  public AssistantProps(Integer phase) {
    this.phase = phase;
  }

  public AssistantProps setInitialRequest(String initialRequest) {
    this.initialRequest = initialRequest;
    return this;
  }

  public String initialRequest;
  public Integer phase;
}
