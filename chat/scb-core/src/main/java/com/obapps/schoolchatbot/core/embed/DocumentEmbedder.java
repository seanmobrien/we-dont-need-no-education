package com.obapps.schoolchatbot.core.embed;

import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.util.Colors;
import com.obapps.core.util.Db;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.EmbedPolicyFolderOptions;
import com.obapps.schoolchatbot.core.models.PolicyTypeConstants;
import com.obapps.schoolchatbot.core.models.PolicyTypeRecord;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.apache.pdfbox.ApachePdfBoxDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchContentRetriever;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchQueryType;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The DocumentEmbedder class is responsible for embedding documents into a vector space
 * using Azure OpenAI and Azure AI Search services. It provides functionality to split
 * documents into smaller segments, generate embeddings for those segments, and store
 * them in a content retriever for later use.
 *
 * <p>Key components of this class include:</p>
 * <ul>
 *   <li><b>AzureOpenAiEmbeddingModel:</b> Used to generate embeddings for text segments
 *       using the Azure OpenAI text-embedding-ada-002 model.</li>
 *   <li><b>DocumentSplitter:</b> Splits documents into smaller segments to ensure they
 *       fit within the token limits of the embedding model.</li>
 *   <li><b>AzureAiSearchContentRetriever:</b> Stores the embeddings and their corresponding
 *       text segments, enabling hybrid search with reranking capabilities.</li>
 * </ul>
 *
 * <p>Usage:</p>
 * <ol>
 *   <li>Initialize the DocumentEmbedder, which sets up the embedding model, document splitter,
 *       and content retriever using environment variables.</li>
 *   <li>Call the {@code embedDocument} method with a document to split it into segments,
 *       generate embeddings, and store them in the content retriever.</li>
 * </ol>
 *
 * <p>Environment Variables:</p>
 * <ul>
 *   <li><b>OpenAI API Key:</b> Used to authenticate with the Azure OpenAI service.</li>
 *   <li><b>Search API Key:</b> Used to authenticate with the Azure AI Search service.</li>
 *   <li><b>Deployment Name:</b> Specifies the deployment of the embedding model.</li>
 *   <li><b>Search Index Name:</b> Specifies the index name for storing embeddings.</li>
 * </ul>
 *
 * <p>Methods:</p>
 * <ul>
 *   <li>{@code embedDocument(Document document):} Splits the document into segments,
 *       generates embeddings for each segment, and stores them in the content retriever.
 *       Returns {@code true} if successful, {@code false} otherwise.</li>
 * </ul>
 */
public class DocumentEmbedder implements AutoCloseable {

  protected EmbeddingModel embeddingModel;
  protected DocumentSplitter documentSplitter;
  protected AzureAiSearchContentRetriever contentRetriever;
  protected final EmbedPolicyFolderOptions options;
  protected Logger log;

  /**
   * The DocumentEmbedder class is responsible for initializing and managing the components
   * required for embedding documents, splitting them into manageable chunks, and retrieving
   * relevant content using Azure AI services.
   *
   * <p>This class performs the following tasks:
   * <ul>
   *   <li>Initializes an embedding model using Azure OpenAI's text-embedding-ada-002 deployment.</li>
   *   <li>Creates a document splitter to divide documents into smaller chunks for processing.</li>
   *   <li>Configures a content retriever to perform hybrid search with reranking using Azure AI Search.</li>
   * </ul>
   *
   * <p>Dependencies:
   * <ul>
   *   <li>Azure OpenAI services for embedding and tokenization.</li>
   *   <li>Azure AI Search for content retrieval with hybrid search capabilities.</li>
   * </ul>
   *
   * <p>Configuration:
   * <ul>
   *   <li>API keys, endpoints, deployment names, and other settings are retrieved from environment variables.</li>
   *   <li>Document splitting parameters and search query configurations are customizable.</li>
   * </ul>
   *
   * <p>Usage:
   * <pre>
   * // Example usage of DocumentEmbedder
   * DocumentEmbedder embedder = new DocumentEmbedder();
   * </pre>
   *
   * <p>Note: This class is protected and intended to be extended or used within the same package.
   */
  protected DocumentEmbedder(
    EmbedPolicyFolderOptions options,
    String searchIndexName,
    ILanguageModelFactory modelFactory
  ) {
    this.log = LoggerFactory.getLogger(DocumentEmbedder.class);
    this.options = options;
    // Step 1: Create the embedding model
    var openAiVars = EnvVars.getInstance().getOpenAi();

    // Create EmbeddingModel object for Azure OpenAI text-embedding-ada-002
    this.embeddingModel = modelFactory.createEmbeddingModel();

    // Create Document Splitter object
    this.documentSplitter = DocumentSplitters.recursive(
      openAiVars.getDocumentSplitterMaxTokens(),
      openAiVars.getDocumentSplitterOverlap(),
      modelFactory.getTokenCountEstimator(ModelType.Embedding)
    );

    // Create ContentRetriever object for Azure AI Search with Hybrid Search applied
    this.contentRetriever = AzureAiSearchContentRetriever.builder()
      .apiKey(openAiVars.getSearchApiKey())
      .endpoint(openAiVars.getSearchApiEndpoint())
      .dimensions(openAiVars.getVectorSizeLarge())
      .indexName(searchIndexName)
      .createOrUpdateIndex(false)
      .embeddingModel(embeddingModel)
      .queryType(AzureAiSearchQueryType.HYBRID_WITH_RERANKING)
      .maxResults(50)
      .minScore(0.0)
      .build();
  }

