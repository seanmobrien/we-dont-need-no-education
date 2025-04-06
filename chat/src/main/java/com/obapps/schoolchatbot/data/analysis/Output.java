package com.obapps.schoolchatbot.data.analysis;

import java.util.List;

public class Output {

  private String description;
  private String policyBasis;
  private Double relevance;
  private Double compliance;
  private Integer severityRating;
  private List<String> tags;

  // Getters and Setters
  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getPolicyBasis() {
    return policyBasis;
  }

  public void setPolicyBasis(String policyBasis) {
    this.policyBasis = policyBasis;
  }

  public Double getRelevance() {
    return relevance;
  }

  public void setRelevance(Double relevance) {
    this.relevance = relevance;
  }

  public Double getCompliance() {
    return compliance;
  }

  public void setCompliance(Double compliance) {
    this.compliance = compliance;
  }

  public Integer getSeverityRating() {
    return severityRating;
  }

  public void setSeverityRating(Integer severityRating) {
    this.severityRating = severityRating;
  }

  public List<String> getTags() {
    return tags;
  }

  public void setTags(List<String> tags) {
    this.tags = tags;
  }
}
