package com.obapps.schoolchatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.JsonObject;
import com.obapps.schoolchatbot.data.*;
import com.obapps.schoolchatbot.util.EnvVars;
import com.obapps.schoolchatbot.util.Strings;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.azure.AzureOpenAiEmbeddingModel;
import dev.langchain4j.model.azure.AzureOpenAiTokenizer;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchContentRetriever;
import dev.langchain4j.rag.content.retriever.azure.search.AzureAiSearchQueryType;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import okhttp3.*;
import org.apache.commons.cli.Options;

/**
 * A utility class for embedding documents into a vector database.
 * This class provides methods to process and embed documents for search and retrieval.
 */
public class EmbedDocuments {

  private EmbedDocuments(EmbedDocumentsOptions options) {
    this.options = options;
    httpClient = new OkHttpClient.Builder().followRedirects(false).build();
  }

  private String authCookies;
  private final EmbedDocumentsOptions options;
  private final OkHttpClient httpClient;

  // private final ObjectMapper objectMapper;

  public Boolean run() throws Exception {
    if (
      EnvVars.getInstance().get("PIPELINES_EMBEDDOCUMENTS_ENABLED") == "false"
    ) {
      System.out.println("Embedding is disabled.");
      return false;
    }
    // Step 1: Authenticate
    try {
      this.authCookies = authenticate();
      if (options.verbose) {
        System.out.println("  Authenticated successfully");
      }
    } catch (Exception e) {
      System.out.println("Error: " + e.getMessage());
      return false;
    }
    // Step 2: Get the list of documents
    var documents = readDocumentUnits();
    if (documents.isEmpty()) {
      System.out.println("No documents to embed.");
      return true;
    }
    if (options.verbose) {
      System.out.println(
        "  Found " + documents.size() + " documents to embed."
      );
    }
    // Step 3: Embed the documents
    embedDocuments(documents);
    return true;
  }

