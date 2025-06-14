package com.obapps.schoolchatbot.core.assistants.content;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.rag.content.Content;
import java.util.List;
import java.util.Objects;

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

  public Boolean isIdMatch(String id) {
    return isMetaMatch(source, "id", id);
  }

  public Boolean isIdMatch(List<String> id) {
    return isMetaMatch(source, "id", id);
  }

  protected String getMetaString(String key) {
    return getMetaString(key, null);
  }

  protected String getMetaString(String key, String defaultValue) {
    var segment = source.textSegment();
    if (segment == null) {
      return defaultValue;
    }
    var meta = segment.metadata();
    if (meta == null || !meta.containsKey(key)) {
      return defaultValue;
    }
    return meta.getString(key);
  }

  public String getAugmentSubContentType() {
    var fullType = getMetaString(AugmentedSearchMetadataType.contentType);
    if (fullType == null) {
      return "";
    }
    var idx = fullType.indexOf("/");
    return idx < 0 ? "" : fullType.substring(idx + 1);
  }

  public static Boolean isMetaMatch(
    Content content,
    String key,
    List<String> value
  ) {
    var txt = content.textSegment();
    if (txt == null) {
      return false;
    }
    var meta = txt.metadata();
    if (meta == null) {
      return false;
    }
    if (!meta.containsKey(key)) {
      return false;
    }
    var metaValue = meta.getString(key);
    return (
      value != null &&
      value.stream().anyMatch(v -> v.equalsIgnoreCase(metaValue.toString()))
    );
  }

  public static Boolean isMetaMatch(Content content, String key, String value) {
    var txt = content.textSegment();
    if (txt == null) {
      return false;
    }
    var meta = txt.metadata();
    if (meta == null) {
      return false;
    }
    if (!meta.containsKey(key)) {
      return false;
    }
    var metaValue = meta.getString(key);
    return metaValue != null && metaValue.toString().equalsIgnoreCase(value);
  }

  public static AugmentedContentType getAugmentedType(Content content) {
    var txt = content.textSegment();
    if (txt == null) {
      return AugmentedContentType.Unknown;
    }
    var meta = txt.metadata();
    var name = meta.getString(AugmentedSearchMetadataType.contentType);
    var subTypeDesignator = Objects.requireNonNullElse(name, "").indexOf("/");
    if (subTypeDesignator > 0) {
      name = name.substring(0, subTypeDesignator);
    }

    switch (name) {
      case AugmentedSearchMetadataType.KeyPoint.name:
        return AugmentedContentType.KeyPoint;
      case AugmentedSearchMetadataType.EmailMetadata.name:
        return AugmentedContentType.EmailMetadata;
      case AugmentedSearchMetadataType.CallToAction.name:
        return AugmentedContentType.CallToAction;
      case AugmentedSearchMetadataType.EmailAttachment.name:
        return AugmentedContentType.Attachment;
    }
    if (meta.containsKey(AugmentedSearchMetadataType.Search.filename)) {
      // Search doesn't have an augmented name; we know how it walks,  so look at how it
      // talks, and quacks next
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
