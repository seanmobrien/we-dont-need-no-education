package com.obapps.schoolchatbot.assistants.content;

import dev.langchain4j.rag.content.Content;

public abstract class AugmentedSearchContent extends AugmentedContent {

  public AugmentedSearchContent(Content source) {
    super(source);
  }

  public String getFilename() {
    return meta.getString(AugmentedSearchMetadataType.Search.filename);
  }
}
// Removed AugmentedPolicySearch class to place it in its own file.
// Removed AugmentedEmailSearch class to place it in its own file.
