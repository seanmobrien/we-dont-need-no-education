package com.obapps.core.util;

import io.github.cdimascio.dotenv.Dotenv;
import java.util.Objects;

public class EnvVars {

  private static final EnvVars instance = new EnvVars();
  protected final Dotenv dotenv;

  // Private constructor to enforce singleton pattern
  private EnvVars() {
    dotenv = Dotenv.configure().load();
  }

  public static EnvVars getInstance() {
    return instance;
  }

  public RestServiceVars getRestService() {
    return new RestServiceVars();
  }

  public OpenAiVars getOpenAi() {
    return new OpenAiVars();
  }

  public JustInTimeSearch getJustInTimeSearch() {
    return new JustInTimeSearch();
  }

  public DbVars getDb() {
    return new DbVars();
  }

  public AzureStorageVars getAzureStorage() {
    return new AzureStorageVars();
  }

  public RedisVars getRedis() {
    return new RedisVars();
  }

  public String get(String key) {
    return get(key, "");
  }

  public String get(String key, String defaultValue) {
    var ret = Objects.requireNonNullElse(dotenv.get(key), "").trim();
    return ret.isEmpty() ? defaultValue : ret;
  }

  public OtelVars getOtel() {
    return new OtelVars();
  }

  public class OtelVars {

    public String getResourceAttributes() {
      return get(
        "OTEL_RESOURCE_ATTRIBUTES",
        "service.name=obapps-core, service.version=1.0.0"
      );
    }

    public String getOtelEndpoint() {
      return get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
    }

    public String getResourceServiceName() {
      var ret = getResourceAttributes(); // Example: "service.name=obapps-core, service.version=1.0.0"
      for (String pair : ret.split(",")) {
        String[] keyValue = pair.trim().split("=");
        if (keyValue.length == 2 && keyValue[0].equals("service.name")) {
          return keyValue[1];
        }
      }
      return "service.name=obapps-core"; // Return default if null if the key is not found
    }
  }

  public class OpenAiVars {

    public String getApiKey() {
      return get("AZURE_OPENAI_KEY");
    }

    public String getSearchApiKey() {
      return get("AZURE_AISEARCH_KEY");
    }

    public String getSearchApiEndpoint() {
      return get("AZURE_AISEARCH_ENDPOINT");
    }

    public String getDeploymentChat() {
      var ret = get("AZURE_OPENAI_DEPLOYMENT_CHAT");
      return ret.isEmpty() ? "gpt-4.1" : ret;
    }

    public String getApiEndpoint() {
      return get("AZURE_OPENAI_ENDPOINT");
    }

    /**
     * Retrieves the deployment embedding configuration value from the environment variables.
     * If the environment variable "AZURE_OPENAI_DEPLOYMENT_EMBEDDING" is not set or is empty,
     * a default value of "text-embedding-3-large" is returned.
     *
     * @return The deployment embedding value from the environment variable, or the default value
     *         "text-embedding-3-large" if the variable is not set or empty.
     */
    public String getDeploymentEmbedding() {
      var ret = get("AZURE_OPENAI_DEPLOYMENT_EMBEDDING");
      return ret.isEmpty() ? "text-embedding-3-large" : ret;
    }

    public String getApiEndpointEmbedding() {
      var ret = get("AZURE_OPENAI_ENDPOINT_EMBEDDING");
      return ret.isEmpty() ? this.getApiEndpoint() : ret;
    }

    public String getDeploymentCompletions() {
      var ret = get("AZURE_OPENAI_DEPLOYMENT_COMPLETIONS");
      return ret.isEmpty() ? "o3-mini" : ret;
    }

    public String getApiEndpointCompletions() {
      var ret = get("AZURE_OPENAI_ENDPOINT_COMPLETIONS");
      return ret.isEmpty() ? this.getApiEndpoint() : ret;
    }

    public String getSearchApiKeyCompletions() {
      var ret = get("AZURE_OPENAI_KEY_COMPLETIONS");
      return ret.isEmpty() ? this.getApiKey() : ret;
    }

    public String getSearchIndexName() {
      return get("AZURE_AISEARCH_INDEX_NAME");
    }

    public String getPolicySearchIndexName() {
      return get("AZURE_AISEARCH_POLICY_INDEX_NAME");
    }

    public int getDocumentSplitterMaxTokens() {
      return Integer.parseInt(get("DOCUMENT_SPLITTER_MAX_TOKENS", "512"));
    }

    public int getDocumentSplitterOverlap() {
      return Integer.parseInt(get("DOCUMENT_SPLITTER_OVERLAP", "15"));
    }

    public int getVectorSizeSmall() {
      return Integer.parseInt(get("VECTOR_SIZE_SMALL", "1536"));
    }

    public int getVectorSizeLarge() {
      return Integer.parseInt(get("VECTOR_SIZE_LARGE", "3072"));
    }
  }

  public class RedisVars {

    public String getUrl() {
      return get("REDIS_URL");
    }

    public String getKey() {
      return get("REDIS_PASSWORD");
    }

    public String getOfflineStorage() {
      return get("REDIS_OFFLINE_STORAGE", "./redis-offline/");
    }

    public String getOfflineStorageUniqueFile(String name) {
      var folder = new java.io.File(getOfflineStorage());
      if (!folder.exists()) {
        folder.mkdirs();
      }
      var uniqueFilename = String.format(
        "%s/%s_%d.json",
        folder.getAbsolutePath(),
        Objects.requireNonNullElse(name, "value"),
        System.currentTimeMillis()
      );
      return uniqueFilename;
    }
  }

  public class AzureStorageVars {

    public String getConnectionString() {
      return get("AZURE_STORAGE_CONNECTION_STRING");
    }

    public String getAccountName() {
      return get("AZURE_STORAGE_ACCOUNT_NAME");
    }

    public String getAccountKey() {
      return get("AZURE_STORAGE_ACCOUNT_KEY");
    }
  }

  public class RestServiceVars {

    public String getServiceUrl(String service) {
      var path = service.startsWith("/") ? service : "/" + service;
      return this.getRootUrl() + path;
    }

    public String getRootUrl() {
      return get("REST_SERVICE_ROOT_URL");
    }

    public String getAuthHeaderBypassKey() {
      return get("REST_SERVICE_AUTH_HEADER_BYPASS_KEY");
    }

    public String getAuthHeaderBypassValue() {
      return get("REST_SERVICE_AUTH_HEADER_BYPASS_VALUE");
    }
  }

  public class DbVars {

    public String getUrl() {
      return get("POSTGRES_CONNECTION_URL");
    }

    public String getUser() {
      return get("POSTGRES_CONNECTION_USER");
    }

    public String getPassword() {
      return get("POSTGRES_CONNECTION_PW");
    }
  }

  public class JustInTimeSearch {

    public boolean isPrefilterEnabled() {
      return Boolean.parseBoolean(get("JUSTINTIME_SEARCH_PREFILTER_ENABLED"));
    }

    public boolean isSummaryEnabled() {
      return Boolean.parseBoolean(get("JUSTINTIME_SEARCH_SUMMARY_ENABLED"));
    }

    public boolean isDocumentSummaryEnabled() {
      return Boolean.parseBoolean(
        get("JUSTINTIME_SEARCH_DOCUMENTS_SUMMARY_ENABLED", "false")
      );
    }

    public int getNumSearchHits() {
      return Integer.parseInt(get("JUSTINTIME_SEARCH_NUM_SEARCH_HITS"));
    }

    public int getNumSummary() {
      return Integer.parseInt(get("JUSTINTIME_SEARCH_NUM_SUMMARY"));
    }
  }
}
