package com.obapps.schoolchatbot.core.assistants;

import com.obapps.core.ai.extraction.models.IRecordExtractionEnvelope;
import com.obapps.core.ai.extraction.services.IterationEventArgs;
import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.util.Db;
import com.obapps.core.util.IDbTransaction;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContent;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentListBase;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;
import com.obapps.schoolchatbot.core.assistants.services.ai.phases.IPhaseAnalyst;
import com.obapps.schoolchatbot.core.assistants.types.IStageAnalystController;
import com.obapps.schoolchatbot.core.models.AnalystDocumentResult;
import com.obapps.schoolchatbot.core.models.DocumentProperty;
import com.obapps.schoolchatbot.core.models.DocumentPropertyType;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisFunctionAudit;
import com.obapps.schoolchatbot.core.models.DocumentUnitAnalysisStageAudit;
import com.obapps.schoolchatbot.core.models.ai.phases.BasePhaseRecord;
import com.obapps.schoolchatbot.core.util.ContentMapper;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ChatMessageType;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.injector.ContentInjector;
import java.sql.SQLException;
import java.util.List;
import java.util.function.BiConsumer;

/**
 * The `DocumentChatAssistant` class is an abstract base class that extends the `ChatAssistant` class
 * and implements the `ContentInjector` and `IStageAnalyst` interfaces. It provides functionality for
 * processing documents, injecting augmented content, and managing the state of detected points and notes.
 *
 * @param <TContentListType> A type parameter that extends `AugmentedContentListBase`, representing the
 *                           type of augmented content list used by the assistant.
 *
 * <p>This class includes methods for:
 * <ul>
 *   <li>Processing documents and generating analysis results.</li>
 *   <li>Injecting augmented content into user messages.</li>
 *   <li>Managing the state of detected points and added notes.</li>
 *   <li>Retrieving and formatting document contents, optionally including metadata.</li>
 * </ul>
 *
 * <p>Subclasses must implement the `generatePrompt` method to define how prompts are generated
 * based on the augmented content list.
 *
 * <p>Key Fields:
 * <ul>
 *   <li>`phaseId`: Represents the current phase or stage of the assistant.</li>
 *   <li>`detectedPoints`: Tracks the number of detected points during processing.</li>
 *   <li>`addedNotes`: Tracks the number of notes added during processing.</li>
 *   <li>`Content`: Represents the augmented content list used by the assistant.</li>
 * </ul>
 *
 * <p>Key Methods:
 * <ul>
 *   <li>`processDocument`: Processes a document by its ID and generates an analysis result.</li>
 *   <li>`inject`: Injects augmented content into a user message and generates a prompt.</li>
 *   <li>`getDocumentContents`: Retrieves the contents of a document, optionally including metadata.</li>
 *   <li>`addDetectedPoint` and `addNote`: Increment the counts of detected points and notes, respectively.</li>
 *   <li>`resetMessageState`: Resets the state of detected points, notes, and content.</li>
 * </ul>
 *
 * <p>Usage Notes:
 * <ul>
 *   <li>The class is designed to be extended by subclasses that provide specific implementations
 *       for document processing and prompt generation.</li>
 *   <li>The `getDb` method provides access to the database instance, either from the provided
 *       `AssistantProps` or a singleton instance.</li>
 *   <li>The `getDocumentContents` methods provide flexibility in retrieving document content
 *       with or without metadata.</li>
 * </ul>
 */
public abstract class DocumentChatAssistant<
  TContentListType extends AugmentedContentListBase
