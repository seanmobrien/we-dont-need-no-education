package com.obapps.schoolchatbot.embed;

import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.embed.DocumentEmbedder;
import com.obapps.schoolchatbot.core.models.*;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;

/**
 * A utility class for embedding Minnesota law documents into a vector database.
 * This class provides methods to process and embed Minnesota law documents for search and retrieval.
 */
public class EmbedMnLaw extends DocumentEmbedder {

  private EmbedMnLaw(EmbedPolicyFolderOptions options) {
    super(
      options,
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName(),
      new StandaloneModelClientFactory()
    );
  }

  public Boolean run() throws Exception {
    if (EnvVars.getInstance().get("PIPELINES_EMBEDMNLAW_ENABLED") == "false") {
      System.out.println("Embedding is disabled.");
      return false;
    }
    // Step 1: Retrieve and parse documents
    var documents = FileSystemDocumentLoader.loadDocuments(
      options.sourceFolder,
      new ApachePdfBoxDocumentParser(true)
    );
    if (documents == null || documents.isEmpty()) {
      System.out.println("No documents found in the specified folder.");
      return false;
    }
    var processed = 0;
    /*
    for (var document : documents) {
      var metadata = document.metadata();
      var fileName = metadata.getString(Document.FILE_NAME);
      // Extract numeric digits after "MN_" in the filename
      var pattern = Pattern.compile("MN_(?<chapter>\\d+)(\\w|\\s)");
      var matcher = pattern.matcher(fileName);
      if (matcher.find()) {
        var policyMetadata = PolicyTypeMap.Instance.getByChapter(
          matcher.group("chapter")
        );
        if (policyMetadata == null) {
          System.out.println("No policy metadata found for: " + fileName);
          continue;
        }
        metadata.put("id", policyMetadata.PolicyId);
        metadata.put("policy_id", policyMetadata.PolicyId);
        metadata.put(
          "policy_type_id",
          PolicyTypeConstants.getValueOf(policyMetadata.PolicyType)
        );
        metadata.put("policy_chapter", policyMetadata.Chapter);
        if (policyMetadata.Section != null) {
          metadata.put("policy_section", policyMetadata.Section);
        }
        metadata.put("policy_description", policyMetadata.Description);

        if (embedDocument(document)) {
          processed++;
        }
      } else {
        System.out.println(
          "Filename does not match the expected format: " + fileName
        );
        continue;
      }
    }
       */
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
    var embedPlsas = new EmbedMnLaw(options);
    try {
      embedPlsas.run();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
