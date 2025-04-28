package com.obapps.schoolchatbot.core.models;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.obapps.core.util.Db;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the CallToActionCategory class.
 */
public class CallToActionCategoryTest {

  private Db mockDb;
  private CallToActionCategory category;

  @BeforeEach
  void setUp() {
    mockDb = mock(Db.class);
    category = new CallToActionCategory();
    category.setCtaCategoryId(UUID.randomUUID());
    category.setCategoryName("Test Category");
    category.setCategoryDescription("Test Description");
    category.setCtaCategoryTextEmbedding(new float[] { 0.1f, 0.2f, 0.3f });
    category.setCtaCategoryTextEmbeddingModel("Test Model");
  }

  @Test
  void testSaveToDb() throws SQLException {
    when(mockDb.executeUpdate(anyString(), any())).thenReturn(1);

    category.saveToDb(mockDb);

    verify(mockDb, times(1)).executeUpdate(anyString(), any());
  }

  @Test
  void testUpdateDb() throws SQLException {
    when(mockDb.executeUpdate(anyString(), any())).thenReturn(1);

    category.updateDb(mockDb);

    verify(mockDb, times(1)).executeUpdate(anyString(), any());
  }

  @Test
  void testLoadFromDb() throws SQLException {
    UUID id = category.getCtaCategoryId();
    when(
      mockDb.selectObjects(eq(CallToActionCategory.class), anyString(), eq(id))
    ).thenReturn(List.of(category));

    CallToActionCategory loadedCategory = CallToActionCategory.loadFromDb(
      mockDb,
      id
    );

    assertNotNull(loadedCategory);
    assertEquals("Test Category", loadedCategory.getCategoryName());
  }

  @Test
  void testLoadAll() throws SQLException {
    when(
      mockDb.selectObjects(eq(CallToActionCategory.class), anyString())
    ).thenReturn(List.of(category));

    List<CallToActionCategory> categories = CallToActionCategory.loadAll(
      mockDb
    );

    assertNotNull(categories);
    assertEquals(1, categories.size());
  }

  @Test
  void testDeleteFromDb() throws SQLException {
    when(mockDb.executeUpdate(anyString(), any())).thenReturn(1);

    category.deleteFromDb(mockDb);

    verify(mockDb, times(1)).executeUpdate(anyString(), any());
  }
}
