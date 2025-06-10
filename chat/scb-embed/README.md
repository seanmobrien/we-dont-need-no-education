# SCB Embed Module

The SCB (School Chatbot) Embed module provides comprehensive document embedding and vector search capabilities for the Title IX Compliance Platform. It handles the conversion of documents into vector embeddings for semantic search, policy document processing, and content similarity analysis.

## Purpose

This module enables advanced semantic search and document similarity features through:
- **Document Embedding**: Converting text documents into high-dimensional vector representations
- **Vector Search**: Semantic similarity search across document collections
- **Policy Processing**: Specialized handling of educational policies and legal documents
- **Content Indexing**: Efficient indexing and retrieval of embedded documents
- **Similarity Analysis**: Document clustering and similarity detection

## Key Components

### Document Embedders
- **`EmbedDocuments`**: General-purpose document embedding for school documents
- **`EmbedFeds`**: Federal policy and regulation embedding processor
- **`EmbedMnLaw`**: Minnesota state law and education code embedding
- **`EmbedPlsas`**: PLSAS (Professional Learning Standards and Assessments) document processing
- **`FileSystemEmbedder`**: File system-based document processing and embedding

## Features

### Document Processing Pipeline
```java
// Example document embedding workflow
FileSystemEmbedder embedder = new FileSystemEmbedder();

// Process documents from file system
EmbedDocumentsOptions options = EmbedDocumentsOptions.builder()
    .sourceDirectory("/path/to/documents")
    .embeddingModel("text-embedding-ada-002")
    .chunkSize(1000)
    .chunkOverlap(200)
    .build();

// Generate embeddings
List<DocumentEmbedding> embeddings = embedder.processDocuments(options);
```

### Specialized Document Types

#### Federal Documents (`EmbedFeds`)
- Federal education regulations and policies
- Title IX federal guidelines
- FERPA and other federal education laws
- Federal court decisions and interpretations

#### State Laws (`EmbedMnLaw`)
- Minnesota education statutes
- State-specific Title IX requirements
- Local compliance regulations
- State court decisions and precedents

#### Professional Standards (`EmbedPlsas`)
- Professional learning standards
- Assessment frameworks
- Educator certification requirements
- Professional development guidelines

### Vector Search Capabilities

#### Semantic Search
```java
// Semantic document search
VectorSearchService searchService = new VectorSearchService();

// Find similar documents
List<DocumentMatch> matches = searchService.findSimilar(
    queryEmbedding, 
    threshold: 0.8,
    maxResults: 10
);

// Policy-specific search
List<PolicyMatch> policyMatches = searchService.searchPolicies(
    "Title IX investigation procedures",
    PolicyType.FEDERAL
);
```

#### Content Similarity
```java
// Document similarity analysis
SimilarityAnalyzer analyzer = new SimilarityAnalyzer();

// Calculate document similarity
double similarity = analyzer.calculateSimilarity(doc1Embedding, doc2Embedding);

// Find related documents
List<RelatedDocument> related = analyzer.findRelatedDocuments(
    documentId,
    similarityThreshold: 0.7
);
```

## Embedding Models

### Supported Models
- **OpenAI text-embedding-ada-002**: High-quality general-purpose embeddings
- **Azure OpenAI Embeddings**: Enterprise-grade embedding models
- **Custom Educational Models**: Specialized models trained on educational content
- **Multi-modal Embeddings**: Support for text and document structure embeddings

### Model Configuration
```java
// Embedding model configuration
EmbeddingModelConfig config = EmbeddingModelConfig.builder()
    .modelName("text-embedding-ada-002")
    .dimensions(1536)
    .maxTokens(8192)
    .batchSize(100)
    .apiEndpoint("https://api.openai.com/v1/embeddings")
    .build();
```

## Document Processing

### Text Extraction
- **PDF Processing**: Extract text from PDF documents with layout preservation
- **HTML Processing**: Clean HTML content extraction
- **Office Documents**: Word, Excel, PowerPoint content extraction
- **Plain Text**: UTF-8 text file processing