>
  extends ChatAssistant
  implements ContentInjector, IStageAnalystController {

  private Class<TContentListType> clazz = null;

  /**
   * Protected constructor for the DocumentChatAssistant class.
   * Initializes a new instance of the DocumentChatAssistant.
   * This constructor is intended to be used within the package or by subclasses.
   */
  protected DocumentChatAssistant() {
    super();
    this.phaseId = 0;
  }

  /**
   * Constructs a new instance of the DocumentChatAssistant.
   *
   * @param initialRequest The initial request or message to set as the auto-response
   *                       for this assistant.
   */
  protected DocumentChatAssistant(
    Class<TContentListType> clazz,
    AssistantProps props
  ) {
    super();
    this.clazz = clazz;
    this.setAutoResponse(props.initialRequest);
    this.phaseId = props.phase;
    this.database = props.database;
    if (props.includeReplyTo) {
      this.includeReplyTo = true;
    }
  }

  private Db database = null;
  private Db activeDb = null;
  private IDbTransaction transaction = null;

  protected Db getDb() throws SQLException {
    if (this.database != null) {
      return this.database;
    }
    if (this.activeDb != null) {
      return this.activeDb;
    }
    this.activeDb = Db.createUnitOfWork();
    return this.activeDb;
  }

  protected IDbTransaction getTransaction() throws SQLException {
    if (this.transaction != null) {
      return this.transaction;
    }
    this.transaction = getDb().createTransaction();
    return this.transaction;
  }

  private final Integer phaseId;

  protected Integer getPhase() {
    return phaseId;
  }

  /**
   * A flag indicating whether the analysisComplete method has been called.
   * This is used to track the completion status of the analysis process.
   */
  private boolean analysisCompleteCalled = false;
  /**
   * Represents the number of detected points in the document.
   * This field is private to encapsulate its access within the class.
   * It is used to track the number of points detected during processing.
   */
  private Integer detectedPoints = 0;
  /**
   * Represents the number of processing notes that were added during the analysis.
   * This field is private to encapsulate its access within the class.
   * It is used to track the number of notes added during processing.
   */
  private Integer addedNotes = 0;
  /**
   * Represents the augmented content list used by the assistant.
   * This field is protected to allow access within the class and its subclasses.
   * Is set on prompt injection.
   */
  protected TContentListType Content;
  /**
   * Represents the index of the current iteration in the analysis process.
   * This field is private to encapsulate its access within the class.
   * It is used to track the current iteration index during processing.
   */
  private Integer iterationIndex = 0;

  /**
   * Retrieves the current iteration index.
   *
   * @return the iteration index as an Integer.
   */
  public Integer getIterationIndex() {
    return iterationIndex + 1;
  }

  /**
   * Retrieves the number of detected points.
   *
   * @return the detected points as an Integer.
   */
  public Integer getDetectedPoints() {
    return detectedPoints;
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  public void addDetectedPoint(AugmentedContent item) {
    detectedPoints++;
    if (item != null && Content != null) {
      Content.add(item);
    }
  }

  /**
   * Retrieves the number of detected points.
   *
   * @return the detected points as an Integer.
   */
  public Integer getAddedNotes() {
    return addedNotes;
  }

  public boolean isAnalysisCompleteCalled() {
    return analysisCompleteCalled;
  }

  public void setAnalysisCompleteCalled(boolean analysisCompleteCalled) {
    this.analysisCompleteCalled = analysisCompleteCalled;
  }

  /**
   * Increments the count of detected points by one.
   * This method is used to track the number of detected points
   * during the execution of the program.
   */
  public void addNote() {
    addedNotes++;
  }

  /**
   * Resets the state of the message by clearing detected points, added notes,
   * and content. This method is typically used to initialize or reset the
   * assistant's state for processing new input.
   */
  public void resetMessageState() {
    analysisCompleteCalled = false;
    detectedPoints = 0;
    addedNotes = 0;
    iterationIndex = 0;
    Content = null;
    messageWindowMemory.clear();
  }

  /**
   * Processes a document based on the provided document ID.  Set up to support RecordExtraactionService-
   * based workflow, but should be flexible enough to support non-standerd AiSevrvice-based workflows as well.
   * @implNote This method's primary responsibility is to manage the transaction, error handling, and global
   * mesage state.  It then delegates the actual document processing to the `processDocumentExtract` method,
   * which provides subclasses with the flexibility to implement their own processing logic
   * @param documentId The ID of the document to process. Must be a positive integer.
   * @return An instance of {@link AnalystDocumentResult} containing the results of the document processing.
   * @throws IllegalArgumentException If the provided document ID is null or not a positive integer.
   * @throws Exception If an error occurs during document processing.
   */
  public synchronized AnalystDocumentResult processDocument(
    Integer documentId
  ) {
    try {
      var result = AnalystDocumentResult.aggregateBuilder();
      var thisDb = this.getDb();
      IDbTransaction tx = this.getTransaction();
      try (tx) {
        this.resetMessageState();
        if (documentId == null || documentId <= 0) {
          throw new IllegalArgumentException(
            "Document ID must be a positive integer."
          );
        }
        var actualResult = this.processDocumentExtract(tx, documentId);
        result.append(actualResult);
      } catch (Exception e) {
        tx.setAbort();
        log.error(
          "Error processing document {}: {}",
          documentId,
          e.getMessage(),
          e
        );
        result.append(new AnalystDocumentResult(e, 0, 0));
      } finally {
        this.transaction = null;
        if (this.database == null && thisDb != null) {
          thisDb.close();
        }
      }
      return result.build();
    } catch (Exception e) {
      log.error(
        "Error processing document {}: {}",
        documentId,
        e.getMessage(),
        e
      );
      return new AnalystDocumentResult(e, detectedPoints, addedNotes);
    }
  }

  /**
   * Handles the processing of a documents during a batch analysis iteration.  It is intended
   * be called during the onDocumentBatchCallback handler of {@link RecordExtractService} This method
   * supports common operations most analysis batches will perform, like:
   * - Appends the current iteration's results to the aggregate result.
   * - Logs the iteration progress and summary.
   * - Updates document records with the provided document ID if necessary.
   * - Adds processing notes to the database.
   * - Generates and saves an audit record for the current analysis stage.
   *
   * @param <TModel>        The type of the base phase record being processed.
   * @param <TModelResult>  The type of the record extraction envelope containing the results.
   * @param result          The aggregate builder for the analyst document results.
   * @param args            The iteration event arguments containing iteration-specific data.
   *
   * @throws RuntimeException If an SQL exception occurs while saving audit results to the database.
   */
  protected <
    TModel extends BasePhaseRecord,
    TModelResult extends IRecordExtractionEnvelope<TModel>
  > void onDocumentBatchProcessed(
    AnalystDocumentResult.AggregateBuilder result,
    IterationEventArgs<TModel, TModelResult> args
  ) {
    var iterationResult = args.getIterationResult();
    var docResult = new AnalystDocumentResult(
      iterationResult,
      true,
      0,
      args.getNewRecords(),
      args.getHasSignaledComplete()
    );
    result.append(docResult);

    log.info(
      "Iteration {} ({} items remain): {}",
      args.getIteration(),
      args.getEstimatedItemsRemaining(),
      docResult.getSummary()
    );
    var records = iterationResult.content().getResults();
    // Do we have enough info to handle document id?
    Integer documentId = args.getProperty("documentId", 0);
    if (documentId == null || documentId < 1) {
      return;
    }
    for (var record : records) {
      if (record.getDocumentId() == null || record.getDocumentId() == 0) {
        record.setDocumentId(documentId);
      }
    }

    try {
      var addedNotes = 0;
      var notes = iterationResult.content().getProcessingNotes();
      if (notes != null) {
        for (var note : notes) {
          if (note == null || note.isEmpty()) {
            continue;
          }
          DocumentProperty.builder()
            .documentId(documentId)
            .propertyValue(note)
            .propertyType(DocumentPropertyType.KnownValues.ProcessingNote)
            .build()
            .addToDb(getTransaction());
          addedNotes++;
          addNote();
        }
      }
      // Generate an analysis audit record
      var auditRecord = DocumentUnitAnalysisStageAudit.builder()
        .documentId(documentId)
        .iterationId(args.getIteration())
        .completionSignalled(false)
        .analysisStageId(getPhase())
        .detectedPoints(args.getNewRecords())
        .addedNotes(addedNotes)
        .tokens(iterationResult.tokenUsage());
      if (args.getHasSignaledComplete()) {
        if (args.getProperty("inPostProcessingQueue", false)) {
          auditRecord = auditRecord.inPostProcessingQueue(true);
        } else {
          auditRecord = auditRecord.completionSignalled(true);
        }
      } else {
        auditRecord.completionSignalled(false);
      }
      if (args.getProperty("message", null) != null) {
        auditRecord.message(args.getProperty("message", null));
      } else {
        auditRecord.message(
          String.format("(%d items remain)", args.getEstimatedItemsRemaining())
        );
      }
      // AUDIT: Save the audit record to the database
      auditRecord
        .build()
        .saveToDb(
          transaction.getDb(),
          DocumentUnitAnalysisFunctionAudit.from(
            iterationResult.toolExecutions()
          )
        );
    } catch (SQLException e) {
      log.error(
        "Error saving document stage audit results for document {}: {}",
        documentId,
        e.getMessage(),
        e
      );
      throw new RuntimeException(e);
    }
  }

  /**
   * Extracts records from a document using a specified service and processes each iteration
   * with a provided callback function.  I know, we're bouncing around a lot here...I'd
   * pretend it's all duesto some deep and insigthful design that has a uncalculable effect
   * on scalibility, but really, Ijust haven't figured out Java genreic quite yet.  This
   * flippping language! I swear I think half of the architecture extss soleuy to
   * spite c.
   *
   * @param <TModel> The type of the model that extends {@link BasePhaseRecord}.
   * @param <TEnvelope> The type of the envelope that implements {@link IRecordExtractionEnvelope}.
   * @param <TService> The type of the service that implements {@link IPhaseAnalyst}.
   * @param clazz The class type of the service to be used for record extraction.
   * @param documentId The ID of the document from which records are to be extracted.
   * @param onIterationProcessed A callback function that processes each iteration event.
   *                              It accepts an {@link AnalystDocumentResult.AggregateBuilder}
   *                              and {@link IterationEventArgs} as parameters.
   * @return An {@link AnalystDocumentResult} containing the aggregated results of the extraction process.
   */
  protected <
    TModel extends BasePhaseRecord,
    TEnvelope extends IRecordExtractionEnvelope<TModel>,
    TService extends IPhaseAnalyst<TModel, TEnvelope>
  > AnalystDocumentResult extractRecords(
    Class<TService> clazz,
    Integer documentId,
    BiConsumer<
      AnalystDocumentResult.AggregateBuilder,
      IterationEventArgs<TModel, TEnvelope>
    > onIterationProcessed
  ) {
    var results = AnalystDocumentResult.aggregateBuilder();
    new RecordExtractionService<TModel>().extractRecords(
      getAiService(clazz),
      ai -> ai.processStage(documentId),
      ctx ->
        ctx
          .getService()
          .resumeExtraction(ctx.getIteration(), ctx.getMatchesFound()),
      (sender, args) ->
        onIterationProcessed.accept(
          results,
          args.setProperty("documentId", documentId)
        )
    );
    return results.build();
  }

  protected abstract AnalystDocumentResult processDocumentExtract(
    IDbTransaction tx,
    Integer documentId
  ) throws Exception;

  /**
   * Injects augmented content into the user message and generates a prompt.
   *
   * @param sourceContent A list of content objects to be augmented and injected.
   * @param userMessage The user message to which the augmented content will be applied.
   * @return A new UserMessage object with the generated prompt.
   */
  public final UserMessage inject(
    List<Content> sourceContent,
    ChatMessage userMessage
  ) {
    if (userMessage.type() != ChatMessageType.USER) {
      // We only want to inject into user messages
      log.warn(
        "Attempted to inject into a non-user message: {}",
        sourceContent
      );
      return UserMessage.builder()
        .contents(ContentMapper.fromRagContent(sourceContent))
        .build();
    }
    if (Content != null) {
      log.info(
        "Continuing coversation using active document {}.\n\tUser Message: {}",
        Content.getActiveDocument().getDocumentId(),
        userMessage.toString()
      );
      return UserMessage.builder()
        .contents(ContentMapper.fromRagContent(sourceContent))
        .build();
    }
    // Technically I don't love this; it would be better if I waited until after
    // injection to set assistant state.
    Content = getList(sourceContent);
    var prompt = generatePrompt(Content);
    return prompt == null
      ? UserMessage.builder()
        .contents(ContentMapper.fromRagContent(sourceContent))
        .build()
      : prompt;
  }

  /**
   * Creates an instance of AugmentedContentList from a given list of Content objects.
   *
   * @param source the list of Content objects to be converted into an AugmentedContentList.
   *               Must not be null.
   * @return an AugmentedContentList containing augmented content derived from the provided source list.
   */
  @SuppressWarnings("unchecked")
  public <TList extends TContentListType> TList getList(List<Content> source) {
    TList ret;
    try {
      ret = (TList) this.clazz.getDeclaredConstructor().newInstance();
    } catch (Exception e) {
      throw new RuntimeException("Failed to create an instance of TList", e);
    }
    if (source != null) {
      for (Content content : source) {
        AugmentedContent augmentedContent =
          AugmentedSearchMetadataType.createAugmentedContent(content);
        ret.add(augmentedContent);
      }
    }
    return ret;
  }

  /**
   * Generates a prompt based on the current stage and the provided user input.
   *
   * @param userMessage The user message containing the input content and context.
   * @return A UserMessage object representing the generated prompt.
   */
  protected abstract UserMessage generatePrompt(TContentListType content);

  /**
   * Retrieves the content associated with this instance.
   *
   * @return the content of type {@code TContentListType}.
   */
  public TContentListType getContent() {
    return Content;
  }

  /**
   * Retrieves the document with its associated metadata content.
   *
   * @return A {@link DocumentWithMetadataContent} object representing the document.
   */
  public DocumentWithMetadataContent getSourceDocument() {
    if (Content != null) {
      return Content.getActiveDocumentContent();
    }
    return null;
  }

  /**
   * Retrieves the contents of a document.
   * This method acts as a wrapper to fetch the document contents
   * with default parameters.
   *
   * @return The contents of the document as a String.
   */
  protected String getDocumentContents() {
    return getDocumentContents(Content, true);
  }

  /**
   * Retrieves the contents of a document, optionally including metadata.
   *
   * @param includeMetadata A Boolean flag indicating whether to include metadata in the document contents.
   * @return A String representing the contents of the document, with or without metadata based on the input flag.
   */
  protected String getDocumentContents(Boolean includeMetadata) {
    return getDocumentContents(Content, true);
  }

  /**
   * Retrieves the contents of a document from the provided AugmentedContentList.
   * This method delegates to an overloaded version of getDocumentContents with
   * additional parameters.
   *
   * @param contents The AugmentedContentList containing the document data.
   * @return A String representing the contents of the document.
   */
  protected String getDocumentContents(AugmentedContentListBase contents) {
    return getDocumentContents(contents, true);
  }

  /**
   * Retrieves the content of the active document from the provided
   * AugmentedContentList. Optionally includes metadata in the output.
   *
   * @param contents The AugmentedContentList containing the document content.
   * @param includeMetadata A Boolean indicating whether to include metadata
   *                         in the returned content.
   * @return A String containing the document content, optionally prefixed
   *         with metadata. If no active document is found, an error message
   *         is returned.
   */
  protected String getDocumentContents(
    AugmentedContentListBase contents,
    Boolean includeMetadata
  ) {
    var message = contents.getActiveDocumentContent();
    if (message == null) {
      return "** ERROR: No document found in context. **";
    }
    return message.getPromptText();
  }
}
