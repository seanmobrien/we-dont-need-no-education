package com.obapps.schoolchatbot.chat.assistants.retrievers;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.assistants.retrievers.ContentRetrieverBase;
import com.obapps.schoolchatbot.core.repositories.HistoricKeyPointRepository;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class KeyPointsRetriever extends ContentRetrieverBase {

  private HistoricKeyPointRepository keyPointRepository;

  public KeyPointsRetriever() {
    this(null);
  }

  public KeyPointsRetriever(HistoricKeyPointRepository repository) {
    super(KeyPointsRetriever.class);
    keyPointRepository = repository == null
      ? new HistoricKeyPointRepository()
      : repository;
  }

  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(null, query);
    if (input == null || input.compareTo(1) < 0) {
      return ret;
    }
    try {
      var keyPoints =
        this.keyPointRepository.getKeyPointHistoryForDocument(input);
      if (keyPoints != null) {
        for (var keyPoint : keyPoints) {
          var meta = new HashMap<String, Object>();
          meta.put(
            AugmentedSearchMetadataType.contentType,
            AugmentedSearchMetadataType.KeyPoint.name
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.id,
            keyPoint.getPropertyId()
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.document_id,
            keyPoint.getDocumentId()
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.policy_dscr,
            String.join(", ", keyPoint.getPolicyBasis())
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.tags,
            String.join(", ", keyPoint.getTags())
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.compliance,
            keyPoint.getCompliance()
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.current_document,
            keyPoint.isFromThisMessage() ? 1 : 0
          );
          ret.add(CreateContent(keyPoint.toJson(), meta));
        }
      } else {
        log.debug("No key points found for document id: " + input);
      }
    } catch (SQLException e) {
      log.error(
        String.format(
          "Error retrieving key points from database for document id [%d]",
          input
        ),
        e
      );
    }
    return ret;
  }
}
