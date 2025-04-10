package com.obapps.schoolchatbot;

import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.DocumentEmbedder;
import com.obapps.schoolchatbot.util.EnvVars;

/**
 * A utility class for embedding PLSAS (Prior Lake-Savage Area Schools) documents into a vector database.
 * This class provides methods to process and embed PLSAS documents for search and retrieval.
 */
public class EmbedPlsas extends DocumentEmbedder {

  private EmbedPlsas(EmbedPolicyFolderOptions options) {
    super(
      options,
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName()
    );
  }

  public Boolean run() throws Exception {
    if (EnvVars.getInstance().get("PIPELINES_EMBEDPLSAS_ENABLED") == "false") {
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

  /**
   * The main method to execute the PLSAS document embedding process.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    // ...existing code...
  }
}
