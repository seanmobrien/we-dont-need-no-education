package com.obapps.schoolchatbot.data.analysis;

import java.util.List;

public class Phase {

  private Integer phaseId;
  private String name;
  private String systemPrompt;
  private List<String> inputType;
  private String outputType;
  private List<Example> examples;

  // Getters and Setters
  public Integer getPhaseId() {
    return phaseId;
  }

  public void setPhaseId(Integer phaseId) {
    this.phaseId = phaseId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSystemPrompt() {
    return systemPrompt;
  }

  public void setSystemPrompt(String systemPrompt) {
    this.systemPrompt = systemPrompt;
  }

  public List<String> getInputType() {
    return inputType;
  }

  public void setInputType(List<String> inputType) {
    this.inputType = inputType;
  }

  public String getOutputType() {
    return outputType;
  }

  public void setOutputType(String outputType) {
    this.outputType = outputType;
  }

  public List<Example> getExamples() {
    return examples;
  }

  public void setExamples(List<Example> examples) {
    this.examples = examples;
  }
}
