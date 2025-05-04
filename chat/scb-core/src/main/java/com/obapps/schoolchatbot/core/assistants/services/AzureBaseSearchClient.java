package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.assistants.models.search.AiSearchResult;
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

  protected String getSearchApiVersion() {
    return "2025-03-01-preview";
  }

  protected String getServiceUrl() {
    var searchEndpoint = envVars.getOpenAi().getSearchApiEndpoint();
    if (searchEndpoint.endsWith("/")) {
      searchEndpoint = searchEndpoint.substring(0, searchEndpoint.length() - 1);
    }
    return String.format(
      "%s/indexes/%s/docs/search?api-version=%s",
      //"%s/indexes/%s/docs/search?api-version=2024-07-01",
      searchEndpoint,
      getSearchIndexName(),
      getSearchApiVersion()
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
    String serviceResponse = null;
    String url = getServiceUrl();
    try {
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
        .timeout(Duration.ofSeconds(60))
        .header("Content-Type", "application/json")
        .header("api-key", envVars.getOpenAi().getSearchApiKey())
        .POST(BodyPublishers.ofString(payload.toString()))
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      return parseResponse(response, query, topK, policyTypeId)
        .stream()
        .map(AiSearchResult::getContent)
        .toList();
    } catch (Exception e) {
      log.error(
        "Search failed for query [{}] top: [{}] filter: [{}]: {}\nURL: {}\nBody{}",
        query,
        topK,
        policyTypeId,
        url,
        e.getMessage(),
        Objects.requireNonNullElse(serviceResponse, "[Null Response]")
      );
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
    var results = hybridSearchEx(
      naturalQuery,
      embeddingVector,
      topK,
      policyTypeId
    );
    return results.stream().map(AiSearchResult::getContent).toList();
  }

  public List<AiSearchResult> hybridSearchEx(
    String naturalQuery,
    Integer topK
  ) {
    return hybridSearchEx(naturalQuery, null, topK, defaultScope);
  }

  public List<AiSearchResult> hybridSearchEx(
    String naturalQuery,
    Integer topK,
    TScope policyTypeId
  ) {
    return hybridSearchEx(naturalQuery, null, topK, policyTypeId);
  }

  public List<AiSearchResult> hybridSearchEx(
    String naturalQuery,
    float[] embeddingVector,
    Integer topK
  ) {
    return hybridSearchEx(naturalQuery, embeddingVector, topK, defaultScope);
  }

  public List<AiSearchResult> hybridSearchEx(
    String naturalQuery,
    float[] embeddingVector,
    TScope policyTypeId
  ) {
    return hybridSearchEx(naturalQuery, embeddingVector, 15, policyTypeId);
  }

  public List<AiSearchResult> hybridSearchEx(
    String naturalQuery,
    float[] embeddingVector,
    Integer topK,
    TScope policyTypeId
  ) {
    String url = getServiceUrl();
    String serviceResponse = null;
    JSONObject payload = new JSONObject();
    try {
      if (embeddingVector == null || embeddingVector.length == 0) {
        embeddingVector = this.embeddingService.embed(naturalQuery);
      }

      JSONObject vectorBlock = new JSONObject();
      vectorBlock.put("vector", new JSONArray(embeddingVector));
      vectorBlock.put("kind", "vector");
      vectorBlock.put("fields", "content_vector");
      vectorBlock.put("k", topK);
      vectorBlock.put("exhaustive", true);

      JSONArray vectors = new JSONArray();
      vectors.put(vectorBlock);

      payload.put("search", naturalQuery); // hybrid search with keyword/semantic weight
      payload.put("vectorQueries", vectors);
      payload.put("top", topK);
      payload.put("queryType", "semantic");
      payload.put("semanticConfiguration", "semantic-search-config");

      // Select desired fields
      payload.put("select", "content,id,metadata");
      appendScopeFilter(payload, policyTypeId);
      HttpRequest request = HttpRequest.newBuilder()
        .uri(new URI(url))
        .timeout(Duration.ofSeconds(600))
        .header("Content-Type", "application/json")
        .header("api-key", envVars.getOpenAi().getSearchApiKey())
        .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );
      return parseResponse(response, naturalQuery, topK, policyTypeId);
    } catch (Exception e) {
      System.out.println(serviceResponse);
      log.error(
        "Search failed for query [{}] top: [{}] filter: [{}]: {}\nURL: {}\nBody{}\nPayload: {}",
        naturalQuery,
        topK,
        policyTypeId,
        url,
        e.getMessage(),
        Objects.requireNonNullElse(serviceResponse, "[Null Response]"),
        payload.toString()
      );
      return Collections.emptyList();
    }
  }

  protected List<AiSearchResult> parseResponse(
    HttpResponse<String> serviceResponse,
    String query,
    int topK,
    TScope policyTypeId
  ) {
    var responseBody = serviceResponse.body();
    JSONObject json = new JSONObject(responseBody);
    JSONArray results = json.getJSONArray("value");
    var hitCount = results.length();
    if (hitCount == 0) {
      log.warn(
        "No results found for query [{}] top: [{}] filter: [{}]",
        query,
        topK,
        policyTypeId
      );
      return Collections.emptyList();
    }
    log.trace(
      "Found [{}] results for query [{}] top: [{}] filter: [{}]",
      hitCount,
      query,
      topK,
      policyTypeId
    );
    List<AiSearchResult> contentChunks = new ArrayList<>();
    for (int i = 0; i < results.length(); i++) {
      JSONObject doc = null;
      try {
        doc = results.getJSONObject(i);
        contentChunks.add(AiSearchResult.builder().raw(doc).build());
        log.trace("\tResult [{}]: {}", i, doc.toString());
      } catch (Exception e) {
        log.error(
          String.format(
            "Error parsing search result at index %s: %s\nData: %s",
            i,
            e.getMessage(),
            doc == null ? "[null]" : doc.toString()
          ),
          e
        );
      }
    }
    return contentChunks;
  }
}
