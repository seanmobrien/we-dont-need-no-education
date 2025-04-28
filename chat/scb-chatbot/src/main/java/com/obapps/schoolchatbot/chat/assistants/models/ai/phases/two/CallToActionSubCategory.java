package com.obapps.schoolchatbot.chat.assistants.models.ai.phases.two;

import dev.langchain4j.model.output.structured.Description;
import java.util.List;

public class CallToActionSubCategory extends CallToActionCategory {

  @Description(
    "A list containing the ID values of all 🔔 that are linked to this 🏷️."
  )
  public List<String> callToActionIds;

  @Description(
    "The unique ID for this 🏷️.  If this is a 🏷️ that has not been added to the database yet, the ID should be prefixed with 'NEW-'"
  )
  public String categoryId;

  @Description("A short description of the 🏷️.")
  public String categoryName;

  @Description(
    "A longer description of the 🏷️. This should be a detailed explanation of the 🏷️ and its purpose."
  )
  public String categoryDescription;

  @Description("A list of sub-🏷️ that are related to this 🏷️.")
  public List<CallToActionSubCategory> subcategories;
}
