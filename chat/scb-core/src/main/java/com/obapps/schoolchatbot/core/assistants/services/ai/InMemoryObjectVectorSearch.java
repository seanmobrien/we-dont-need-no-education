package com.obapps.schoolchatbot.core.assistants.services.ai;

import com.obapps.core.util.Strings;
import com.obapps.schoolchatbot.core.assistants.services.EmbeddingService;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class InMemoryObjectVectorSearch<TModel> {

  private EmbeddingService embeddingService;
  private EmbeddingStore<TModel> embeddingStore;

  public InMemoryObjectVectorSearch() {
    this(null);
  }

  public InMemoryObjectVectorSearch(Options<TModel> options) {
    super();
    if (options != null) {
      this.embeddingService = Objects.requireNonNullElse(
        options.embeddingService,
        new EmbeddingService()
      );
      if (options.cacheEmbeddings != null) {
        this.embeddingService.setCacheEmbeddings(options.cacheEmbeddings);
      }
      this.embeddingStore = Objects.requireNonNullElse(
        options.embeddingStore,
        new InMemoryEmbeddingStore<TModel>()
      );
    } else {
      this.embeddingService = new EmbeddingService(); // Default embedding service
      this.embeddingStore = new InMemoryEmbeddingStore<TModel>(); // Default embedding store
    }
  }

  public List<TModel> search(String query, int topK) {
    return search(query, topK, null);
  }

  public InMemoryObjectVectorSearch<TModel> add(TModel object) {
    return add(object, null);
  }

  public InMemoryObjectVectorSearch<TModel> add(
    TModel object,
    Map<String, Object> metadata
  ) {
    var meta = metadata == null
      ? new HashMap<String, Object>()
      : new HashMap<>(metadata);
    Metadata.from(
      Objects.requireNonNullElse(meta, new HashMap<String, Object>())
    );

    var content = getIndexedContent(object);
    var embedding = embeddingService.embedding(content);
    this.embeddingStore.add(embedding, object);

    return this; // Return the current instance for method chaining
  }

  private <TObject> String getIndexedContent(TObject object) {
    return Strings.serializeAsJson(object);
  }

  public List<TModel> search(
    String query,
    int topK,
    Map<String, Object> filters
  ) {
    var queryEmbedding = embeddingService.embedding(query);
    EmbeddingSearchRequest embeddingSearchRequest =
      EmbeddingSearchRequest.builder()
        .queryEmbedding(queryEmbedding)
        .maxResults(topK)
        .build();
    var matches = embeddingStore.search(embeddingSearchRequest).matches();
    return matches
      .stream()
      .map(EmbeddingMatch::embedded)
      .filter(Objects::nonNull)
      .toList();
  }

  public static class Options<TModel> {

    public Boolean cacheEmbeddings = true;
    public EmbeddingService embeddingService = null;
    public EmbeddingStore<TModel> embeddingStore = null;

    public Options<TModel> setCacheEmbeddings(Boolean cacheEmbeddings) {
      this.cacheEmbeddings = cacheEmbeddings;
      return this;
    }

    public Options<TModel> setEmbeddingService(
      EmbeddingService embeddingService
    ) {
      this.embeddingService = embeddingService;
      return this;
    }

    public Options<TModel> setEmbeddingStore(
      EmbeddingStore<TModel> embeddingStore
    ) {
      this.embeddingStore = embeddingStore;
      return this;
    }
  }
}
