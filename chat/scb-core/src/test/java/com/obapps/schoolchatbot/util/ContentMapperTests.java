package com.obapps.schoolchatbot.util;

import static org.junit.jupiter.api.Assertions.*;

import com.obapps.schoolchatbot.core.util.ContentMapper;
import dev.langchain4j.data.message.TextContent;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

public class ContentMapperTests {

  @Test
  void testMapFromRagContent_NullSourceContent() {
    var result = ContentMapper.mapFromRagContent(null);
    assertNull(result, "Result should be null when source content is null");
  }

  @Test
  void testMapFromRagContent_WithDefaultValue() {
    var result = ContentMapper.mapFromRagContent(null, "Default Value");
    assertNotNull(
      result,
      "Result should not be null when default value is provided"
    );
    assertEquals(
      "Default Value",
      ((TextContent) result).text(),
      "Default value should be used when source content is null"
    );
  }

  @Test
  void testFromRagContent_NullSourceList() {
    var result = ContentMapper.fromRagContent(null);
    assertNull(result, "Result should be null when source list is null");
  }

  @Test
  void testFromRagContent_EmptySourceList() {
    var result = ContentMapper.fromRagContent(new ArrayList<>());
    assertNotNull(
      result,
      "Result should not be null when source list is empty"
    );
    assertTrue(
      result.isEmpty(),
      "Result should be empty when source list is empty"
    );
  }

  @Test
  void testFromRagContent_WithDefaultValue() {
    List<dev.langchain4j.rag.content.Content> sourceContents =
      new ArrayList<>();
    sourceContents.add(null);
    var result = ContentMapper.fromRagContent(sourceContents, "Default Value");
    assertNotNull(
      result,
      "Result should not be null when default value is provided"
    );
    assertEquals(
      1,
      result.size(),
      "Result should contain one element when source list has one null element"
    );
    assertEquals(
      "Default Value",
      ((TextContent) result.get(0)).text(),
      "Default value should be used for null elements in source list"
    );
  }
}
