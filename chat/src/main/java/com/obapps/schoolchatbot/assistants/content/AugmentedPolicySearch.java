package com.obapps.schoolchatbot.assistants.content;

import dev.langchain4j.rag.content.Content;

public class AugmentedPolicySearch extends AugmentedSearchContent {

  public AugmentedPolicySearch(Content source) {
    super(source);
  }

  public String getChapter() {
    return meta.getString(AugmentedSearchMetadataType.PolicySearch.chapter);
  }

  public String getId() {
    return meta.getString(AugmentedSearchMetadataType.PolicySearch.id);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.PolicySearch;
  }
}
