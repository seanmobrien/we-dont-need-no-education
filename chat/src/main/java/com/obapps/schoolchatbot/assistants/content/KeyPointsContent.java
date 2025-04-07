package com.obapps.schoolchatbot.assistants.content;

import com.obapps.schoolchatbot.data.HistoricKeyPoint;
import dev.langchain4j.rag.content.Content;

public class KeyPointsContent extends AugmentedJsonObject<HistoricKeyPoint> {

  public KeyPointsContent(Content source) {
    super(source, HistoricKeyPoint.class);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.KeyPoint;
  }

  public Boolean isFromCurrentDocument() {
    return (
      meta.getInteger(AugmentedSearchMetadataType.KeyPoint.current_document) ==
      1
    );
  }
}
// Removed EmailMetadataContent class to place it in its own file.
