package com.obapps.schoolchatbot.core.services.embed;

import com.obapps.core.util.Db;
import com.obapps.schoolchatbot.core.models.DocumentUnit;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import com.obapps.schoolchatbot.core.models.embed.DocumentUnitEmbeddedProps;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DatabaseDocumentStore implements IDocumentStore {

  private final Logger log;

  public DatabaseDocumentStore() {
    log = LoggerFactory.getLogger(DatabaseDocumentStore.class);
  }

  public DatabaseDocumentStore(Db database) {
    this();
    this.database = database;
  }

  private Db database;

  protected Db db() throws SQLException {
    if (database == null) {
      database = Db.createUnitOfWork();
    }
    return database;
  }

  @Override
  public List<DocumentUnit> readDocumentUnits(Boolean reindex)
    throws IOException {
    try {
      var db = db();
      return DocumentWithMetadata.listFromDb(
        db,
        reindex ? "" : " WHERE embedding_model IS NULL"
      )
        .stream()
        .map(this::mapToDocumentUnit)
        .toList();
    } catch (SQLException ex) {
      log.error("An error occurred saving embedding stats", ex);

      throw new IOException(ex.getMessage(), ex);
    }
  }

  private DocumentUnit mapToDocumentUnit(DocumentWithMetadata doc) {
    return DocumentUnit.builder(doc.getDocumentType())
      .unitId(doc.getDocumentId())
      .emailId(doc.getEmailId().toString())
      .attachmentId(doc.getAttachmentId())
      .documentPropertyId(doc.getDocumentPropertyId())
      .threadId(doc.getThreadId())
      .relatedEmailIds(
        doc.getRelatedDocuments().stream().map(id -> id.toString()).toList()
      )
      .documentType(doc.getDocumentType())
      .createdOn(doc.getDocumentSendDate())
      .parentEmailId(doc.getReplyToDocumentId())
      .hrefDocument(doc.getHrefDocument())
      .hrefApi(doc.getHrefApi())
      .embeddingModel(doc.getEmbeddingModel())
      .embeddedOn(doc.getEmbeddedOn())
      .content(doc.getContent())
      .build();
  }

  @Override
  public void onDocumentUnitEmbedded(DocumentUnitEmbeddedProps props)
    throws IOException {
    try {
      var tx = db().createTransaction();
      var db = tx.getDb();
      try (tx) {
        var records = db.executeUpdate(
          "UPDATE document_units SET embedding_model=?, embedded_on=CURRENT_TIMESTAMP WHERE unit_id=?",
          props.embeddingModel,
          props.document.unitId
        );
        if (records == 0) {
          throw new IOException("No records updated");
        }
        for (var idx = 0; idx < props.embeddings.size(); idx++) {
          var embedding = props.embeddings.get(idx);
          // Delete existing embedding for the same unit and index
          db.executeUpdate(
            "DELETE FROM document_unit_embeddings WHERE document_id=? AND index=?",
            props.document.unitId,
            idx + 1
          );
          db.executeUpdate(
            "INSERT INTO document_unit_embeddings (document_id, index, vector) VALUES (?, ?, ?)",
            props.document.unitId,
            idx + 1,
            embedding.vector()
          );
        }
      } catch (Exception ex) {
        tx.setAbort();
      }
    } catch (Exception ex) {
      log.error("An error occurred saving embedding stats", ex);
      throw new IOException(ex.getMessage(), ex);
    }
  }

  @Override
  public Boolean authenticate() throws IOException {
    // no-op, called locally
    return true;
  }
}
