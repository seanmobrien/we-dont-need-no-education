package com.obapps.schoolchatbot.core.assistants.content;

import dev.langchain4j.rag.content.Content;

public class AugmentedEmailSearch extends AugmentedSearchContent {

  public AugmentedEmailSearch(Content source) {
    super(source);
  }

  public String getEmailId() {
    return meta.getString(AugmentedSearchMetadataType.EmailSearch.id);
  }

  public String getEmailPropertyId() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.email_property_id
    );
  }

  public String getEmailThreadId() {
    return meta.getString(AugmentedSearchMetadataType.EmailSearch.thread_id);
  }

  public String getEmailAttachmentId() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.attachment_id
    );
  }

  public String getEmailParentId() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.parent_email_id
    );
  }

  public String getEmailRelatedIds() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.relatedEmailIds
    );
  }

  public String getEmailCreatedOn() {
    return meta.getString(AugmentedSearchMetadataType.EmailSearch.created_on);
  }

  public String getEmailDocumentType() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.document_type
    );
  }

  public String getEmailHrefDocument() {
    return meta.getString(
      AugmentedSearchMetadataType.EmailSearch.href_document
    );
  }

  public String getEmailHrefApi() {
    return meta.getString(AugmentedSearchMetadataType.EmailSearch.href_api);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.EmailSearch;
  }
}
