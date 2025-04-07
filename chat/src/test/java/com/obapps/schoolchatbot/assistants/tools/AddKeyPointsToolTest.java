package com.obapps.schoolchatbot.assistants.tools;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.obapps.schoolchatbot.assistants.DocumentChatAssistant;
import com.obapps.schoolchatbot.assistants.content.AugmentedContentList;
import com.obapps.schoolchatbot.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.data.DocumentWithMetadata;
import com.obapps.schoolchatbot.data.HistoricKeyPoint;
import com.obapps.schoolchatbot.data.KeyPoint;
import com.obapps.schoolchatbot.data.repositories.HistoricKeyPointRepository;
import com.obapps.schoolchatbot.util.Db;
import java.sql.SQLException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

public class AddKeyPointsToolTest {

  private AddKeyPointsTool addKeyPointsTool;
  private DocumentChatAssistant mockAssistant;
  private HistoricKeyPointRepository mockRepository;
  private DocumentWithMetadata mockMessageMetadata;
  private JustInTimePolicyLookup mockJustInTimePolicyLookup;

  @Mock
  Db mockDb;

  @BeforeEach
  public void setUp() throws SQLException {
    mockAssistant = mock(DocumentChatAssistant.class);
    var mockContent = mock(AugmentedContentList.class);
    mockJustInTimePolicyLookup = mock(JustInTimePolicyLookup.class);
    mockMessageMetadata = mock(DocumentWithMetadata.class);
    when(mockContent.getActiveDocument()).thenReturn(mockMessageMetadata);
    when(mockAssistant.getContent()).thenReturn(mockContent);
    mockRepository = mock(HistoricKeyPointRepository.class);
    mockDb = mock(Db.class);
    when(mockRepository.db()).thenReturn(mockDb);
    when(mockMessageMetadata.getDocumentId()).thenReturn(1);
    addKeyPointsTool = new AddKeyPointsTool(
      mockAssistant,
      mockRepository,
      mockJustInTimePolicyLookup
    );
  }

  @Test
  public void testAddKeyPointToDatabase_withValidInput() throws SQLException {
    when(mockMessageMetadata.getDocumentId()).thenReturn(1);

    String result = addKeyPointsTool.addKeyPointToDatabase(
      "Test Key Point",
      85.0,
      90.0,
      5,
      false,
      "Policy A, Policy B",
      "tag1, tag2"
    );

    assertThat(result).isNotNull();
    verify(mockRepository, times(2)).db();
  }

  @Test
  public void testAddKeyPointToDatabase_withNoDocumentId() throws SQLException {
    when(mockMessageMetadata.getDocumentId()).thenReturn(null);

    String result = addKeyPointsTool.addKeyPointToDatabase(
      "Test Key Point",
      85.0,
      90.0,
      5,
      false,
      "Policy A, Policy B",
      "tag1, tag2"
    );

    assertThat(result).isEqualTo("ERROR: No document context available.");
    verify(mockRepository, never()).db();
  }

  @Test
  public void testAddKeyPointToDatabase_withSQLException() throws SQLException {
    when(mockMessageMetadata.getDocumentId()).thenReturn(1);
    doThrow(new SQLException("Database error")).when(mockRepository).db();

    String result = addKeyPointsTool.addKeyPointToDatabase(
      "Test Key Point",
      85.0,
      90.0,
      5,
      false,
      "Policy A, Policy B",
      "tag1, tag2"
    );

    assertThat(result).startsWith("ERROR: ");
    verify(mockRepository, times(2)).db();
  }

  @Test
  public void testSearchForRelatedKeyPoints_withNoMatches()
    throws SQLException {
    when(
      mockRepository.searchForKeyPoints(
        anyString(),
        anyString(),
        anyString(),
        any(),
        anyInt()
      )
    ).thenReturn(null);

    KeyPoint[] result = addKeyPointsTool.searchForRelatedKeyPoints(
      "Policy A",
      "tag1",
      "summary",
      false
    );

    assertThat(result).isEmpty();
    verify(mockRepository, times(1)).searchForKeyPoints(
      anyString(),
      anyString(),
      anyString(),
      any(),
      anyInt()
    );
  }

  @Test
  public void testSearchForRelatedKeyPoints_withMatches() throws SQLException {
    HistoricKeyPoint mockKeyPoint = mock(HistoricKeyPoint.class);
    when(
      mockRepository.searchForKeyPoints(
        anyString(),
        anyString(),
        anyString(),
        any(),
        anyInt()
      )
    ).thenReturn(List.of(mockKeyPoint));

    KeyPoint[] result = addKeyPointsTool.searchForRelatedKeyPoints(
      "Policy A",
      "tag1",
      "summary",
      false
    );

    assertThat(result).hasSize(1);
    assertThat(result[0]).isEqualTo(mockKeyPoint);
    verify(mockRepository, times(1)).searchForKeyPoints(
      anyString(),
      anyString(),
      anyString(),
      any(),
      anyInt()
    );
  }
}
