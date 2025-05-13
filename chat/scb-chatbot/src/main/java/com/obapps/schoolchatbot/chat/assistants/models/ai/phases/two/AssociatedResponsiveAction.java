package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import com.obapps.schoolchatbot.chat.assistants.Prompts;
import com.obapps.schoolchatbot.chat.assistants.models.ai.phases.DocumentRelationship;
import dev.langchain4j.model.output.structured.Description;
import java.util.List;

public class AssociatedResponsiveAction {

  @Description("The id of the action")
  public String id;

  @Description("Contains a list of 🔔 this action fulfills")
  public List<AssociatedCallToAction> associatedCallsToAction;

  @Description(
    "Indicates whether a thorough search has been performed for this record.  " +
    "Only set this to true if multiple queries have been used to identify results."
  )
  public Boolean exhaustiveSearchPerformed;

  @Description(
    "Indicates whether this record has been saved to the database.  " +
    "This should always be left null or set to false."
  )
  private Boolean _isSavedToDatabase;

  @Description(Prompts.FieldDescriptions.ReasonablyTitleIx)
  public Integer reasonablyTitleIx;

  @Description(Prompts.FieldDescriptions.ReasonablyTitleIxReasons)
  public List<String> reasonablyTitleIxReasons;

  @Description(Prompts.FieldDescriptions.RelatedDocuments)
  public List<DocumentRelationship> relatedDocuments;

  @Description(Prompts.FieldDescriptions.ProcessingNotes)
  public List<String> processingNotes;

  public Boolean isSavedToDatabase() {
    return this._isSavedToDatabase == null
      ? false
      : this._isSavedToDatabase.equals(Boolean.TRUE);
  }

  public void isSavedToDatabase(Boolean value) {
    this._isSavedToDatabase = value;
  }

  public static class AssociatedCallToAction {

    @Description("The id of the associated 🔔")
    public String callToActionId;

    @Description(Prompts.FieldDescriptions.ComplianceChapter13)
    public Double complianceChapter13;

    @Description(Prompts.FieldDescriptions.ComplianceChapter13Reasons)
    public List<String> complianceChapter13Reasons;
  }
}
