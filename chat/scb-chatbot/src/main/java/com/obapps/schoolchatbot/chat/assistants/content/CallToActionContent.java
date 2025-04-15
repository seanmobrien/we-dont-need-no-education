package com.obapps.schoolchatbot.chat.assistants.content;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentType;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedJsonObject;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.models.HistoricCallToAction;
import dev.langchain4j.rag.content.Content;

public class CallToActionContent
  extends AugmentedJsonObject<HistoricCallToAction> {

  public CallToActionContent(Content source) {
    super(source, HistoricCallToAction.class);
  }

  @Override
  public AugmentedContentType getType() {
    return AugmentedContentType.CallToAction;
  }

  public Boolean isFromCurrentDocument() {
    return (
      meta
        .getInteger(AugmentedSearchMetadataType.CallToAction.current_document)
        .equals(1)
    );
  }
}
