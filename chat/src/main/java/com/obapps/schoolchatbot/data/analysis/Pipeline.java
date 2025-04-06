package com.obapps.schoolchatbot.data.analysis;

import java.util.List;

public class Pipeline {

  private String pipeline;
  private List<Phase> phases;

  // Getters and Setters
  public String getPipeline() {
    return pipeline;
  }

  public void setPipeline(String pipeline) {
    this.pipeline = pipeline;
  }

  public List<Phase> getPhases() {
    return phases;
  }

  public void setPhases(List<Phase> phases) {
    this.phases = phases;
  }
}
