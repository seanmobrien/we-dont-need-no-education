package com.obapps.schoolchatbot.assistants.content;

import com.obapps.schoolchatbot.data.KeyPoint;
import dev.langchain4j.rag.content.Content;

public class KeyPointsContent extends AugmentedJsonObject<KeyPoint> {

  public KeyPointsContent(Content source) {
    super(source, KeyPoint.class);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.KeyPoint;
  }
}
// Removed EmailMetadataContent class to place it in its own file.
