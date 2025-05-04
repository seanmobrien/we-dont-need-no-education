package com.obapps.schoolchatbot.embed;

import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.ILanguageModelFactory;
import com.obapps.core.exceptions.ErrorUtil;
import com.obapps.core.util.EnvVars;
import com.obapps.schoolchatbot.core.models.DocumentUnit;
import com.obapps.schoolchatbot.core.models.EmbedDocumentsOptions;
import com.obapps.schoolchatbot.core.models.SchoolDocument;
import com.obapps.schoolchatbot.core.models.embed.DocumentUnitEmbeddedProps;
import com.obapps.schoolchatbot.core.services.embed.DatabaseDocumentStore;
import com.obapps.schoolchatbot.core.services.embed.IDocumentStore;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchContentRetriever;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchQueryType;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.apache.commons.cli.Options;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A utility class for embedding documents into a vector database.
 * This class provides methods to process and embed documents for search and retrieval.
 */
public class EmbedDocuments {

  public EmbedDocuments(
    ILanguageModelFactory factory,
    IDocumentStore documentService,
    EmbedDocumentsOptions options
  ) {
    this.options = options == null ? new EmbedDocumentsOptions() : options;
    this.documentService = documentService == null
      ? new DatabaseDocumentStore()
      : documentService;
    this.modelFactory = factory == null
      ? new StandaloneModelClientFactory()
      : factory;
  }

  private EmbedDocuments(EmbedDocumentsOptions options) {
    this(null, null, options);
  }

  public static void setSignalExit(Boolean signal) {
    if (signal) {
      signalExit = true;
    }
  }

  private static Boolean signalExit = false;
  protected static final Logger log = LoggerFactory.getLogger(
    EmbedDocuments.class
  );
  private final EmbedDocumentsOptions options;
  private EmbeddingModel embeddingModel;
  private final IDocumentStore documentService;
  private final ILanguageModelFactory modelFactory;

  private static ExecutorService executorService =
    Executors.newSingleThreadExecutor();
  private static Future<?> backgroundTask;

  protected EmbeddingModel getEmbeddingModel() {
    if (embeddingModel == null) {
      embeddingModel = modelFactory.createEmbeddingModel();
      if (embeddingModel == null) {
        throw new IllegalStateException("Embedding model is not initialized.");
      }
    }
    return embeddingModel;
  }

  public Integer run() throws Exception {
    Integer ret;
    // Step 1: Authenticate
    try {
      if (!documentService.authenticate()) {
        log.error(
          "Authentication failed.",
          new Exception("Authentication failed.")
        );
        return -1;
      }
      log.trace("Authentication successful.");
    } catch (Exception e) {
      log.error("Authentication Error: " + e.getMessage(), e);
      return -1;
    }
    try {
      // Step 2: Get the list of documents
      var documents = documentService.readDocumentUnits(options.reindex);
      if (documents.isEmpty()) {
        log.info("No documents pending embedding.");
        return 0;
      }

      log.trace("Found {} documents to embed.", documents.size());
      // Step 3: Embed the documents
      ret = embedDocuments(documents);
      log.info("Successfully embedded {} segments", ret);
    } catch (Exception e) {
      log.error("Error: " + e.getMessage(), e);
      return -1;
    }

    return ret;
  }

  protected Integer embedDocuments(List<DocumentUnit> documents)
    throws IOException {
    // Step 1: Create the embedding model
    var openAiVars = EnvVars.getInstance().getOpenAi();

    // Create EmbeddingModel object for Azure OpenAI text-embedding-ada-002
    var embeddingModel = getEmbeddingModel();

    // Create Document Splitter object
    var documentSplitter = DocumentSplitters.recursive(
      openAiVars.getDocumentSplitterMaxTokens(),
      openAiVars.getDocumentSplitterOverlap(),
      modelFactory.getTokenCountEstimator(ModelType.Embedding)
    );

    // Create ContentRetriever object for Azure AI Search with Hybrid Search applied
    var contentRetriever = AzureAiSearchContentRetriever.builder()
      .apiKey(openAiVars.getSearchApiKey())
      .endpoint(openAiVars.getSearchApiEndpoint())
      .dimensions(openAiVars.getVectorSizeLarge())
      .indexName(openAiVars.getSearchIndexName())
      .dimensions(openAiVars.getVectorSizeLarge())
      .createOrUpdateIndex(false)
      .embeddingModel(embeddingModel)
      .queryType(AzureAiSearchQueryType.HYBRID_WITH_RERANKING)
      .maxResults(50)
      .minScore(0.0)
      .build();

    // Step 2: Embed the documents
    Integer succeeded = 0;
    for (var documentUnit : documents) {
      if (signalExit) {
        log.info("Exiting embedding process.");
        return succeeded;
      }

      Boolean embedded = embedDocument(
        contentRetriever,
        documentSplitter,
        embeddingModel,
        documentUnit
      );
      if (embedded) {
        log.trace("Document {} embedded successfully.", documentUnit.unitId);
        succeeded++;
      } else {
        log.warn("Document {} embedding failed.", documentUnit.unitId);
      }
    }
    return succeeded;
  }

