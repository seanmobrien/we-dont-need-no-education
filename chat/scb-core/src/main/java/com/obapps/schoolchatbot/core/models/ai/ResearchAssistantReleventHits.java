package com.obapps.schoolchatbot.core.models.ai;

import dev.langchain4j.model.output.structured.Description;

public class ResearchAssistantReleventHits {

  @Description("The text that was found to be relevant to the query.")
  String relevantText;

  @Description(
    "The ID of the record that was found to be relevant.  If no identifier is found, this should contain the record index."
  )
  String recordId;

  @Description("The reason why this hit is considered relevant.")
  String reason;

  @Description(
    "The confidence level of the hit being relevant.  This is a number between 0 and 100."
  )
  Integer confidence;

  public String getRelevantText() {
    return relevantText;
  }

  public void setRelevantText(String relevantText) {
    this.relevantText = relevantText;
  }

  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public Integer getConfidence() {
    return confidence;
  }

  public void setConfidence(Integer confidence) {
    this.confidence = confidence;
  }
}
