package com.obapps.schoolchatbot.assistants.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.obapps.schoolchatbot.util.EnvVars;
import java.net.http.HttpClient;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

// filepath: c:\Users\seanm\source\repos\NoEducation\chat\src\test\java\com\obapps\schoolchatbot\assistants\services\AzurePolicySearchClientTest.java

public class AzurePolicySearchClientTest {

  @Mock
  private EnvVars mockEnvVars;

  @Mock
  private EmbeddingService mockEmbeddingService;

  @Mock
  private HttpClient mockHttpClient;

  private AzurePolicySearchClient client;

  @BeforeEach
  public void setUp() {
    MockitoAnnotations.openMocks(this);
    client = new AzurePolicySearchClient(mockEnvVars, mockEmbeddingService);
    client = new AzurePolicySearchClient();
  }

  @Test
  public void testHybridSearch_withValidInputs() {
    // Arrange
    String query = "school policy";
    float[] embedding = { 0.1f, 0.2f, 0.3f };
    int topK = 5;
    when(mockEmbeddingService.embed(query)).thenReturn(embedding);

    // Act
    List<String> results = client.hybridSearch(query, embedding, topK);

    // Assert
    assertThat(results).isNotNull();
    // Additional assertions can be added based on expected behavior
  }

  @Test
  public void testHybridSearch_withEmptyQuery() {
    // Arrange
    String query = "";
    float[] embedding = { 0.1f, 0.2f, 0.3f };
    int topK = 5;

    // Act
    List<String> results = client.hybridSearch(query, embedding, topK);

    // Assert
    assertThat(results).isEmpty();
  }

  @Test
  public void testHybridSearch_withNullEmbedding() {
    // Arrange
    String query = "school policy";
    float[] embedding = null;
    int topK = 5;

    // Act
    List<String> results = client.hybridSearch(query, embedding, topK);

    // Assert
    assertThat(results).isEmpty();
  }

  @Test
  public void testHybridSearch_withPolicyTypeId() {
    // Arrange
    String query = "school policy";
    float[] embedding = { 0.1f, 0.2f, 0.3f };
    int topK = 5;
    int policyTypeId = 1;
    when(mockEmbeddingService.embed(query)).thenReturn(embedding);

    // Act
    List<String> results = client.hybridSearch(
      query,
      embedding,
      topK,
      policyTypeId
    );

    // Assert
    assertThat(results).isNotNull();
    // Additional assertions can be added based on expected behavior
  }

  @Test
  public void testHybridSearch_withInvalidPolicyTypeId() {
    // Arrange
    String query = "school policy";
    float[] embedding = { 0.1f, 0.2f, 0.3f };
    int topK = 5;
    int policyTypeId = -1;
    when(mockEmbeddingService.embed(query)).thenReturn(embedding);

    // Act
    List<String> results = client.hybridSearch(
      query,
      embedding,
      topK,
      policyTypeId
    );

    // Assert
    assertThat(results).isNotNull();
    // Additional assertions can be added based on expected behavior
  }
}
