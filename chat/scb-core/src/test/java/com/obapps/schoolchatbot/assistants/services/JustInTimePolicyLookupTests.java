package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.ai.factory.types.IStandaloneModelClient;
import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;
import com.obapps.schoolchatbot.core.assistants.models.search.AiSearchResult;
import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient;
import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient.ScopeType;
import com.obapps.schoolchatbot.core.assistants.services.AzureSearchClient;
import com.obapps.schoolchatbot.core.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.core.assistants.services.PolicyChunkFilter;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimePolicyLookupTests {

  private AzurePolicySearchClient mockSearchClient;
  private IStandaloneModelClient mockSummarizer;
  private PolicyChunkFilter mockChunkFilter;
  private JustInTimePolicyLookup policyLookup;
  private IDocumentContentSource mockContentSource;

  @BeforeEach
  void setUp() {
    mockContentSource = mock(IDocumentContentSource.class);

    mockSearchClient = mock(AzurePolicySearchClient.class);
    mockSummarizer = mock(IStandaloneModelClient.class);
    mockChunkFilter = mock(PolicyChunkFilter.class);
    ILanguageModelFactory mockFactory = null;
    policyLookup = new JustInTimePolicyLookup(
      mockContentSource,
      mockSearchClient,
      mockFactory,
      mockChunkFilter
    );
    realTestsEnabled = false;
  }

  private Boolean realTestsEnabled = false;

  @Test
  void testSummarizePolicy() {
    String query = "Test policy query";
    AzurePolicySearchClient.ScopeType policyType =
      AzurePolicySearchClient.ScopeType.SchoolBoard;
    List<AiSearchResult> mockChunks = Arrays.asList(
      AiSearchResult.builder().content("Chunk 1").score(.9).build(),
      AiSearchResult.builder().content("Chunk 2").score(.8).build(),
      AiSearchResult.builder().content("Chunk 3").score(.7).build()
    );
    List<String> mockFilteredChunks = Arrays.asList(
      "Policy Chunk 1",
      "Policy Chunk 2"
    );
    String mockSummary =
      """
      🔍 Result [1]
      Policy Chunk 1

      🔍 Result [2]
      Policy Chunk 2

      🔍 Result [3]
      Policy Chunk 3

      """;

    when(mockSearchClient.hybridSearchEx(eq(query), eq(10), any())).thenReturn(
      mockChunks
    );
    String result = policyLookup.summarizePolicy(query, policyType);

    assertTrue(result.contains("_#_Hit #0-1_#_"));
    assertTrue(result.contains("_#_Hit #1-1_#_"));
    assertTrue(result.contains("_#_Hit #2-1_#_"));
    verify(mockSearchClient).hybridSearchEx(query, 10, policyType);
    // verify(mockSummarizer).call(anyString());
  }
}
