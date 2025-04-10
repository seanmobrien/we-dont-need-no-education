package com.obapps.schoolchatbot.assistants.content;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.rag.content.Content;

public class AugmentedSearchMetadataType {

  public static final String contentType = "content_augment";

  public static class KeyPoint {

    public static final String name = "KeyPoint";
    public static final String id = "property_id";
    public static final String document_id = "document_id";
    public static final String policy_dscr = "policy_description";
    public static final String compliance = "compliance_rating";
    public static final String tags = "tags";
    public static final String current_document = "current_document";
  }

  public static class EmailMetadata {

    public static String name = "EmailMetadata";
    public static final String id = "document_id";
    public static final String type_id = "document_type_id";
  }

  public static class Search {

    public static final String filename = Document.FILE_NAME;
  }

  public static class EmailSearch {

    public static final String id = "email_id";
    public static final String parent_email_id = "parent_email_id";
    public static final String attachment_id = "attachment_id";
    public static final String email_property_id = "email_property_id";
    public static final String thread_id = "thread_id";
    public static final String relatedEmailIds = "relatedEmailIds";
    public static final String document_type = "document_type";
    public static final String created_on = "created_on";
    public static final String href_document = "href_document";
    public static final String href_api = "href_api";
  }

  public static class PolicySearch {

    public static final String id = "policy_id";
    public static String chapter = "policy_chapter";
  }

  public static class CallToAction {

    public static String name = "CallToAction";
    public static final String id = "id";
    public static final String document_id = "document_id";
    public static final String policy_dscr = "policy_dscr";
    public static final String tags = "tags";
    public static final String completion_percentage = "completion_percentage";
    public static final String current_document = "current_document";
  }

  public static AugmentedContent createAugmentedContent(Content source) {
    if (source == null) {
      throw new IllegalArgumentException("source cannot be null");
    }
    switch (AugmentedContent.getAugmentedType(source)) {
      case KeyPoint:
        return new KeyPointsContent(source);
      case EmailMetadata:
        return new DocumentWithMetadataContent(source);
      case EmailSearch:
        return new AugmentedEmailSearch(source);
      case PolicySearch:
        return new AugmentedPolicySearch(source);
      case CallToAction:
        return new CallToActionContent(source);
      default:
        return new GenericAugmentedContent(source);
    }
  }
}
