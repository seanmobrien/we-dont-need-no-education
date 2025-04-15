package com.obapps.schoolchatbot.core.assistants.services;

import com.obapps.core.util.EnvVars;
import org.json.JSONObject;

public class AzurePolicySearchClient
  extends AzureBaseSearchClient<AzurePolicySearchClient.ScopeType> {

  public AzurePolicySearchClient() {
    this(null, null);
  }

  public AzurePolicySearchClient(
    EnvVars environment,
    EmbeddingService embeddingService
  ) {
    super(environment, embeddingService, ScopeType.All);
  }

  @Override
  protected String getSearchIndexName() {
    return envVars.getOpenAi().getPolicySearchIndexName();
  }

  @Override
  protected void appendScopeFilter(
    JSONObject payload,
    AzurePolicySearchClient.ScopeType policyTypeId
  ) {
    Integer policyTypeValue;
    switch (policyTypeId) {
      case SchoolBoard:
        policyTypeValue = 1;
        break;
      case State:
        policyTypeValue = 2;
        break;
      case Federal:
        policyTypeValue = 3;
        break;
      default:
        policyTypeValue = -1;
        break;
    }
    if (policyTypeValue > 0) {
      String metadataFilter =
        "metadata/attributes/any(a: a/key eq 'policy_type_id' and a/value eq '" +
        policyTypeId +
        "')";
      payload.put("filter", metadataFilter);
    }
  }

  public enum ScopeType {
    All,
    SchoolBoard,
    State,
    Federal,
  }
}
