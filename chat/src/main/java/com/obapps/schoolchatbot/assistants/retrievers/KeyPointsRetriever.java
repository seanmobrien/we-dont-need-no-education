package com.obapps.schoolchatbot.assistants.retrievers;

import com.obapps.schoolchatbot.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.data.HistoricKeyPoint;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class KeyPointsRetriever extends ContentRetrieverBase {

  public KeyPointsRetriever() {
    super(KeyPointsRetriever.class);
  }

  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(null, query);
    if (input == 0) {
      return ret;
    }
    try {
      var keyPoints = HistoricKeyPoint.getKeyPointHistoryForDocument(input);
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
            keyPoint.getPolicyDisplayName()
          );
          meta.put(
            AugmentedSearchMetadataType.KeyPoint.compliance,
            keyPoint.getCompliance()
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
