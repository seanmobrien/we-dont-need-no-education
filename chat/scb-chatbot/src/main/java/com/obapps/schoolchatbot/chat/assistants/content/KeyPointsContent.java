package com.obapps.schoolchatbot.chat.assistants.content;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentType;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedJsonObject;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.models.HistoricKeyPoint;
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
