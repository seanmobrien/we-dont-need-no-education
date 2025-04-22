package com.obapps.schoolchatbot.chat.assistants.retrievers;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedSearchMetadataType;
import com.obapps.schoolchatbot.core.assistants.retrievers.ContentRetrieverBase;
import com.obapps.schoolchatbot.core.models.HistoricCallToAction;
import com.obapps.schoolchatbot.core.repositories.HistoricCallToActionRepository;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class CallToActionRetriever extends ContentRetrieverBase {

  private HistoricCallToActionRepository callToActionRepository;

  public CallToActionRetriever() {
    this(null);
  }

  public CallToActionRetriever(HistoricCallToActionRepository repository) {
    super(CallToActionRetriever.class);
    callToActionRepository = repository == null
      ? new HistoricCallToActionRepository()
      : repository;
  }

  @Override
  public List<Content> retrieve(Query query) {
    var ret = new ArrayList<Content>();
    var input = getDocumentId(query);
    if (input == null || input.compareTo(1) < 0) {
      return ret;
    }
    try {
      var callToActions =
        this.callToActionRepository.getCallToActionHistoryForDocument(input);
      if (callToActions != null) {
        for (HistoricCallToAction callToAction : callToActions) {
          var meta = new HashMap<String, Object>();
          meta.put(
            AugmentedSearchMetadataType.contentType,
            AugmentedSearchMetadataType.CallToAction.name
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.id,
            callToAction.getPropertyId()
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.document_id,
            callToAction.getDocumentId()
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.policy_dscr,
            String.join(", ", callToAction.getPolicyBasis())
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.tags,
            String.join(", ", callToAction.getTags())
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.completion_percentage,
            callToAction.getCompletionPercentage()
          );
          meta.put(
            AugmentedSearchMetadataType.CallToAction.current_document,
            callToAction.isFromThisMessage() ? 1 : 0
          );
          ret.add(CreateContent(callToAction.toJson(), meta));
        }
      } else {
        log.debug("No calls to action found for document id: " + input);
      }
    } catch (SQLException e) {
      log.error(
        String.format(
          "Error retrieving calls to action from database for document id [%d]",
          input
        ),
        e
      );
    }
    return ret;
  }
}
