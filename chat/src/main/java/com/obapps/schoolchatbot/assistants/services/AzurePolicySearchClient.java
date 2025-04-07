package com.obapps.schoolchatbot.assistants.services;

import com.obapps.schoolchatbot.util.EnvVars;
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;
import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import org.json.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AzurePolicySearchClient {

  private final EnvVars envVars;
  private final Logger log;
  private final EmbeddingService embeddingService;
  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();

  /**
   * Default constructor for the AzurePolicySearchClient class.
   * Initializes a new instance of the AzurePolicySearchClient with default values.
   * This constructor delegates to another constructor with null parameters.
   */
  public AzurePolicySearchClient() {
    this(null, null);
  }

  public AzurePolicySearchClient(
    EnvVars environment,
    EmbeddingService embeddingService
  ) {
    this.envVars = environment == null ? EnvVars.getInstance() : environment;
    this.embeddingService = embeddingService == null
      ? new EmbeddingService()
      : embeddingService;
    log = LoggerFactory.getLogger(AzurePolicySearchClient.class);
  }

  String env(Function<EnvVars.OpenAiVars, String> fn) {
    return fn.apply(envVars.getOpenAi());
  }

  protected String getServiceUrl() {
    return String.format(
      "%s/indexes/%s/docs/search?api-version=2024-11-01-preview",
      env(c -> c.getSearchApiEndpoint()),
      env(c -> c.getSearchIndexName())
    );
  }

  protected void appendPolicyTypeFilter(
    JSONObject payload,
    Integer policyTypeId
  ) {
    if (policyTypeId > 0) {
      String metadataFilter =
        "metadata/attributes/any(a: a/key eq 'policy_type_id' and a/value eq '" +
        policyTypeId +
        "')";
      payload.put("filter", metadataFilter);
    }
  }

  public List<String> semanticSearch(String query, int topK) {
    return semanticSearch(query, topK, -1);
  }

  /**
   * Performs a semantic search using Azure Cognitive Search and retrieves a list of content chunks.
   *
   * @param query The search query string.
   * @param topK The maximum number of results to retrieve.
   * @param policyTypeId An optional filter for policy type ID to narrow down the search results.
   * @return A list of content chunks matching the search query. Returns an empty list if an error occurs.
   * @throws Exception If an error occurs during the search process.
   */
  public List<String> semanticSearch(
    String query,
    int topK,
    Integer policyTypeId
  ) {
    try {
      String url = getServiceUrl();
      JSONObject payload = new JSONObject();
      payload.put("search", query);
      payload.put("top", topK);
      payload.put("queryType", "semantic");
      payload.put("semanticConfiguration", "semantic-search-config"); // Adjust if you have a named semantic config
      payload.put("select", "content"); // adjust field name
      payload.put("queryLanguage", "en-us");
      // Add optional policy type filter: only include documents where metadata.attributes include school board policy
      appendPolicyTypeFilter(payload, policyTypeId);
      HttpRequest request = HttpRequest.newBuilder()
        .uri(new URI(url))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("api-key", env(c -> c.getSearchApiKey()))
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
        contentChunks.add(doc.getString("content")); // or whatever field contains your chunked text
      }

      return contentChunks;
    } catch (Exception e) {
      log.error(
        "AzurePolicySearchClient search failed for query [{}]: {}",
        query,
        e.getMessage()
      );
      System.err.println(
        "AzurePolicySearchClient search failed: " + e.getMessage()
      );
      return Collections.emptyList();
    }
  }

  /**
   * Performs a hybrid search using a natural language query and its corresponding embeddings.
   *
   * @param naturalQuery The natural language query to search for.
   * @param topK The maximum number of search results to return.
   * @return A list of search results as strings.
   */
  public List<String> hybridSearch(String naturalQuery, int topK) {
    return hybridSearch(naturalQuery, null, topK);
  }

  /**
   * Performs a hybrid search combining a natural language query and an embedding vector.
   *
   * @param naturalQuery The natural language query string to search for.
   * @param embeddingVector The embedding vector representing the query in vector space.
   * @param topK The maximum number of search results to return.
   * @return A list of search result strings based on the hybrid search criteria.
   */
  public List<String> hybridSearch(
    String naturalQuery,
    float[] embeddingVector,
    int topK
  ) {
    return hybridSearch(naturalQuery, embeddingVector, topK, -1);
  }

  /**
   * Performs a hybrid search combining a natural language query and an embedding vector.
   *
   * @param naturalQuery The natural language query string to search for.
   * @param topK The maximum number of search results to return.
   * @param policyTypeId An optional filter for policy type ID to narrow down the search results.
   * @return A list of search result strings based on the hybrid search criteria.
   */
  public List<String> hybridSearch(
    String naturalQuery,
    int topK,
    Integer policyTypeId
  ) {
    return hybridSearch(naturalQuery, null, topK, policyTypeId);
  }

  /**
   * Performs a hybrid search using a combination of semantic and vector-based search techniques.
   *
   * @param naturalQuery   The natural language query string to search for.
   * @param embeddingVector A float array representing the embedding vector for vector-based search.
   * @param topK           The maximum number of top results to retrieve.
   * @param policyTypeId   An optional policy type identifier (currently unused in the implementation).
   * @return A list of content strings representing the search results. Returns an empty list if the search fails.
   *
   * This method constructs a search payload with semantic and vector search parameters, sends it to the Azure
   * Cognitive Search service, and processes the response to extract the relevant content. It optionally applies a metadata
   * filter by policy type ID if provided. The method handles exceptions and logs errors appropriately.
   *
   * Logs an error message and returns an empty list in case of any exceptions during the search process.
   */
  public List<String> hybridSearch(
    String naturalQuery,
    float[] embeddingVector,
    int topK,
    Integer policyTypeId
  ) {
    try {
      String url = getServiceUrl();
      // If we were given a null embedding vector, we need to generate it ourselves.
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

      appendPolicyTypeFilter(payload, policyTypeId);

      var guid = UUID.randomUUID().toString();
      log.info(
        "Sending hybrid search request ID: {}\n\tURL: {}\n\tPayload: {}",
        guid,
        url,
        payload.toString()
      );

      HttpRequest request = HttpRequest.newBuilder()
        .uri(new URI(url))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("api-key", env(c -> c.getSearchApiKey()))
        .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );
      JSONObject json = new JSONObject(response.body());
      log.info(
        "Received response for request id: {}\n\tResponse: {}",
        guid,
        json.toString()
      );
      if (json.has("error")) {
        JSONObject error = json.getJSONObject("error");
        String errorMessage = error.getString("message");
        log.error(
          "Hybrid search failed for query [{}]: {}",
          naturalQuery,
          errorMessage
        );
        return Collections.emptyList();
      }
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
