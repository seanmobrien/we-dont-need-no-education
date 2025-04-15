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
    return new RestServiceVars(this);
  }

  public OpenAiVars getOpenAi() {
    return new OpenAiVars(this);
  }

  public JustInTimeSearch getJustInTimeSearch() {
    return new JustInTimeSearch();
  }

  public DbVars getDb() {
    return new DbVars(this);
  }

  public String get(String key) {
    return get(key, "");
  }

  public String get(String key, String defaultValue) {
    var ret = Objects.requireNonNullElse(dotenv.get(key), "").trim();
    return ret.isEmpty() ? defaultValue : ret;
  }

  public class OpenAiVars {

    private final EnvVars parent;

    protected OpenAiVars(EnvVars parent) {
      this.parent = parent;
    }

    public String getApiKey() {
      return parent.dotenv.get("AZURE_OPENAI_KEY");
    }

    public String getApiEndpoint() {
      return parent.dotenv.get("AZURE_OPENAI_ENDPOINT");
    }

    public String getSearchApiKey() {
      return parent.dotenv.get("AZURE_AISEARCH_KEY");
    }

    public String getSearchApiEndpoint() {
      return parent.dotenv.get("AZURE_AISEARCH_ENDPOINT");
    }

    public String getDeploymentChat() {
      return parent.dotenv.get("AZURE_OPENAI_DEPLOYMENT_CHAT");
    }

    public String getDeploymentEmbedding() {
      return parent.dotenv.get("AZURE_OPENAI_DEPLOYMENT_EMBEDDING");
    }

    public String getDeploymentCompletions() {
      return parent.dotenv.get("AZURE_OPENAI_DEPLOYMENT_COMPLETIONS");
    }

    public String getApiEndpointCompletions() {
      var ret = parent.get("AZURE_OPENAI_ENDPOINT_COMPLETIONS");
      return ret.isEmpty() ? this.getApiEndpoint() : ret;
    }

    public String getSearchApiKeyCompletions() {
      var ret = parent.get("AZURE_OPENAI_KEY_COMPLETIONS");
      return ret.isEmpty() ? this.getApiKey() : ret;
    }

    public String getSearchIndexName() {
      return parent.dotenv.get("AZURE_AISEARCH_INDEX_NAME");
    }

    public String getPolicySearchIndexName() {
      return parent.dotenv.get("AZURE_AISEARCH_POLICY_INDEX_NAME");
    }
  }

  public class RestServiceVars {

    private final EnvVars parent;

    protected RestServiceVars(EnvVars parent) {
      this.parent = parent;
    }

    public String getServiceUrl(String service) {
      var path = service.startsWith("/") ? service : "/" + service;
      return this.getRootUrl() + path;
    }

    public String getRootUrl() {
      return parent.dotenv.get("REST_SERVICE_ROOT_URL");
    }

    public String getAuthHeaderBypassKey() {
      return parent.dotenv.get("REST_SERVICE_AUTH_HEADER_BYPASS_KEY");
    }

    public String getAuthHeaderBypassValue() {
      return parent.dotenv.get("REST_SERVICE_AUTH_HEADER_BYPASS_VALUE");
    }
  }

  public class DbVars {

    private final EnvVars parent;

    protected DbVars(EnvVars parent) {
      this.parent = parent;
    }

    public String getUrl() {
      return parent.dotenv.get("POSTGRES_CONNECTION_URL");
    }

    public String getUser() {
      return parent.dotenv.get("POSTGRES_CONNECTION_USER");
    }

    public String getPassword() {
      return parent.dotenv.get("POSTGRES_CONNECTION_PW");
    }
  }

  public class JustInTimeSearch {

    public boolean isPrefilterEnabled() {
      return Boolean.parseBoolean(
        dotenv.get("JUSTINTIME_SEARCH_PREFILTER_ENABLED")
      );
    }

    public boolean isSummaryEnabled() {
      return Boolean.parseBoolean(
        dotenv.get("JUSTINTIME_SEARCH_SUMMARY_ENABLED")
      );
    }

    public int getNumSearchHits() {
      return Integer.parseInt(dotenv.get("JUSTINTIME_SEARCH_NUM_SEARCH_HITS"));
    }

    public int getNumSummary() {
      return Integer.parseInt(dotenv.get("JUSTINTIME_SEARCH_NUM_SUMMARY"));
    }
  }
}
