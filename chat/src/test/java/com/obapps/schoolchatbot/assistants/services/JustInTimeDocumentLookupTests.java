package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimeDocumentLookupTests {

  private AzureSearchClient mockSearchClient;
  private IStandaloneModelClient mockSummarizer;
  private DocumentChunkFilter mockChunkFilter;
  private JustInTimeDocumentLookup documentLookup;

  @BeforeEach
  void setUp() {
    mockSearchClient = mock(AzureSearchClient.class);
    mockSummarizer = mock(IStandaloneModelClient.class);
    mockChunkFilter = mock(DocumentChunkFilter.class);
    documentLookup = new JustInTimeDocumentLookup(
      mockSearchClient,
      mockSummarizer,
      mockChunkFilter
    );
  }

  @Test
  void testSummarizeDocument() {
    String query = "Test query";
    List<String> mockChunks = Arrays.asList("Chunk 1", "Chunk 2", "Chunk 3");
    List<String> mockFilteredChunks = Arrays.asList("Chunk 1", "Chunk 2");
    String mockSummary = "Mock summary.";

    when(mockSearchClient.hybridSearch(query, 15)).thenReturn(mockChunks);
    when(mockChunkFilter.filterTopDocumentChunks(mockChunks, 5)).thenReturn(
      mockFilteredChunks
    );
    when(mockSummarizer.call(anyString())).thenReturn(mockSummary);

    String result = documentLookup.summarizeDocument(query);

    assertEquals(mockSummary, result);
    verify(mockSearchClient).hybridSearch(query, 15);
    verify(mockChunkFilter).filterTopDocumentChunks(mockChunks, 5);
    verify(mockSummarizer).call(anyString());
  }
}
