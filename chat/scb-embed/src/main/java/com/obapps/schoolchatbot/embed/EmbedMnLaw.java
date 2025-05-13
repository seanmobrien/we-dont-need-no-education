package com.obapps.schoolchatbot.embed;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Colors;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.*;

/**
 * A utility class for embedding Minnesota law documents into a vector database.
 * This class provides methods to process and embed Minnesota law documents for search and retrieval.
 */
public class EmbedMnLaw extends FileSystemEmbedder {

  public EmbedMnLaw(EmbedPolicyFolderOptions options) {
    super(
      options.setPolicyType(PolicyType.StateLaw),
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName(),
      new StandaloneModelClientFactory()
    );
  }

  @Override
  public Boolean run() throws Exception {
    if (EnvVars.getInstance().get("PIPELINES_EMBEDMNLAW_ENABLED") == "false") {
      System.out.println("Embedding is disabled.");
      return false;
    }
    var processed = super.embedDocumentFolder(options.sourceFolder);
    if (processed.equals(0)) {
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

    return processed > 0;
  }

  /**
   * The main method to execute the Minnesota law document embedding process.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    // Example usage of EmbedPlsas
    var options = new EmbedPolicyFolderOptions();
    options.sourceFolder =
      "C:\\Users\\seanm\\OneDrive\\PLSASComplaint\\PLSAS Policy"; // Specify the folder containing PLSAS documents
    try (var embedPlsas = new EmbedMnLaw(options)) {
      embedPlsas.run();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
