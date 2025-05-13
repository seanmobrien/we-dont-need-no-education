package com.obapps.schoolchatbot.chat.assistants.models.ai.phases;

import dev.langchain4j.model.output.structured.Description;

public class DocumentRelationship {

  @Description("The ID of the related document.")
  public Integer documentId;

  @Description(
    "How the document is related to this call to action - examples include, but are not limited to, 'supports', 'contradicts', 'refutes', 'provides context', 'suspected violation', etc."
  )
  public String relationshipType;
}