### Content Chunking
```java
// Intelligent document chunking
DocumentChunker chunker = new DocumentChunker();

ChunkingOptions options = ChunkingOptions.builder()
    .maxChunkSize(1000)
    .overlap(200)
    .preserveSentences(true)
    .respectParagraphs(true)
    .build();

List<DocumentChunk> chunks = chunker.chunkDocument(document, options);
```

### Metadata Extraction
- **Document Properties**: Title, author, creation date, document type
- **Content Analysis**: Key phrases, entities, topics
- **Structural Information**: Headings, sections, tables
- **Legal Citations**: Case law references, statute citations

## Storage and Indexing

### Vector Storage
- **PostgreSQL with pgvector**: Native vector storage and search
- **Azure Cognitive Search**: Cloud-based vector search service
- **In-Memory Indexes**: Fast temporary indexes for processing
- **Hybrid Storage**: Combination of database and file system storage

### Index Management
```java
// Vector index management
VectorIndexManager indexManager = new VectorIndexManager();

// Create specialized indexes
indexManager.createIndex("federal_policies", 
    IndexType.HNSW, 
    dimensions: 1536);

indexManager.createIndex("state_laws", 
    IndexType.IVF, 
    dimensions: 1536);

// Bulk indexing
indexManager.bulkIndex("federal_policies", embeddings);
```

## Search and Retrieval

### Query Processing
```java
// Advanced query processing
QueryProcessor processor = new QueryProcessor();

// Natural language queries
SearchQuery query = processor.parseQuery(
    "Title IX investigation timeline requirements"
);

// Structured queries
StructuredQuery structuredQuery = StructuredQuery.builder()
    .text("investigation procedures")
    .documentType(DocumentType.POLICY)
    .source(PolicySource.FEDERAL)
    .dateRange(DateRange.lastYear())
    .build();
```

### Result Ranking
- **Semantic Similarity**: Vector cosine similarity scoring
- **Content Relevance**: TF-IDF and BM25 scoring
- **Document Authority**: Source credibility and recency weighting
- **User Context**: Personalized relevance based on user role

### Hybrid Search
```java
// Combination of vector and keyword search
HybridSearchService hybridSearch = new HybridSearchService();

SearchResults results = hybridSearch.search(
    query: "Title IX compliance training",
    vectorWeight: 0.7,
    keywordWeight: 0.3,
    filters: Map.of("documentType", "policy", "source", "federal")
);
```

## Performance Optimization

### Embedding Generation
- **Batch Processing**: Efficient batch embedding generation
- **Caching**: Embedding cache for frequently accessed documents
- **Parallel Processing**: Multi-threaded embedding computation
- **Rate Limiting**: API rate limit management for external services

### Search Optimization
- **Index Preloading**: Warm-up procedures for fast search responses
- **Query Caching**: Cache frequent queries and results
- **Result Pagination**: Efficient large result set handling
- **Approximate Search**: Fast approximate similarity search for large datasets

## Configuration

### Environment Variables
```bash
# Embedding Service Configuration
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSIONS=1536
EMBEDDING_BATCH_SIZE=100
EMBEDDING_API_ENDPOINT=https://api.openai.com/v1/embeddings

# Vector Storage Configuration
VECTOR_DB_URL=postgresql://localhost:5432/vectors
VECTOR_INDEX_TYPE=hnsw
VECTOR_DISTANCE_METRIC=cosine

# Processing Configuration
MAX_DOCUMENT_SIZE=10485760  # 10MB
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
PARALLEL_PROCESSING_THREADS=4
```

### Model Selection
```java
// Model configuration for different document types
Map<DocumentType, EmbeddingModel> modelConfig = Map.of(
    DocumentType.FEDERAL_POLICY, new OpenAIEmbeddingModel("text-embedding-ada-002"),
    DocumentType.STATE_LAW, new AzureEmbeddingModel("text-embedding-ada-002"),
    DocumentType.SCHOOL_POLICY, new CustomEmbeddingModel("education-specialized-v1")
);
```

## Testing

### Unit Tests
- **Embedding Generation**: Test embedding quality and consistency
- **Document Processing**: Validate text extraction and chunking
- **Search Functionality**: Test search accuracy and performance
- **Index Management**: Validate index creation and maintenance

