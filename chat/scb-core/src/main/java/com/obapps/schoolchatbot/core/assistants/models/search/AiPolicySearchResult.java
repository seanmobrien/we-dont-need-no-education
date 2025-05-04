package com.obapps.schoolchatbot.core.assistants.models.search;

import java.util.Map;

public class AiPolicySearchResult extends AiSearchResult {

  @Override
  protected Map.Entry<String, Object> mapMetadataEntryForRecord(
    Map.Entry<String, String> entry
  ) {
    switch (entry.getKey()) {
      case "Creator":
      case "absolute_directory_path":
      case "Producer":
      case "ModDate":
      case "ContentTypeId":
      case "index":
      case "CreationDate":
        return null;
      default:
        return super.mapMetadataEntryForRecord(entry);
    }
  }

  public String getPolicyDescription() {
    return getMetaString("policy_description", "");
  }

  public String getChapter() {
    return getMetaString("policy_chapter", "");
  }

  public String getPolicyId() {
    return getMetaString("policy_id", "");
  }

  public String getSubject() {
    return getMetaString("Subject", "");
  }

  @Override
  public String getTitle() {
    return getMetaString("Title", "");
  }

  @Override
  public String getRecordType() {
    return "policy";
  }

  @Override
  public String getRecordSubType() {
    switch (getMetaString("policy_type_id", "")) {
      case "1":
        return "school_policy";
      case "2":
        return "state_law";
      case "3":
        return "federal_law";
      default:
        return "unknown";
    }
  }

  @Override
  public String toString() {
    return (
      "AiPolicySearchResult{" +
      "policyId=" +
      getPolicyId() +
      ", title='" +
      getTitle() +
      '\'' +
      ", subject='" +
      getSubject() +
      '\'' +
      ", policyTypeId='" +
      getRecordSubType() +
      '\'' +
      ", score=" +
      getScore() +
      ", content='" +
      getContent() +
      '\'' +
      "} " +
      super.toString()
    );
  }
}
