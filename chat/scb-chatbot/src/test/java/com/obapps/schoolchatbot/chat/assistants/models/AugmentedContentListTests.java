package com.obapps.schoolchatbot.chat.assistants.models;

import static org.junit.jupiter.api.Assertions.*;

import com.obapps.schoolchatbot.chat.assistants.content.*;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContent;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentListBase;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentType;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;
import com.obapps.schoolchatbot.core.assistants.content.GenericAugmentedContent;
import dev.langchain4j.rag.content.Content;
import java.util.Map;
import org.junit.jupiter.api.Test;

public class AugmentedContentListTests {

  Content mockContent(String text) {
    return mockContent(text, null);
  }

  Content mockContentForType(String text, String type) {
    return mockContent(
      text,
      Map.of(AugmentedSearchMetadataType.contentType, type)
    );
  }

  Content mockContent(String text, Map<String, Object> metadata) {
    var meta = metadata == null
      ? null
      : dev.langchain4j.data.document.Metadata.from(metadata);
    return Content.from(
      meta == null
        ? dev.langchain4j.data.segment.TextSegment.from(text)
        : dev.langchain4j.data.segment.TextSegment.from(text, meta)
    );
  }

  @Test
  public void testAddKeyPointsContent() {
    AugmentedContentList list = new AugmentedContentList();
    KeyPointsContent keyPoint = new KeyPointsContent(mockContent("KeyPoint"));
    list.add(keyPoint);

    assertTrue(list.hasKeyPoints());
    assertEquals(1, list.KeyPoints.size());
    assertEquals(keyPoint, list.KeyPoints.get(0));
  }

  @Test
  public void testAddCallToActionContent() {
    AugmentedContentList list = new AugmentedContentList();
    CallToActionContent callToAction = new CallToActionContent(
      mockContent("CallToAction")
    );
    list.add(callToAction);

    assertEquals(1, list.CallsToAction.size());
    assertEquals(callToAction, list.CallsToAction.get(0));
  }

  @Test
  public void testCreateAugmentedContent() {
    Content source = mockContentForType(
      "KeyPoint",
      AugmentedSearchMetadataType.KeyPoint.name
    );
    KeyPointsContent keyPoint = AugmentedContentList.createAugmentedContent(
      source
    );

    assertNotNull(keyPoint);
    assertEquals(AugmentedContentType.KeyPoint, keyPoint.getType());
  }

  @Test
  public void testAddOtherItem() {
    AugmentedContentListBase baseList = new AugmentedContentListBase();
    AugmentedContent otherContent = new GenericAugmentedContent(
      mockContent("Other")
    );
    baseList.add(otherContent);

    assertEquals(1, baseList.Other.size());
    assertEquals(otherContent, baseList.Other.get(0));
  }

  @Test
  public void testGetActiveDocumentContent() {
    AugmentedContentListBase baseList = new AugmentedContentListBase();
    DocumentWithMetadataContent document = new DocumentWithMetadataContent(
      mockContentForType(
        "EmailMetadata",
        AugmentedSearchMetadataType.EmailMetadata.name
      )
    );
    var replyTo = new DocumentWithMetadataContent(
      mockContentForType(
        "ReplyTo",
        AugmentedSearchMetadataType.EmailMetadata.name + "/ReplyTo"
      )
    );
    baseList.EmailMetadata.add(document);
    baseList.EmailMetadata.add(replyTo);

    assertEquals(document, baseList.getActiveDocumentContent());
  }

  @Test
  public void testGetReplyToDocumentContent() {
    AugmentedContentListBase baseList = new AugmentedContentListBase();
    DocumentWithMetadataContent document = new DocumentWithMetadataContent(
      mockContentForType(
        "EmailMetadata",
        AugmentedSearchMetadataType.EmailMetadata.name
      )
    );
    var replyTo = new DocumentWithMetadataContent(
      mockContentForType(
        "ReplyTo",
        AugmentedSearchMetadataType.EmailMetadata.name + "/reply-to"
      )
    );
    baseList.EmailMetadata.add(document);
    baseList.EmailMetadata.add(replyTo);

    assertEquals(replyTo, baseList.getReplyToDocumentContent());
  }
}