### Integration Tests
- **End-to-End Processing**: Full document processing pipeline tests
- **Search Performance**: Large-scale search performance validation
- **Model Integration**: Test integration with different embedding models
- **Storage Integration**: Database and file system integration tests

### Performance Testing
```java
@PerformanceTest
class EmbeddingPerformanceTest {
    
    @Test
    void testBatchEmbeddingPerformance() {
        List<Document> documents = generateTestDocuments(1000);
        
        long startTime = System.currentTimeMillis();
        List<DocumentEmbedding> embeddings = embedder.batchEmbed(documents);
        long duration = System.currentTimeMillis() - startTime;
        
        assertThat(duration).isLessThan(30000); // 30 seconds
        assertThat(embeddings).hasSize(1000);
    }
}
```

## Error Handling

### Exception Management
```java
// Embedding-specific exceptions
public class EmbeddingException extends Exception {
    private final String documentId;
    private final String modelName;
    
    public EmbeddingException(String documentId, String modelName, 
                             String message, Throwable cause) {
        super(message, cause);
        this.documentId = documentId;
        this.modelName = modelName;
    }
}

// Search exceptions
public class VectorSearchException extends Exception {
    private final String query;
    private final String indexName;
}
```

### Retry Logic
```java
// Robust retry logic for external API calls
@Retryable(value = {EmbeddingException.class}, 
          maxAttempts = 3, 
          backoff = @Backoff(delay = 1000, multiplier = 2))
public DocumentEmbedding generateEmbedding(Document document) {
    // Embedding generation with automatic retry
}
```

## Monitoring and Analytics

### Performance Metrics
- Embedding generation throughput and latency
- Search query response times and accuracy
- Index size and storage utilization
- API usage and cost tracking

### Quality Metrics
- Embedding quality scores and validation
- Search relevance and user satisfaction metrics
- Document processing accuracy rates
- Error rates and failure analysis

## Integration with Main System

### Search Tool Integration
```java
// Integration with chatbot search tools
@Tool(name = "searchPolicies")
public String searchPolicyDocuments(
    @P("query") String query,
    @P("documentType") String documentType,
    @P("maxResults") int maxResults) {
    
    SearchResults results = embeddingService.searchPolicies(
        query, DocumentType.valueOf(documentType), maxResults);
    
    return formatSearchResults(results);
}
```

### Real-time Processing
- **Document Upload**: Automatic embedding generation for new documents
- **Index Updates**: Real-time index updates as documents are processed
- **Search API**: RESTful API for search functionality
- **Webhook Integration**: Event-driven processing for document changes

## Advanced Features

### Clustering and Analysis
```java
// Document clustering for content organization
DocumentClusterer clusterer = new DocumentClusterer();

List<DocumentCluster> clusters = clusterer.clusterDocuments(
    embeddings,
    clusteringAlgorithm: ClusteringAlgorithm.KMEANS,
    numClusters: 10
);

// Topic modeling
TopicModeler topicModeler = new TopicModeler();
List<Topic> topics = topicModeler.extractTopics(documents, numTopics: 20);
```

### Multi-language Support
- **Language Detection**: Automatic language identification
- **Cross-language Search**: Search across documents in different languages
- **Translation Integration**: Automatic translation for embedding generation
- **Multilingual Models**: Support for multilingual embedding models

## Contributing

When extending the embedding module:
1. **Test Embedding Quality**: Validate embedding quality with domain-specific test sets
2. **Performance Testing**: Ensure new features maintain search performance
3. **Model Compatibility**: Test with different embedding models and configurations
4. **Documentation**: Update search documentation and API references
5. **Cost Monitoring**: Consider API costs for new embedding model usage

## Dependencies

### Core Dependencies
- **LangChain4j**: AI framework for embedding generation
- **OpenAI Java**: OpenAI API client for embeddings
- **Azure AI**: Azure cognitive services integration
- **PostgreSQL**: Vector storage with pgvector extension
- **Apache PDFBox**: PDF text extraction

### Optional Dependencies
- **Azure Cognitive Search**: Cloud vector search service
- **Elasticsearch**: Alternative search engine integration
- **Apache Lucene**: Full-text search capabilities
- **Sentence Transformers**: Alternative embedding models