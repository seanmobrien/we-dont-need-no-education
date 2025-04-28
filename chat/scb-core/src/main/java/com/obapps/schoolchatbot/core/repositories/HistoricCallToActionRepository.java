package com.obapps.schoolchatbot.core.repositories;

import com.obapps.core.ai.extraction.services.RecordExtractionService;
import com.obapps.core.ai.factory.models.AiServiceOptions;
import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.HistoricCallToAction;
import com.obapps.schoolchatbot.core.services.ai.IResearchAssistant;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The {@code HistoricCallToActionRepository} class provides methods for interacting with
 * the database to retrieve historical call-to-action (CTA) records associated with documents.
 *
 * <p>This repository includes methods to:
 * <ul>
 *   <li>Retrieve the history of CTAs for a specific document.</li>
 * </ul>
 *
 * <p>All database interactions are facilitated through the singleton instance of the
 * {@link Db} class, unless a custom instance is provided.
 *
 * <p>Methods in this class may throw {@link SQLException} if a database access error occurs.
 */
public class HistoricCallToActionRepository {

  /**
   * The database instance used for database interactions.
   */
  private Db _db;

  /**
   * The factory for creating AI service clients.
   */
  private StandaloneModelClientFactory _clientFactory;

  /**
   * Default constructor that uses the singleton instance of {@link Db}.
   */
  public HistoricCallToActionRepository() {
    this(null, null);
  }

  /**
   * Constructor that allows injecting a custom {@link Db} instance.
   *
   * @param db The custom {@link Db} instance to use.
   * @param factory The custom {@link StandaloneModelClientFactory} instance to use.
   */
  public HistoricCallToActionRepository(
    Db db,
    StandaloneModelClientFactory factory
  ) {
    this._db = db;
    this._clientFactory = factory == null
      ? new StandaloneModelClientFactory()
      : factory;
  }

  /**
   * Provides access to the database instance used by this repository.
   *
   * @return The {@link Db} instance used by this repository.
   * @throws SQLException if a database access error occurs.
   */
  public Db db() throws SQLException {
    if (this._db == null) {
      this._db = Db.getInstance();
    }
    return this._db;
  }

  /**
   * Retrieves the history of CTAs associated with a specific document.
   *
   * @param documentId the ID of the document for which the CTA history is to be retrieved.
   * @return a list of {@link HistoricCallToAction} objects representing the CTA history for the specified document.
   * @throws SQLException if a database access error occurs.
   */
  public List<HistoricCallToAction> getCallToActionHistoryForDocument(
    Integer documentId
  ) throws SQLException {
    return getCallToActionHistoryForDocument(documentId, true);
  }

  /**
   * Retrieves the history of CTAs associated with a specific document.
   *
   * @param documentId the ID of the document for which the CTA history is to be retrieved.
   * @param includeReductiveResultset a flag indicating whether to return a reductive result set.
   * @return a list of {@link HistoricCallToAction} objects representing the CTA history for the specified document.
   * @throws SQLException if a database access error occurs.
   */
  public List<HistoricCallToAction> getCallToActionHistoryForDocument(
    Integer documentId,
    boolean includeReductiveResultset
  ) throws SQLException {
    var allCtas = HistoricCallToAction.getCallsToActionForDocument(
      db(),
      documentId
    );
    if (!includeReductiveResultset || allCtas == null || allCtas.isEmpty()) {
      return allCtas;
    }
    return getReductiveResultset(documentId, allCtas);
  }

  /**
   * Retrieves a specific call-to-action by its unique identifier.
   *
   * @param id the unique identifier of the call-to-action.
   * @return the {@link HistoricCallToAction} object corresponding to the specified ID.
   * @throws SQLException if a database access error occurs.
   */
  public HistoricCallToAction getCallToAction(UUID id) throws SQLException {
    return HistoricCallToAction.getCallsToAction(db(), id);
  }

  /**
   * Retrieves a reductive result set of CTAs for a specific document.
   *
   * @param documentId the ID of the document for which the reductive result set is to be retrieved.
   * @param source the source list of {@link HistoricCallToAction} objects.
   * @return a filtered list of {@link HistoricCallToAction} objects representing the reductive result set.
   * @throws SQLException if a database access error occurs.
   */
  protected List<HistoricCallToAction> getReductiveResultset(
    Integer documentId,
    List<HistoricCallToAction> source
  ) throws SQLException {
    var contents = db()
      .selectSingleValue(
        "SELECT content FROM document_units WHERE unit_id=?",
        documentId
      );
    if (contents == null) {
      return null;
    }
    var supportingRecordsSchema =
      """
      ___ BEGIN RECORD ID <Record Id> ___
      <Record Content>
      ___ END RECORD ID <Record Id> ___
      """;
    var phaseGoal = "identify Calls to Action and Responses";
    var fancyResult = RecordExtractionService.extractRecords(
      _clientFactory,
      AiServiceOptions.builder(IResearchAssistant.class)
        .setModelType(ModelType.LoFi)
        .setStructuredOutput(true)
        .setMemoryWindow(15)
        .build(),
      c ->
        c.prepareSupportingDocuments(
          supportingRecordsSchema,
          phaseGoal,
          documentId.toString(),
          contents.toString(),
          source
            .stream()
            .map(cta ->
              String.format(
                """
                ___ BEGIN RECORD ID %s ___
                %s
                ___ END RECORD ID %s ___
                """,
                cta.getPropertyId(),
                cta.getPropertyValue(),
                cta.getPropertyId()
              )
            )
            .collect(Collectors.joining("\n"))
        ),
      c -> c.getService().extractNextBatch(supportingRecordsSchema, phaseGoal)
    );
    var records = fancyResult.content();
    return records == null || records.isEmpty()
      ? source
      : source
        .stream()
        .filter(cta -> {
          var id = cta.getPropertyId().toString();
          return (
            id != null &&
            records.stream().anyMatch(r -> r.getRecordId().equals(id))
          );
        })
        .collect(Collectors.toList());
  }
}