  /**
   * Embeds documents from a specified folder by processing their metadata and
   * storing them in a target system. The method performs the following steps:
   *
   * 1. Loads and parses documents from the given source folder.
   * 2. Extracts PolicyTypeRecord metadata from the document filename
   * 3. Maps the extracted chapter information to policy metadata using a
   *    predefined mapping.
   * 4. Updates the document's metadata with policy-related information, such as
   *    policy ID, type, chapter, section, and description.
   * 5. Attempts to embed the document into the target system.
   * 6. Logs the results, including the number of successfully embedded documents
   *    and their filenames.
   *
   * If no documents are found in the folder or if no documents are successfully
   * embedded, appropriate messages are displayed.
   *
   * @param sourceFolder The path to the folder containing the documents to be
   *                     processed.
   * @return The number of documents successfully embedded. Returns -1 if no
   *         documents are found in the specified folder.
   */
  protected Integer embedDocumentFolder(String sourceFolder) {
    // Step 1: Retrieve and parse documents
    List<Document> documents = new ArrayList<>(
      FileSystemDocumentLoader.loadDocuments(
        sourceFolder,
        new ApachePdfBoxDocumentParser(true)
      )
    );
    if (documents == null || documents.isEmpty()) {
      System.out.println("No documents found in the specified folder.");
      return -1;
    }
    var processed = new ArrayList<String>();
    try {
      for (var document : documents) {
        var metadata = document.metadata();
        var fileName = metadata.getString(Document.FILE_NAME);
        var policyTypeRecord = PolicyTypeRecord.parse(
          options.policyType,
          fileName
        );
        if (!shouldProcess(document, policyTypeRecord)) {
          System.out.println(
            Colors.getInstance().YELLOW +
            "Document processing skipped: " +
            fileName +
            Colors.getInstance().RESET
          );
          continue;
        }
        if (policyTypeRecord.PolicyId > 0) {
          if (Objects.requireNonNullElse(metadata.getString("id"), "") == "") {
            metadata.put("id", policyTypeRecord.PolicyId.toString());
          }
          metadata.put("policy_id", policyTypeRecord.PolicyId);
        }
        metadata.put(
          "policy_type_id",
          PolicyTypeConstants.getValueOf(policyTypeRecord.PolicyType)
        );
        if (policyTypeRecord.Chapter != null) {
          if (
            Objects.requireNonNullElse(
              metadata.getString("policy_chapter"),
              ""
            ) ==
            ""
          ) {
            metadata.put("policy_chapter", policyTypeRecord.Chapter);
          }
        }
        if (policyTypeRecord.Section != null) {
          if (
            Objects.requireNonNullElse(
              metadata.getString("policy_section"),
              ""
            ) ==
            ""
          ) {
            metadata.put("policy_section", policyTypeRecord.Section);
          }
        }

        if (policyTypeRecord.Description != null) {
          if (
            Objects.requireNonNullElse(
              metadata.getString("policy_description"),
              ""
            ) ==
            ""
          ) {
            metadata.put("policy_description", policyTypeRecord.Description);
          }
        }
        if (embedDocument(document)) {
          processed.add(fileName);
        } else {
          System.out.println(
            Colors.getInstance().RED +
            "Unexpected failure embedding document: " +
            fileName +
            Colors.getInstance().RESET
          );
        }
      }
    } finally {
      var seperator = new StringBuilder();
      seperator.append("\n" + Colors.getInstance().BLUE);
      for (int i = 0; i < sourceFolder.length(); i++) {
        seperator.append("-");
      }
      seperator.append(Colors.getInstance().RESET + "\n\n");

      var message = new StringBuilder();
      message.append(seperator);
      if (processed.size() > 0) {
        message.append(
          Colors.getInstance().GREEN +
          "Embedded " +
          processed.size() +
          " documents:\n" +
          Colors.getInstance().RESET
        );
        for (String fileName : processed) {
          message.append(
            Colors.getInstance().PURPLE +
            "  - " +
            fileName +
            "\n" +
            Colors.getInstance().RESET
          );
        }
      } else {
        message.append(
          Colors.getInstance().RED +
          "No documents embedded.\n" +
          Colors.getInstance().RESET
        );
      }
      message.append(seperator);
      System.out.print(message.toString());
    }

    return processed.size();
  }

  /**
   * Determines whether a given document should be processed based on the provided policy record.
   *
   * @param document The document to be evaluated. This parameter is currently unused in the method logic.
   * @param record The policy type record containing policy information. Must not be null and must be able to find or create a matching policy_statutes record.
   * @return {@code true} if the record is not null and has a PolicyId greater than 0; {@code false} otherwise.
   */
  protected Boolean shouldProcess(Document document, PolicyTypeRecord record) {
    return record != null && record.lookupPolicyId(true) > 0;
  }

  /**
   * Embeds the content of a given document by splitting it into segments,
   * generating embeddings for each segment, and storing the embeddings
   * along with the corresponding segments.
   *
   * @param document The document to be embedded.
   * @return {@code true} if the document was successfully embedded and stored,
   *         {@code false} if an error occurred during the embedding process.
   */
  protected Boolean embedDocument(Document document) { // Custom metadata
    var embeddings = new ArrayList<Embedding>();
    var segmentsToStore = new ArrayList<TextSegment>();

    List<TextSegment> segments = documentSplitter.split(document);
    for (TextSegment segment : segments) {
      segmentsToStore.add(segment);
      embeddings.add(embeddingModel.embed(segment).content());
    }

    try {
      contentRetriever.addAll(embeddings, segmentsToStore);
    } catch (Exception ex) {
      System.out.println("Error embedding document: " + ex.getMessage());
      return false;
    }
    return true;
  }

  /**
   * Closes the current resource and performs necessary cleanup operations.
   * This method is called to release resources and ensure proper teardown
   * of the database connection or other associated resources.
   *
   * @throws Exception if an error occurs during the teardown process.
   */
  @Override
  public void close() throws Exception {
    Db.teardown();
  }
}
