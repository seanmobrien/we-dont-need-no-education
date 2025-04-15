package com.obapps.schoolchatbot.core.assistants.services;

import dev.langchain4j.model.embedding.EmbeddingModel;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class EmbeddingService {

  public EmbeddingService() {
    this(null);
  }

  public EmbeddingService(EmbeddingModel openAiClient) {
    super();
    if (openAiClient == null) {
      this.openAiClient = new StandaloneModelClientFactory()
        .createEmbeddingClient();
      /*
      var openAiVars = EnvVars.getInstance().getOpenAi();
      this.openAiClient = AzureOpenAiEmbeddingModel.builder()
        .apiKey(openAiVars.getApiKey())
        .endpoint(openAiVars.getApiEndpoint())
        .deploymentName(openAiVars.getDeploymentEmbedding())
        .build();
      */
    } else {
      this.openAiClient = openAiClient;
    }
  }

  private final EmbeddingModel openAiClient;

  private final Map<String, float[]> embeddingCache = new ConcurrentHashMap<>();

  public float[] embed(String query) {
    return embeddingCache.computeIfAbsent(query, this::callEmbeddingApi);
  }

  private float[] callEmbeddingApi(String query) {
    return openAiClient.embed(query).content().vector();
  }
}
