package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.azure.AzureOpenAiEmbeddingModel;
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
      var openAiVars = EnvVars.getInstance().getOpenAi();
      this.openAiClient = AzureOpenAiEmbeddingModel.builder()
        .apiKey(openAiVars.getApiKey())
        .endpoint(openAiVars.getApiEndpoint())
        .deploymentName(openAiVars.getDeploymentEmbedding())
        .build();
    } else {
      this.openAiClient = openAiClient;
    }
  }

  private final EmbeddingModel openAiClient;
  private Boolean cacheEmbeddings = true;

  public EmbeddingService setCacheEmbeddings(Boolean cacheEmbeddings) {
    this.cacheEmbeddings = cacheEmbeddings;
    return this;
  }

  private final Map<String, Embedding> embeddingCache =
    new ConcurrentHashMap<>();

  public Embedding embedding(String query) {
    if (!cacheEmbeddings) {
      return getEmbedding(query);
    }
    if (embeddingCache.containsKey(query)) {
      return embeddingCache.get(query);
    }
    return cacheEmbeddings
      ? embeddingCache.computeIfAbsent(query, this::getEmbedding)
      : getEmbedding(query);
  }

  public float[] embed(String query) {
    var embed = embedding(query);
    return embed == null ? null : embed.vector();
  }

  private Embedding getEmbedding(String query) {
    return openAiClient.embed(query).content();
  }
}
