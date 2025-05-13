package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import org.json.JSONObject;

public class AzureSearchClient
  extends AzureBaseSearchClient<AzureSearchClient.ScopeType> {

  public AzureSearchClient() {
    this(null, null);
  }

  public AzureSearchClient(
    EnvVars environment,
    EmbeddingService embeddingService
  ) {
    super(environment, embeddingService, ScopeType.All);
  }

  @Override
  protected void appendScopeFilter(JSONObject payload, ScopeType scopeType) {
    String policyTypeValue;
    switch (scopeType) {
      case Email:
        policyTypeValue = "email";
        break;
      case Attachment:
        policyTypeValue = "attachment";
        break;
      case KeyPoint:
        policyTypeValue = "key_point";
        break;
      case Cta:
        policyTypeValue = "cta";
        break;
      default:
        policyTypeValue = "";
        break;
    }
    if (policyTypeValue != "") {
      String metadataFilter =
        "metadata/attributes/any(a: a/key eq 'document_type' and a/value eq '" +
        policyTypeValue +
        "')";
      payload.put("filter", metadataFilter);
    }
  }

  @Override
  protected String getSearchIndexName() {
    return envVars.getOpenAi().getSearchIndexName();
  }

  public enum ScopeType {
    All,
    Email,
    Attachment,
    KeyPoint,
    Cta,
  }
}
