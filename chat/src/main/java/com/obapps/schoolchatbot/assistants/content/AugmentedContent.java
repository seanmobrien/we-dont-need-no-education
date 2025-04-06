package com.obapps.schoolchatbot.assistants.content;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.rag.content.Content;

public abstract class AugmentedContent {

  private final Content source;
  protected final Metadata meta;

  protected AugmentedContent(Content source) {
    this.source = source;
    this.meta = source.textSegment().metadata();
  }

  protected Content getSource() {
    return source;
  }

  public String getText() {
    return source.textSegment().text();
  }

  public abstract AugmentedContentType getType();

  public static AugmentedContentType getAugmentedType(Content content) {
    var txt = content.textSegment();
    if (txt == null) {
      return AugmentedContentType.Unknown;
    }
    var meta = txt.metadata();
    var name = meta.getString(AugmentedSearchMetadataType.contentType);
    if (name == AugmentedSearchMetadataType.KeyPoint.name) {
      return AugmentedContentType.KeyPoint;
    }
    if (name == AugmentedSearchMetadataType.EmailMetadata.name) {
      return AugmentedContentType.EmailMetadata;
    }
    if (meta.containsKey(AugmentedSearchMetadataType.Search.filename)) {
      // Search doesn't have an augmented name; we know how it walks,  so look at how it
      //talks, and quacks next
      if (
        meta.containsKey(AugmentedSearchMetadataType.PolicySearch.id) &&
        meta.containsKey(AugmentedSearchMetadataType.PolicySearch.chapter)
      ) {
        return AugmentedContentType.PolicySearch;
      }
      if (
        meta.containsKey(AugmentedSearchMetadataType.EmailSearch.id) &&
        meta.containsKey(AugmentedSearchMetadataType.EmailSearch.href_api)
      ) {
        return AugmentedContentType.EmailSearch;
      }
    }
    return AugmentedContentType.Unknown;
  }
}
