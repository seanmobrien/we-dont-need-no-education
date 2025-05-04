package com.obapps.schoolchatbot.core.assistants.models.search;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import java.util.Map;

public class AiDocumentSearchResult extends AiSearchResult {

  public Integer getDocumentId() {
    return getMetaInt("id", 0);
  }

  public String getEmailIdString() {
    return getMetaString("email_id", "");
  }

  public String getParentEmailIdString() {
    return getMetaString("parent_email_id", "");
  }

  public String getAttachmentIdString() {
    return getMetaString("attachment_id", "");
  }

  @SuppressWarnings("deprecation")
  public String getDocumentPropertyIdString() {
    var ret = getMetaString(
      AugmentedSearchMetadataType.EmailSearch.document_property_id,
      null
    );
    if (ret == null || ret.isEmpty()) {
      // Fallback to the deprecated property
      ret = getMetaString(
        AugmentedSearchMetadataType.EmailSearch.email_property_id,
        ""
      );
    }

    return ret;
  }

  public String getThreadIdString() {
    return getMetaString("thread_id", "");
  }

  public String getRelatedEmailIdsString() {
    return getMetaString("relatedEmailIds", "");
  }

  public String getCreatedOnString() {
    return getMetaString("created_on", "");
  }

  public String getHrefDocumentString() {
    return getMetaString("href_document", "");
  }

  public String getHrefApiString() {
    return getMetaString("href_api", "");
  }

  @Override
  protected Map.Entry<String, Object> mapMetadataEntryForRecord(
    Map.Entry<String, String> entry
  ) {
    switch (entry.getKey()) {
      case "id":
        return Map.entry("document_id", entry.getValue());
      default:
        return super.mapMetadataEntryForRecord(entry);
    }
  }

  @Override
  public String getRecordType() {
    return "document";
  }

  @Override
  public String getRecordSubType() {
    return getMetaString("document_type", "unknown");
  }

  @Override
  public String toString() {
    return (
      "AiDocumentSearchResult{" +
      "documentId=" +
      getDocumentId() +
      ", emailId='" +
      getEmailIdString() +
      '\'' +
      ", parentEmailId='" +
      getParentEmailIdString() +
      '\'' +
      ", hrefApiString='" +
      getHrefApiString() +
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
