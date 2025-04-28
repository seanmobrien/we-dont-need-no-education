package com.obapps.schoolchatbot.chat.assistants.content;

import com.obapps.schoolchatbot.core.assistants.content.*;
import dev.langchain4j.rag.content.Content;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a list of augmented content with specific types such as CallToAction and KeyPoints.
 */
public class AugmentedContentList extends AugmentedContentListBase {
  /**
   * A static block to initialize augmentor factories for specific content types.
   */
  static {
    AugmentedSearchMetadataType.addAugmentorFactory(
      AugmentedContentType.CallToAction,
      c -> new CallToActionContent(c)
    );
    AugmentedSearchMetadataType.addAugmentorFactory(
      AugmentedContentType.KeyPoint,
      c -> new KeyPointsContent(c)
    );
  }

  /**
   * A list to store CallToActionContent objects.
   */
  public final List<CallToActionContent> CallsToAction = new ArrayList<>();

  /**
   * A list to store KeyPointsContent objects.
   */
  public final List<KeyPointsContent> KeyPoints = new ArrayList<>();

  /**
   * Checks if the current object contains key points.
   *
   * @return {@code true} if the KeyPoints list is not null and not empty,
   *         {@code false} otherwise.
   */
  public Boolean hasKeyPoints() {
    return KeyPoints != null && !KeyPoints.isEmpty();
  }

  /**
   * Adds an item of a specific type to the appropriate list or delegates to the superclass.
   *
   * @param type    The type of the augmented content.
   * @param content The content to be added.
   */
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
      case Attachment:
        Attachments.add((DocumentAttachmentContent) content);
        break;
      default:
        super.addOtherItem(type, content);
        break;
    }
  }

  /**
   * Creates an augmented content object based on the source content and its type.
   *
   * @param source The source content.
   * @param <R>    The type of the augmented content to be created.
   * @return The created augmented content object.
   * @throws IllegalArgumentException if the source is null.
   */
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
