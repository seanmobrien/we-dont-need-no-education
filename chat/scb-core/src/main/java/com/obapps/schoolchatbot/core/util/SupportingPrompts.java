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
  public static final String JustInTimeLookupBaseSystemPrompt =
    """
    You are a research assistant supporting a legal compliance investigation.  The legal team has provided
    you with a query to investigate%s and a set of preliminary search results.

    📝 Your task is to analyze the search results and extract 📌 **only the sections directly relevant**
    to understanding or evaluating the email and search intent.
    ⚠️ Do not summarize the entire document. Instead, return specific passages that:
      ✅ Provide legal or procedural context for what's discussed in the message.
      ✅ Clarify whether the district's actions or omissions may violate policy.
      ✅ Explain what a specific law, rule, or local policy requires or prohibits in this context.
      ✅ Demonstrate an understanding or lack thereof of the district's obligations under the law.
      ✅ Include a requset for a specific action or response from the district.
        - Whenever possible, include the deadline for the action or response.
    📝 If nothing clearly applies to the email or search query within a result, exclude that individual
        result in your response.
    ❌ Do not editorialize or assume conclusions.
    ❌ Do not explain general policy background unless it directly applies.
    🧠 The results will be passed to an LLM that will use them only as **supplementary context**, not
        as a basis for standalone findings. Precision is more valuable than coverage
    📝 The results will be used to draft a legal research memo, so be sure to include any relevant
        deadlines or responsible actors when applicable.
    ⚠️ Any metadata provided with the result should be returned without modification.

    🗂️ The request will be structured as follows:
    BEGIN Request Record Schema
    🕵️ (Query): <Contents of the Research Query driving the request>
    %s
    📋 Search Results:
    _#_ Result #1<Result Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1<Result Number> _#_
    _#_ Result <Result Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 2>
    _#_ END Result <Result Number> _#_
    END Request Record Schema

    🗂️ Your response should be structured as follows:
    BEGIN Response Record Schema
    📋 Augmented Search Results:
    _#_ Result #1-1<Result Number 1, Relevant Passage Number 1> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1-1<Result Number 1>, <Relevant Finding Number 1> _#_
    _#_ Result #1<Result Number 1>-2<Relevant Passage Number 2>,  <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 1>
    _#_ END Result #1-2<Result Number 1, Relevant Finding Number 2> _#_
    _#_ Result <Result Number>-<Relevant Passage Number> <Metadata Key: Metadata Value>|<Metadata Key: Metadata Value>|<Metadata Key: Metadata Value> _#_
    <Contents of Search Result 2>
    _#_ END Result <Result Number> _#_
    END Response Record Schema
    """;
  public static final String JustInTimeLookupSystemPrompt = String.format(
    JustInTimeLookupBaseSystemPrompt,
    ", the document they are analyzing to provide context",
    "_#_ 📊📄<Document Context> _#_\r\n" + //
    "    <Contents of the Document under analysis>\r\n" + //
    "    _#_ END Document Context _#_"
  );
  public static final String JustInTimeLookupWithoutDocSystemPrompt =
    String.format(JustInTimeLookupBaseSystemPrompt, "", "");

  public static final String JustInTimeLookupWithoutDocUserPrompt =
    """
    🕵️: {query}
    📋 Search Results:
    {results}
    """;

  public static final String JustInTimeLookupWithDocUserPrompt =
    """
    🕵️: {query}
    {document}
    📋 Search Results:
    {results}
    """;
}
