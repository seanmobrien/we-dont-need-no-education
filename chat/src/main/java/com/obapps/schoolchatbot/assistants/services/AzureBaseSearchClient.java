package com.obapps.schoolchatbot.assistants.services;

import com.obapps.schoolchatbot.util.EnvVars;
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;
import java.time.Duration;
import java.util.*;
import org.json.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public abstract class AzureBaseSearchClient<TScope> {

  protected final EnvVars envVars;
  protected final Logger log;
  protected final EmbeddingService embeddingService;
  private final TScope defaultScope;
  protected final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();

  protected AzureBaseSearchClient(
    EnvVars environment,
    EmbeddingService embeddingService,
    TScope defaultScope
  ) {
    this.defaultScope = defaultScope;
    this.envVars = environment == null ? EnvVars.getInstance() : environment;
    this.embeddingService = embeddingService == null
      ? new EmbeddingService()
      : embeddingService;
    log = LoggerFactory.getLogger(this.getClass());
  }

  protected abstract String getSearchIndexName();

  protected String getServiceUrl() {
    return String.format(
      "%s/indexes/%s/docs/search?api-version=2024-11-01-preview",
      envVars.getOpenAi().getSearchApiEndpoint(),
      getSearchIndexName()
    );
  }

  protected abstract void appendScopeFilter(
    JSONObject payload,
    TScope policyTypeId
  );

  public List<String> semanticSearch(String query, int topK) {
    return semanticSearch(query, topK, defaultScope);
  }

  public List<String> semanticSearch(
    String query,
    int topK,
    TScope policyTypeId
  ) {
    try {
      String url = getServiceUrl();
      JSONObject payload = new JSONObject();
      payload.put("search", query);
      payload.put("top", topK);
      payload.put("queryType", "semantic");
      payload.put("semanticConfiguration", "semantic-search-config");
      payload.put("select", "content");
      payload.put("queryLanguage", "en-us");
      appendScopeFilter(payload, policyTypeId);

      HttpRequest request = HttpRequest.newBuilder()
        .uri(new URI(url))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("api-key", envVars.getOpenAi().getSearchApiKey())
        .POST(BodyPublishers.ofString(payload.toString()))
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      JSONObject json = new JSONObject(response.body());
      JSONArray results = json.getJSONArray("value");

      List<String> contentChunks = new ArrayList<>();
      for (int i = 0; i < results.length(); i++) {
        JSONObject doc = results.getJSONObject(i);
        contentChunks.add(doc.getString("content"));
      }

      return contentChunks;
    } catch (Exception e) {
      log.error("Search failed for query [{}]: {}", query, e.getMessage());
      return Collections.emptyList();
    }
  }

  public List<String> hybridSearch(String naturalQuery, Integer topK) {
    return hybridSearch(naturalQuery, null, topK, defaultScope);
  }

  public List<String> hybridSearch(
    String naturalQuery,
    Integer topK,
    TScope policyTypeId
  ) {
    return hybridSearch(naturalQuery, null, topK, policyTypeId);
  }

  public List<String> hybridSearch(
    String naturalQuery,
    float[] embeddingVector,
    Integer topK
  ) {
    return hybridSearch(naturalQuery, embeddingVector, topK, defaultScope);
  }

  public List<String> hybridSearch(
    String naturalQuery,
    float[] embeddingVector,
    TScope policyTypeId
  ) {
    return hybridSearch(naturalQuery, embeddingVector, 15, policyTypeId);
  }

  public List<String> hybridSearch(
    String naturalQuery,
    float[] embeddingVector,
    Integer topK,
    TScope policyTypeId
  ) {
    try {
      String url = getServiceUrl();
      if (embeddingVector == null || embeddingVector.length == 0) {
        embeddingVector = this.embeddingService.embed(naturalQuery);
      }
      JSONObject vectorBlock = new JSONObject();
      vectorBlock.put("value", new JSONArray(embeddingVector));
      vectorBlock.put("fields", "content_vector");
      vectorBlock.put("k", topK);
      vectorBlock.put("profile", "vector-search-profile");

      JSONObject payload = new JSONObject();
      payload.put("search", naturalQuery);
      payload.put("vector", vectorBlock);
      payload.put("top", topK);
      payload.put("queryType", "semantic");
      payload.put("semanticConfiguration", "semantic-search-config");
      payload.put("select", "content");

      appendScopeFilter(payload, policyTypeId);

      HttpRequest request = HttpRequest.newBuilder()
        .uri(new URI(url))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("api-key", envVars.getOpenAi().getSearchApiKey())
        .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      JSONObject json = new JSONObject(response.body());
      JSONArray results = json.getJSONArray("value");

      List<String> contentChunks = new ArrayList<>();
      for (int i = 0; i < results.length(); i++) {
        JSONObject doc = results.getJSONObject(i);
        contentChunks.add(doc.getString("content"));
      }

      return contentChunks;
    } catch (Exception e) {
      log.error(
        "Hybrid search failed for query [{}]: {}",
        naturalQuery,
        e.getMessage()
      );
      return Collections.emptyList();
    }
  }
}
