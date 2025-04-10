package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimePolicyLookupTests {

  private AzurePolicySearchClient mockSearchClient;
  private IStandaloneModelClient mockSummarizer;
  private PolicyChunkFilter mockChunkFilter;
  private JustInTimePolicyLookup policyLookup;

  @BeforeEach
  void setUp() {
    mockSearchClient = mock(AzurePolicySearchClient.class);
    mockSummarizer = mock(IStandaloneModelClient.class);
    mockChunkFilter = mock(PolicyChunkFilter.class);
    policyLookup = new JustInTimePolicyLookup(
      mockSearchClient,
      mockSummarizer,
      mockChunkFilter
    );
  }

  @Test
  void testSummarizePolicy() {
    String query = "Test policy query";
    AzurePolicySearchClient.ScopeType policyType =
      AzurePolicySearchClient.ScopeType.SchoolBoard;
    List<String> mockChunks = Arrays.asList(
      "Policy Chunk 1",
      "Policy Chunk 2",
      "Policy Chunk 3"
    );
    List<String> mockFilteredChunks = Arrays.asList(
      "Policy Chunk 1",
      "Policy Chunk 2"
    );
    String mockSummary = "Mock policy summary.";

    when(
      mockSearchClient.hybridSearch(
        query,
        15,
        AzurePolicySearchClient.ScopeType.Federal
      )
    ).thenReturn(mockChunks);
    when(mockChunkFilter.filterTopPolicyChunks(mockChunks, 5)).thenReturn(
      mockFilteredChunks
    );
    when(mockSummarizer.call(anyString())).thenReturn(mockSummary);

    String result = policyLookup.summarizePolicy(query, policyType);

    assertEquals(mockSummary, result);
    verify(mockSearchClient).hybridSearch(
      query,
      15,
      AzurePolicySearchClient.ScopeType.Federal
    );
    verify(mockChunkFilter).filterTopPolicyChunks(mockChunks, 5);
    verify(mockSummarizer).call(anyString());
  }
}
