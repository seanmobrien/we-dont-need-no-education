package com.obapps.schoolchatbot.assistants.content;

import dev.langchain4j.rag.content.Content;

public class GenericAugmentedContent extends AugmentedContent {

  public GenericAugmentedContent(Content source) {
    super(source);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.Unknown;
  }
}
