package com.obapps.schoolchatbot.core.assistants.retrievers;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class SourceDocumentRetriever extends ContentRetrieverBase {

  public SourceDocumentRetriever() {
    super(SourceDocumentRetriever.class);
  }

  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(null, query);
    if (input.compareTo(1) < 0) {
      // No document id included in query, nothing to do
      return ret;
    }
    try {
      var document = DocumentWithMetadata.fromDb(input);
      if (document != null) {
        ret.add(serializeDocument(document));
      }
    } catch (SQLException e) {
      log.error(
        "An error occurred reading mesage state for document id " + input,
        e
      );
    }
    return ret;
  }

  protected Content serializeDocument(DocumentWithMetadata document) {
    var meta = new HashMap<String, Object>();
    meta.put(
      AugmentedSearchMetadataType.contentType,
      AugmentedSearchMetadataType.EmailMetadata.name
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.id,
      document.getDocumentId()
    );
    meta.put(
      AugmentedSearchMetadataType.EmailMetadata.type_id,
      document.getDocumentType()
    );
    return CreateContent(document.toJson(), meta);
  }
}
