package com.obapps.schoolchatbot.core.services.ai;

import com.obapps.schoolchatbot.core.models.ai.ResearchRelevantHitsEnvelope;
import com.obapps.schoolchatbot.core.util.SupportingPrompts;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

public interface IResearchAssistant {
  @SystemMessage(SupportingPrompts.ResearchAssistant_SupportingDocs_System)
  @UserMessage(SupportingPrompts.ResearchAssistant_SupportingDocs_User)
  public Result<ResearchRelevantHitsEnvelope> prepareSupportingDocuments(
    @V("supporting_records_schema") String supportingRecordsSchema,
    @V("phase goal") String phaseGoal,
    @V("case_document_id") String caseDocumentId,
    @V("case_document_content") String caseDocumentContent,
    @V("supporting_records_content") String supportingRecordsContent
  );

  @SystemMessage(SupportingPrompts.ResearchAssistant_SupportingDocs_System)
  @UserMessage("continue")
  public Result<ResearchRelevantHitsEnvelope> extractNextBatch(
    @V("supporting_records_schema") String supportingRecordsSchema,
    @V("phase goal") String phaseGoal
    /*
    @V("case_document_id") String caseDocumentId,
    @V("case_document_content") String caseDocumentContent,
    @V("supporting_records_content") String supportingRecordsContent
     */
  );
}
