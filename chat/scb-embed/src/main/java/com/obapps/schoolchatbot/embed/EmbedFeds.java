package com.obapps.schoolchatbot.embed;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Colors;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.*;

/**
 * A utility class for embedding federal documents into a vector database.
 * This class provides methods to process and embed federal documents for search and retrieval.
 */
public class EmbedFeds extends FileSystemEmbedder {

  public EmbedFeds(EmbedPolicyFolderOptions options) {
    super(
      options.setPolicyType(PolicyType.FederalLaw),
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName(),
      new StandaloneModelClientFactory()
    );
  }

  @Override
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

  /**
   * The main method to execute the federal document embedding process.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    // ...existing code...
  }
}