  protected Integer embedDocuments(List<DocumentUnit> documents)
    throws IOException {
    // Step 1: Create the embedding model
    var openAiVars = EnvVars.getInstance().getOpenAi();

    // Create EmbeddingModel object for Azure OpenAI text-embedding-ada-002
    var embeddingModel = AzureOpenAiEmbeddingModel.builder()
      .apiKey(openAiVars.getApiKey())
      .endpoint(openAiVars.getApiEndpoint())
      .deploymentName(openAiVars.getDeploymentEmbedding())
      .logRequestsAndResponses(true)
      .build();

    // Create Document Splitter object
    var documentSplitter = DocumentSplitters.recursive(
      254,
      40,
      new AzureOpenAiTokenizer("gpt-4o-2024-11-20")
    );

    // Create ContentRetriever object for Azure AI Search with Hybrid Search applied
    var contentRetriever = AzureAiSearchContentRetriever.builder()
      .apiKey(openAiVars.getSearchApiKey())
      .endpoint(openAiVars.getSearchApiEndpoint())
      .dimensions(1536)
      .indexName(openAiVars.getSearchIndexName())
      .createOrUpdateIndex(false)
      .embeddingModel(embeddingModel)
      .queryType(AzureAiSearchQueryType.HYBRID_WITH_RERANKING)
      .maxResults(50)
      .minScore(0.0)
      .build();

    // Step 2: Embed the documents
    Integer succeeded = 0;
    for (var documentUnit : documents) {
      Boolean embedded = embedDocument(
        contentRetriever,
        documentSplitter,
        embeddingModel,
        documentUnit
      );
      if (embedded) {
        succeeded++;
        if (options.verbose) {
          System.out.println(
            "  Document " + documentUnit.unitId + " embedded successfully."
          );
        }
      } else {
        System.out.println(
          "  Document " + documentUnit.unitId + " embedding failed."
        );
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
    var embeddings = new ArrayList<Embedding>();
    var segmentsToStore = new ArrayList<TextSegment>();

    Document document = new SchoolDocument(sourceDocumentUnit);
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
    // Set embedding model and date
    setDocumentUnitEmbeddedOn(
      sourceDocumentUnit,
      EnvVars.getInstance().getOpenAi().getDeploymentEmbedding()
    );
    return true;
  }

  protected void setDocumentUnitEmbeddedOn(
    DocumentUnit documentUnit,
    String embeddingModel
  ) {
    JsonObject jsonObject = new JsonObject();
    jsonObject.addProperty("unitId", documentUnit.unitId);
    jsonObject.addProperty("embeddingModel", embeddingModel);
    jsonObject.addProperty(
      "embeddedOn",
      OffsetDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME)
    );
    // Step 2: PUT it over to the server for update
    var restApiVars = EnvVars.getInstance().getRestService();
    var request = new Request.Builder()
      .url(
        restApiVars.getServiceUrl("/api/document-unit/" + documentUnit.unitId)
      )
      .put(
        RequestBody.create(
          jsonObject.toString(),
          MediaType.parse("application/json")
        )
      )
      .addHeader("Cookie", authCookies)
      .build();
    var response = httpClient.newCall(request);
    try {
      var processed = response.execute();
      if (!processed.isSuccessful()) {
        System.out.println("Unexpected response code: " + processed.code());
      }
      processed.close();
      // Step 2: Parse the JSON response
    } catch (IOException e) {
      System.out.println("Unexpected response code: " + e.getMessage());
    }
  }

  protected String authenticate() throws IOException {
    // Step 1: POST to the auth endpoint
    var restApiVars = EnvVars.getInstance().getRestService();
    var request = new Request.Builder()
      .url(restApiVars.getServiceUrl("/api/auth/callback/credentials"))
      .post(new FormBody.Builder().build())
      .addHeader(
        restApiVars.getAuthHeaderBypassKey(),
        restApiVars.getAuthHeaderBypassValue()
      )
      .build();
    var authResponse = httpClient.newCall(request).execute();
    try {
      // Step 2: Capture cookies
      Headers headers = authResponse.headers();
      StringBuilder authCookies = new StringBuilder();
      headers
        .values("Set-Cookie")
        .forEach((String setCookie) -> {
          var idxOf = setCookie.indexOf(";");
          if (idxOf > 0) {
            setCookie = setCookie.substring(0, idxOf);
          }
          authCookies.append(setCookie).append("; ");
        });
      if (authCookies.indexOf("authjs.session-token=") == -1) {
        throw new IOException("Login unsuccessful; No session token found.");
      }
      return authCookies.substring(0, authCookies.length() - 2);
    } finally {
      authResponse.close();
    }
  }

  protected List<DocumentUnit> readDocumentUnits() throws IOException {
    // Step 1: GET the list of documents
    var restApiVars = EnvVars.getInstance().getRestService();

    var request = new Request.Builder()
      // It's late, going to cheat a little bit and return document content as well
      .url(
        restApiVars.getServiceUrl(
          "/api/document-unit?limit=1000&offset=0&content=true&pending=true"
        )
      )
      .get()
      .addHeader("Cookie", authCookies)
      .build();
    var response = httpClient.newCall(request).execute();
    try {
      if (!response.isSuccessful()) {
        throw new IOException("Unexpected code " + response);
      }
      // Step 2: Parse the JSON response
      ObjectMapper objectMapper = Strings.objectMapperFactory();

      var results = objectMapper.readValue(
        response.body().string(),
        PaginatedResults.class
      );
      if (results == null || results.results == null) {
        throw new IOException("Unexpected result shape");
      }
      return results.results;
    } finally {
      response.close();
    }
  }

  protected void dispose() {
    // Dispose of resources if needed
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
      System.out.println("Could not parse command line: " + e.getMessage());
      return;
    }
    var program = new EmbedDocuments(options);
    try {
      var res = program.run();
      if (!res) {
        System.out.println("Embedding unsuccessful.");
      } else if (options.verbose) {
        System.out.println("Embedding successfully completed.");
      }
    } catch (Exception e) {
      System.out.println("Critical Application Error: " + e.getMessage());
      e.printStackTrace();
    } finally {
      program.dispose();
    }
    System.out.println("All done...");
  }
}
