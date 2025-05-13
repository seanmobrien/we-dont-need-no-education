package com.obapps.schoolchatbot.embed;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.embed.DocumentEmbedder;
import com.obapps.schoolchatbot.core.models.EmbedPolicyFolderOptions;
import com.obapps.schoolchatbot.core.models.PolicyType;

public abstract class FileSystemEmbedder extends DocumentEmbedder {

  public FileSystemEmbedder(
    EmbedPolicyFolderOptions options,
    String indexName,
    ILanguageModelFactory factory
  ) {
    super(options.setPolicyType(PolicyType.StateLaw), indexName, factory);
  }

  public FileSystemEmbedder(EmbedPolicyFolderOptions options) {
    this(
      options.setPolicyType(PolicyType.StateLaw),
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName(),
      new StandaloneModelClientFactory()
    );
  }

  public abstract Boolean run() throws Exception;
}
