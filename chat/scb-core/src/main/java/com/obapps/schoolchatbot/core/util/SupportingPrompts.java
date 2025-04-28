package com.obapps.schoolchatbot.core.util;

import dev.langchain4j.model.input.PromptTemplate;

public class SupportingPrompts {

  public static final String Extraction_CompletionPrompt_NoCount =
    """
    🗂️🏁 **Completion**
        For each target item identified, exactly one Response Object (🧾) must be emitted in the response.
        It is critical that all available 🧾 Response Objects are extracted.
          🚫 Do not list or summarize.
          🔁 When processing halts 🛑
            🔀 If there are additional processing goals or target records to be emitted,
              🌿 The *moreResultsAvailable* field must be set to the estimated number of items
                remaining, eg `\"moreResultsAvailable\": 15`
              📌 The \"allRecordsEmittted\" field should be set to false.
              📌 This ensures you are given another iteration to successfully complete your task.
            🔀 If you are confident all items have been extracted and emitted,
              🌿 The *allRecordsEmitted* field must be set to true, eg `\"allRecordsEmitted\": true`.
    ⚠️ **Important**: If your response is truncated due to length limits or iteration caps, you must set \"moreResultsAvailable\"
        to the estimated number of remaining items and \"allRecordsEmitted\" to false. Only set \"allRecordsEmitted\" to true if you
        are absolutely certain no more records remain to be processed or emitted.
    🔁 When re-prompted, **resume** extraction where you left off.
    ✔️ Once you are confident that all items have been extracted and returned, the \"allRecordsEmitted\" flag
       **must** be set to true.
       📌 Any time \"allRecordsEmitted\" is false and \"moreResultsAvailable\" is 0, a 📝⚙️ explaining why
       must be included in the response.
    """;

  public static final String Extraction_CompletionPrompt =
    """
    🗂️🏁 **Completion**
        For each target item identified, exactly one Response Object (🧾) must be emitted in the response.
        It is critical that all available 🧾 Response Objects are extracted.
          🚫 Do not list or summarize.
          🔁 When 10 🧾 Response Objects have been emitted in a single turn, stop 🛑 and return results.
            📌 Processing Notes should be seperately accounted for and not included in the iteration limit calculation.
          🔀 If there are additional matches in the target document,
              🌿 The *moreResultsAvailable* field must be set to the estimated number of items
                remaining, eg `\"moreResultsAvailable\": 15`
          🔀 If you are confident all items have been extracted and emitted,
              🌿 The *allRecordsEmitted* field must be set to true, eg `\"allRecordsEmitted\": true`.
    ⚠️ **Important**: If your response is truncated due to length limits or iteration caps, you must set \"moreResultsAvailable\"
        to the estimated number of remaining items and \"allRecordsEmitted\" to false. Only set \"allRecordsEmitted\" to true if you
        are absolutely certain no more records remain to be processed or emitted.
    🔁 When re-prompted, **resume** extraction where you left off.
    ✔️ Once you are confident that all items have been extracted and returned, the \"allRecordsEmitted\" flag
       **must** be set to true.
       📌 Any time \"allRecordsEmitted\" is false and \"moreResultsAvailable\" is 0, a 📝⚙️ explaining why
       must be included in the response.
    """;

  public static final String ResearchAssistant_SupportingDocs_System =
    "You are a research assistant supporting a legal compliance investigation involving a school district's response to events\n" +
    "surrounding a Title IX investigation.\n" +
    PromptSymbols.INSTRUCTION +
    " you will be provided with a document from the case record and a batch of supporting records.\n" +
    "Your task is to " +
    PromptSymbols.ANALYZE +
    " extract only the sections directly relevant to \n" +
    "understanding or evaluation of the case document within the context of {{phase goal}}.\n" +
    PromptSymbols.PINNED +
    " ***Only the sections directly relevant*** to this case document should be extracted.\n" +
    PromptSymbols.EXCLUSION +
    " ***Do not summarize the entire document or record.***  Instead, return specific passages that:\n" +
    PromptSymbols.CHECKLIST_UNCHECKED +
    " Provide legal or procedural context for what's discused in the case record.\n" +
    PromptSymbols.CHECKLIST_UNCHECKED +
    " Assist in understanding the case document within the context of {{phase goal}}.\n" +
    "The request will match the following format:\n" +
    """
    Case Document ID: <case_document_id>
    BEGIN Case Document Content:
    <case_document_content>
    END Case Document Content
    Supporting Records:
    {supporting_records_schema}
    END Supporting Records


    """ +
    Extraction_CompletionPrompt;
  /* +
    PromptSymbols.SECTION_DIVIDER +
    " Message Follows:\n" +*/
  public static final String ResearchAssistant_SupportingDocs_User =
    """
    Case Document ID: {{case_document_id}}
    BEGIN Case Document Content:
    {{case_document_content}}
    END Case Document Content
    Supporting Records:
    {{supporting_records_content}}
    """;

  public static final PromptTemplate HELPFUL_ASSISTANT = PromptTemplate.from(
    """
    You are a helpful assistant. Your task is to assist the user in finding information and answering questions based on the provided context.
    The context is as follows:
    {context}
    The user query is: {query}
    Please provide a concise and relevant answer based on the context.
    """
  );
  public static final String ContinueExtractionUserPromptText =
    "A total of {{matchesFound}} 🧾 Response Objects have been found after {{iteration}} iterations.\nPlease Continue.";

  public static Boolean matchesContinueExtraction(String userPrompt) {
    var prompt = new PromptTemplate(ContinueExtractionUserPromptText);
    return userPrompt.matches(
      prompt
        .template()
        .replace("{{matchesFound}}", "(\\d+)")
        .replace("{{iteration}}", "(\\d+)")
    );
  }

  public static final String DateFormatDetails =
    "  Date value should be formatted as 'YYYY-MM-DD'";
}
