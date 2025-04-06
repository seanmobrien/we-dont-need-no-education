package com.obapps.schoolchatbot;

import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.DocumentEmbedder;
import com.obapps.schoolchatbot.util.EnvVars;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;

public class EmbedMnLaw extends DocumentEmbedder {

  private EmbedMnLaw(EmbedPolicyFolderOptions options) {
    super(
      options,
      EnvVars.getInstance().getOpenAi().getPolicySearchIndexName()
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
}