  protected Boolean embedDocument(
    AzureAiSearchContentRetriever contentRetriever,
    DocumentSplitter documentSplitter,
    EmbeddingModel embeddingModel,
    DocumentUnit sourceDocumentUnit
  ) { // Custom metadata
    try {
      var embeddings = new ArrayList<Embedding>();
      var segmentsToStore = new ArrayList<TextSegment>();

      Document document = new SchoolDocument(sourceDocumentUnit);
      if (document.text() == null || document.text().isEmpty()) {
        return false;
      }
      List<TextSegment> segments = documentSplitter.split(document);
      for (TextSegment segment : segments) {
        segmentsToStore.add(segment);
        embeddings.add(embeddingModel.embed(segment).content());
      }

      contentRetriever.addAll(embeddings, segmentsToStore);

      var openAi = EnvVars.getInstance().getOpenAi();
      var props = new DocumentUnitEmbeddedProps();
      props.document = sourceDocumentUnit;
      props.embeddingModel = openAi.getDeploymentEmbedding();
      props.embeddings = embeddings;
      props.segments = segmentsToStore;

      // Set embedding model and date
      documentService.onDocumentUnitEmbedded(props);
      return true; // Return true
    } catch (Exception ex) {
      ErrorUtil.handleException(
        log,
        ex,
        "Error embedding document %s:",
        sourceDocumentUnit.unitId
      );
      return false;
    }
  }

  protected void dispose() {
    // Dispose of resources if needed
  }

  public static void cancel(Boolean signal) {
    if (signal) {
      EmbedDocuments.signalExit = true;
      if (backgroundTask != null) {
        try {
          if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
            backgroundTask.cancel(true); // Interrupt if still running after 60 seconds
            executorService.shutdownNow();
            log.warn(
              "Executor service did not terminate gracefully within 60 seconds."
            );
          } else {
            log.info("Executor service terminated gracefully.");
          }
        } catch (InterruptedException e) {
          ErrorUtil.handleException(
            log,
            e,
            "Interrupted while waiting for executor service to terminate."
          );
          executorService.shutdownNow();
        }
      }
    }
  }

  /**
   * The main method to execute the document embedding process.
   *
   * @param args Command-line arguments passed to the application.
   */
  public static void main(String[] args) {
    EmbedDocumentsOptions options;
    try {
      var parser = new org.apache.commons.cli.DefaultParser()
        .parse(new Options(), args);
      if (parser.hasOption("help")) {
        System.out.println("Usage: java EmbedDocuments [options]");
        System.out.println("Options:");
        System.out.println("  --help       Show this help message");
        System.out.println("  --reindex    Reindex already embedded documents");
        System.out.println("  --verbose    Enable verbose logging");
        return;
      }
      options = new EmbedDocumentsOptions()
        .setReindex(parser.hasOption("reindex"))
        .setVerbose(parser.hasOption("verbose"));
    } catch (Exception e) {
      ErrorUtil.handleException(log, e, "Could not parse command line:");
      return;
    }

    var program = new EmbedDocuments(options);
    backgroundTask = executorService.submit(() -> {
      try {
        var res = program.run();
        if (res == -1) {
          System.out.println("Embedding unsuccessful.");
        } else if (options.verbose) {
          System.out.println(
            String.format(
              "Embedding successfully completed, %d items indexed.%n",
              res
            )
          );
        }
      } catch (Exception e) {
        System.out.println("Critical Application Error: " + e.getMessage());
        e.printStackTrace();
      } finally {
        program.dispose();
        System.out.println("Program disposed successfully.");
      }
      System.out.println("All done...");
    });

    System.out.println("Task submitted to background thread.");
  }
}
