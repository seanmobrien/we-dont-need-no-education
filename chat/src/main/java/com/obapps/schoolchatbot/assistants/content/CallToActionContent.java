package com.obapps.schoolchatbot.assistants.content;

import com.obapps.schoolchatbot.data.HistoricCallToAction;
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
      meta.getInteger(
        AugmentedSearchMetadataType.CallToAction.current_document
      ) ==
      1
    );
  }
}
