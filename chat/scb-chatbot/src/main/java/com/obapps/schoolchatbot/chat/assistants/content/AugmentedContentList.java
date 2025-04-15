package com.obapps.schoolchatbot.chat.assistants.content;

import com.obapps.schoolchatbot.core.assistants.content.*;
import dev.langchain4j.rag.content.Content;
import java.util.ArrayList;
import java.util.List;

public class AugmentedContentList extends AugmentedContentListBase {

  public final List<CallToActionContent> CallsToAction = new ArrayList<
    CallToActionContent
  >();
  public final List<KeyPointsContent> KeyPoints = new ArrayList<
    KeyPointsContent
  >();

  /**
   * Checks if the current object contains key points.
   *
   * @return {@code true} if the KeyPoints list is not null and not empty,
   *         {@code false} otherwise.
   */
  public Boolean hasKeyPoints() {
    return KeyPoints != null && !KeyPoints.isEmpty();
  }

  @Override
  protected void addOtherItem(
    AugmentedContentType type,
    AugmentedContent content
  ) {
    switch (type) {
      case KeyPoint:
        KeyPoints.add((KeyPointsContent) content);
        break;
      case CallToAction:
        CallsToAction.add((CallToActionContent) content);
        break;
      default:
        super.addOtherItem(type, content);
        break;
    }
  }

  @SuppressWarnings("unchecked")
  public static <R extends AugmentedContent> R createAugmentedContent(
    Content source
  ) {
    if (source == null) {
      throw new IllegalArgumentException("source cannot be null");
    }
    switch (AugmentedContent.getAugmentedType(source)) {
      case KeyPoint:
        return (R) new KeyPointsContent(source);
      case EmailMetadata:
        return (R) new DocumentWithMetadataContent(source);
      case EmailSearch:
        return (R) new AugmentedEmailSearch(source);
      case PolicySearch:
        return (R) new AugmentedPolicySearch(source);
      case CallToAction:
        return (R) new CallToActionContent(source);
      default:
        return (R) new GenericAugmentedContent(source);
    }
  }
}
