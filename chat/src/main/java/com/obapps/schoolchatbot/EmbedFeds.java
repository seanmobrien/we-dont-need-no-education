package com.obapps.schoolchatbot;

import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.DocumentEmbedder;
import com.obapps.schoolchatbot.util.EnvVars;

public class EmbedFeds extends DocumentEmbedder {

  private EmbedFeds(EmbedPolicyFolderOptions options) {
    super(
      options,
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName()
    );
  }

  public Boolean run() throws Exception {
    if (EnvVars.getInstance().get("PIPELINES_EMBEDFED_ENABLED") == "false") {
      System.out.println("Embedding is disabled.");
      return false;
    }
    var processed = super.embedDocumentFolder(options.sourceFolder);
    if (processed == 0) {
      System.out.println(
        Colors.getInstance().YELLOW +
        "No documents found in the specified folder." +
        Colors.getInstance().RESET
      );
      return false;
    }
    System.out.println(
      Colors.getInstance().GREEN +
      "Embedding successfully completed." +
      Colors.getInstance().RESET
    );

    return true;
  }
}
