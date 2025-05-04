package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.schoolchatbot.core.assistants.models.search.AiSearchResult;
import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient;
import com.obapps.schoolchatbot.core.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.core.assistants.services.PolicyChunkFilter;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimePolicyLookupTests {

  private AzurePolicySearchClient mockSearchClient;
  private PolicyChunkFilter mockChunkFilter;
  private JustInTimePolicyLookup policyLookup;
  private IDocumentContentSource mockContentSource;

  @BeforeEach
  void setUp() {
    mockContentSource = mock(IDocumentContentSource.class);

    mockSearchClient = mock(AzurePolicySearchClient.class);
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

  @SuppressWarnings("unused")
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
