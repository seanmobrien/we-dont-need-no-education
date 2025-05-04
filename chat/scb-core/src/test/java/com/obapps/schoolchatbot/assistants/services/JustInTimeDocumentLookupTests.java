package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.ai.factory.types.IStandaloneModelClient;
import com.obapps.schoolchatbot.core.assistants.models.search.AiSearchResult;
import com.obapps.schoolchatbot.core.assistants.services.AzureSearchClient;
import com.obapps.schoolchatbot.core.assistants.services.DocumentChunkFilter;
import com.obapps.schoolchatbot.core.assistants.services.JustInTimeDocumentLookup;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimeDocumentLookupTests {

  private AzureSearchClient mockSearchClient;
  private IStandaloneModelClient mockSummarizer;
  private DocumentChunkFilter mockChunkFilter;
  private JustInTimeDocumentLookup documentLookup;
  private IDocumentContentSource mockDocumentSource;

  @BeforeEach
  void setUp() {
    mockDocumentSource = mock(IDocumentContentSource.class);
    mockSearchClient = mock(AzureSearchClient.class);
    mockSummarizer = mock(IStandaloneModelClient.class);
    ILanguageModelFactory mockFactory = mock(ILanguageModelFactory.class);
    mockChunkFilter = mock(DocumentChunkFilter.class);
    documentLookup = new JustInTimeDocumentLookup(
      mockDocumentSource,
      mockSearchClient,
      mockFactory,
      mockChunkFilter
    );
  }

  @Test
  void testSummarizeDocument() {
    String query = "Test query";
    List<AiSearchResult> mockChunks = Arrays.asList(
      AiSearchResult.builder().content("Chunk 1").score(.9).build(),
      AiSearchResult.builder().content("Chunk 2").score(.8).build(),
      AiSearchResult.builder().content("Chunk 3").score(.7).build()
    );

    when(
      mockSearchClient.hybridSearchEx(
        query,
        10,
        AzureSearchClient.ScopeType.All
      )
    ).thenReturn(mockChunks);

    String result = documentLookup.summarizeDocument(query);

    assertTrue(result.contains("_#_Hit #0-1_#_"));
    assertTrue(result.contains("_#_Hit #1-1_#_"));
    assertTrue(result.contains("_#_Hit #2-1_#_"));
    verify(mockSearchClient).hybridSearchEx(
      query,
      10,
      AzureSearchClient.ScopeType.All
    );
  }
}
