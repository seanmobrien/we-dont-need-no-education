package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient;
import com.obapps.schoolchatbot.core.assistants.services.IStandaloneModelClient;
import com.obapps.schoolchatbot.core.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.core.assistants.services.PolicyChunkFilter;
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
  void runRealQuery() {
    policyLookup = new JustInTimePolicyLookup();

    String query = "Policy 506";

    String result = policyLookup.summarizePolicy(query);

    System.out.println(result);
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
        AzurePolicySearchClient.ScopeType.SchoolBoard
      )
    ).thenReturn(mockChunks);
    when(mockChunkFilter.filterTopN(mockChunks, 5)).thenReturn(
      mockFilteredChunks
    );
    when(mockSummarizer.call(anyString())).thenReturn(mockSummary);

    String result = policyLookup.summarizePolicy(query, policyType);

    assertEquals(mockSummary, result);
    verify(mockSearchClient).hybridSearch(
      query,
      15,
      AzurePolicySearchClient.ScopeType.SchoolBoard
    );
    verify(mockChunkFilter).filterTopN(mockChunks, 5);
    verify(mockSummarizer).call(anyString());
  }
}
