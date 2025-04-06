package com.obapps.schoolchatbot.assistants;

import com.obapps.schoolchatbot.util.Strings;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.LoggerFactory;

public class Prompts {

  public static final Map<Integer, String> PHASE_PROMPTS = Map.of(
    1,
    "**This phase is focused on identifying Key Points of Interest and General Analysis**\n" +
    "A Key Point of Interest is a specific statement or topic in the email that is relevant to legal or policy obligations, " +
    "or otherwise warrants further review, investigation, or possible legal action-e.g.:\n" +
    "\n" +
    "- Allegations of harassment or violence.\n" +
    "- Concerns about safety or compliance.\n" +
    "- Statements about the district's obligations or responsibilities\n" +
    "- Statements about the district's policies or procedures\n" +
    "- Statements about the district's response to a situation\n" +
    "- Statements about the district's actions or inactions\n" +
    "- Statements speaking towards the district's compliance with laws or policies\n" +
    "- Statements about the district's obligations to maintain records\n" +
    "- Statements about the district's obligations to respond to data requests\n" +
    "- Statements about the district's obligations to investigate harassment or violence\n" +
    "- Any other significant issues or topics that may require further attention\n" +
    "When a Key Point is identifed, use the appropriate function to add it to our database for further analysis.\n" +
    "If there is a relationship between a previously identified Key Point ('responds to', 'supports', 'contradicts', etc.), " +
    "use the appropriate function to add that relationship to our database.\n  If additional information is needed to fully " +
    "evaluate compliance or intent, request that information using available functions.  If more information is still needed, " +
    "use the availalbe function to attach a note to the record stating what is needed.\n" +
    "You are extremely throrough.  Identify **all** matching Key Points in the communication, even if there are more than 10.  If you find a Key Point " +
    "that was already identified during a previous pass over this record (e.g. the 'from_this_message' flag is set to true), " +
    "do not re-add it and continue your analysis for new Key Points.\n",
    2,
    "**This phase is focused on identifying calls to action (CTAs) and CTA Responsive Actions.**\n" + //
    "In general, CTA's originate from communication sent by a parent, and Responsive Actions originate from communication " +
    "from district staff.  CTAs may include any direct or inferred request for information, explanation, records, " +
    "follow-up, or safety assurances—e.g.:\n" + //
    "\n" + //
    "- \"Please provide me with a copy of...\"\n" +
    "- \"Can you explain why this decision was made?\"\n" +
    "- \"What steps will be taken to ensure...?\"\n" +
    "- \"Has a report been filed with the state?\"\n" +
    "- \"Please correct this record...\"\n" +
    "- \"This is not correct...\"\n" +
    "\n" + //
    "If CTAs are **implied** (e.g., “I still don't understand what happened”), flag them as `\"inferred\": true`.  Simalarly, " +
    "If a statement is relevant to an open call to action but not explicitly responsive it should also be flagged as inferred." +
    "When a CTA or Responsive Action is identified, use the appropriate function to add it to our database for further analysis.\n"
  );

  public static String getPromptForPhase(Integer phase) {
    var promptBuilder = new StringBuilder();

    promptBuilder
      .append(
        "You are a lawyer who specializes in education law, civil rights compliance, and school district obligations "
      )
      .append(
        "under state and federal law, including Title IX, FERPA, and child protection statutes. You are highly familiar with a school "
      )
      .append(
        "district's legal responsibilities to maintain records, respond to data requests, investigate harassment or violence, and ensure a "
      )
      .append("safe learning environment.\n");
    promptBuilder
      .append(
        "You have been retained by a parent to review written communications between the parent and a school district. Your current "
      )
      .append(
        String.format(
          " task is Phase [%d] of a 5-phase legal review. Each phase focuses on a different compliance dimension.\n",
          phase
        )
      );
    var phaseUniquePrompt = PHASE_PROMPTS.get(phase);
    if (phaseUniquePrompt != null) {
      promptBuilder.append(phaseUniquePrompt);
    } else {
      LoggerFactory.getLogger(Prompts.class).warn(
        "No unique prompt found for phase {}. Using default prompt.",
        phase
      );
    }
    promptBuilder.append("\n\n");
    promptBuilder.append(getRecordStructure());
    return promptBuilder.toString();
  }

  protected static String getRecordStructure() {
    var sampleMetadata = new HashMap<String, Object>();
    sampleMetadata.put("Sender", "Parent");
    sampleMetadata.put("Send Date", "2023-10-01 12:00:00");
    sampleMetadata.put("Record Type", "Email");

    var promptBuilder = new StringBuilder();
    promptBuilder.append(
      "Messages and records will be provided using the following format:\n_#_ [Record Type] [Optional Metadata] _#_\n<message or JSON>\n_#_ END _#_\n\nFor example:\n"
    );
    promptBuilder
      .append(
        Strings.getRecordOutput(
          "Sample JSON Record",
          "{ \"field_name\": \"value\" }"
        )
      )
      .append("\n")
      .append(
        Strings.getRecordOutput(
          "Sample Text Record",
          "This block of text can be referred to as 'Sample Text Record'."
        )
      )
      .append("\n\n")
      .append(
        Strings.getRecordOutput(
          "Sample Text Record",
          "This block of text can be referred to as 'Sample Text Record'.",
          sampleMetadata
        )
      );
    return promptBuilder.toString();
  }
}
