package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.core.assistants.content.AugmentedContentListBase;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.LoggerFactory;

/**
 * A utility class for generating prompts used by the chatbot assistants.
 * This class provides methods to construct various prompts for different phases and tools.
 */
public class Prompts {

  public static final Map<Integer, Map<String, String>> PHASE_DETECTION_POINTS =
    Map.of(
      1,
      Map.of(
        "Key Points of Interest",
        "Key Points of Interest are specific statements or topics in the email that are relevant to legal or policy obligations, " +
        "or otherwise warrant further review, investigation, or possible legal action."
      ),
      2,
      Map.of(
        "CTA",
        "addCallToActionToDatabase",
        "Responsive Action",
        "addCtaResponseToDatabase"
      )
    );

  public static final Map<Integer, String> PHASE_PROMPTS = Map.of(
    1,
    "**This phase is focused on identifying Key Points of Interest and General Analysis**\n" +
    "A Key Point of Interest is a specific statement or topic in the email that is relevant to legal or policy obligations, " +
    "or otherwise warrants further review, investigation, or possible legal action-e.g.:\n" +
    "\n" +
    "- Allegations of harassment or violence, or other concerns about safety.\n" +
    "- Statements about the district's obligations or responsibilities\n" +
    "- Statements about the district's policies or procedures\n" +
    "- Statements about the district's actions or inactions in response to a situation\n" +
    "- Statements speaking towards the district's compliance with laws or policies\n" +
    "- Statements about the district's obligations to maintain records or respond to data requests\n" +
    "- Statements about the district's obligations to investigate harassment or violence\n" +
    "- Any other significant issues or topics that may require further attention\n\n" +
    "***Instructions***:\n" +
    "- For each Key Point you identify, compute the ratings found in the tool description then emit ***one call*** to the addKeyPointToDatabase() function.\n" +
    "- **Do not list or summarize**\n" +
    "- **Stop after 5 function calls** in a single turn.\n" +
    "- If additional matches remain, state: \"More matches remain.  Please continue.\":\n" +
    "- When re-prompted, **resume** function calls from where you left off.\n" +
    "- You will always be given the **full document content** again, since session memory is disabled.\n\n" +
    "***Completion***:\n" +
    "If you are confident that all matches have been added, call `signalAnalysisPhaseComplete(documentId)`.\n" +
    "You may also say: \"All matches have been processed.\"\n\n" +
    "**Do not group multiple identified Key Points in one call.**  Call the function separately for each identified point.\n" +
    getToolUsage("Key Points of Interest", false),
    2,
    "This phase is focused on identifying Calls to Action (CTAs) and Responsive Actions.\n\n" +
    "=== Step 1: Identify Calls to Action (CTAs) ===\n" +
    "CTAs generally originate from the parent. They include any direct or implied request for information, records, clarification, follow-up, safety assurances, or any action the district is obligated to take under board policy, law, or common decency.\n\n" +
    "Examples of CTAs include:\n" +
    "- \"Please provide me with a copy of...\"\n" +
    "- \"Can you explain why this decision was made?\"\n" +
    "- \"What steps will be taken to ensure...?\"\n" +
    "- \"Has a report been filed with the state?\"\n" +
    "- \"Please correct this record...\n" +
    "- \"This is not correct...\"\n\n" +
    "If a CTA is **implied** (e.g., “I still don't understand what happened”), mark it with `\"inferred\": true`.\n\n" +
    "CTAs must originate from a parent. A message from district staff is not a CTA.\n\n" +
    "=== Step 2: Identify Responsive Actions ===\n" +
    "Responsive Actions generally originate from district staff. These include:\n" +
    "- Direct responses that fulfill or acknowledge a CTA\n" +
    "- Partial responses or statements that address the same concern\n" +
    "- **Failure to respond** to an open CTA, if a response would reasonably be expected\n\n" +
    "If a statement appears to acknowledge or avoid a CTA without directly answering it, mark it as an inferred Responsive Action.\n\n" +
    "Responsive Actions must come from staff. A parent cannot issue a response to their own CTA.\n\n" +
    "CTAs should be assigned a Compliance Close Date, which is the date by which the district must respond to the request.\n" +
    "Whenever possible, this date should have legal basis (e.g., 10 days from the date of the request per MN Statute 13).\n" +
    "If no legally binding timeline exists, pick a date that a third party auditor - even one biased towards the district - would find reasonable.\n" +
    "***Instructions***:\n" +
    "- For each CTA you identify, compute the ratings found in the tool description then emit ***one call*** to the `addCallToActionToDatabase()` function.\n" +
    "- For each Responsive Action you identify,  compute the ratings found in the tool description then emit ***one call*** to the `addCtaResponseToDatabase()` function.\n" +
    "- **Do not list or summarize**\n" +
    "- **Stop after 5 function calls** in a single turn.\n" +
    "- If additional matches remain, state: \"More matches remain.  Please continue.\":\n" +
    "- When re-prompted, **resume** function calls from where you left off.\n" +
    "- You will always be given the **full document content** again, since session memory is disabled.\n\n" +
    "***Completion***:\n" +
    "If you are confident that all matches have been added, call `signalAnalysisPhaseComplete(documentId)`.\n" +
    "You may also say: \"All matches have been processed.\"\n\n" +
    "**Do not group multiple identified CTA's or Responsive Actions in one call.**  Call the function separately for each identified point.\n" +
    getToolUsage("CTAs *or* Responsive Actions")
  );

  protected static String stateTitleNineInEffect() {
    return (
      "When assessing, it is notable to remember that a Title IX investigation was open and in the first (Evidence Gathering)\n" +
      "phase in-between the dates of of 12/20/24 and 4/8/25.  It is the parent's assertion that all requests made during this timeframe were related to events that\n" +
      "should be considered within scope of that investigation and directly relevant to the claim.  For any date calculation the Sent Date of the email should be used,\n" +
      "which for the current document is ***%s***.\n"
    );
  }

  public static String getInstructions(
    Integer phase,
    Integer passNumber,
    Integer identifiedCount
  ) {
    var instructions = PHASE_DETECTION_POINTS.get(phase);
    if (instructions == null) {
      instructions = Map.of();
    }
    var builder = new StringBuilder("***Instructions***:\n");
    for (var entry : instructions.entrySet()) {
      builder.append(
        String.format(
          "- For each %s you identify, compute the ratings found in the tool description then emit ***one call*** to the `%s()` function.\n",
          entry.getKey(),
          entry.getValue()
        )
      );
    }
    builder.append(
      String.format(
        "- **Do not list or summarize**\n" +
        "- **Stop after 5 function calls** in a single turn.\n" +
        "- If additional matches remain, state: \"More matches remain.  Please continue.\":\n" +
        "- When re-prompted, **resume** function calls from where you left off.\n" +
        "- You will always be given the **full document content** again, since session memory is disabled.\n\n" +
        "- You are currently **processing Pass %d**, and have already **identified %d items**\n",
        passNumber,
        identifiedCount
      )
    );
    var thingsToLookFor = instructions
      .keySet()
      .stream()
      .reduce((a, b) -> a + " or " + b)
      .orElse("");
    builder.append(
      String.format(
        "***Completion***:\n" +
        "If you are confident that all matches have been added, call `signalAnalysisPhaseComplete(documentId)`.\n" +
        "You may also say: \"All matches have been processed.\"\n\n" +
        "**Do not group multiple identified Key Points in one call.**  Call the function separately for each identified point.\n" +
        "- **Do not list or summarize**\n" +
        "- **Stop after 5 function calls** in a single turn.\n" +
        "- If additional matches remain, state: \"More matches remain.  Please continue.\":\n" +
        "- When re-prompted, **resume** function calls from where you left off.\n" +
        "- You will always be given the **full document content** again, since session memory is disabled.\n\n" +
        "***Completion***:\n" +
        "If you are confident that all matches have been added, call `signalAnalysisPhaseComplete(documentId)`.\n" +
        "You may also say: \"All matches have been processed.\"\n\n" +
        "**Do not group multiple identified %s in one call.**  Call the function separately for each identified point.\n\n",
        thingsToLookFor
      )
    );

    return builder.toString();
  }

  public static String getToolUsage(String friendlyName) {
    return getToolUsage(friendlyName, true);
  }

  public static String getToolUsage(
    String friendlyName,
    Boolean checkFromThisMessageFlag
  ) {
    return String.format(
      "If additional information is needed to fully evaluate compliance or intent, request that information using the avalable tools.  " +
      "If more information is still needed, use the 'addProcessingNote()' tool to attach a note explaining the need.\n\n" +
      "*** Measure Twice, Cut Once ***\n" +
      "You are *extremely throrough*.  Identify **all** matching %s in the communication, even if there are more than 10.  Items identified " +
      "in earlier rounds will be listed in the **Identified %s** section%s, do not re-add it and instead continue analysis to identify other new records.\n",
      friendlyName,
      friendlyName,
      friendlyName,
      checkFromThisMessageFlag ? " and flagged as 'From This Message'," : ""
    );
  }

  /**
   * Generates a prompt for a specific phase of the chatbot.
   *
   * @param phase The phase number for which the prompt is generated.
   * @param content The content list to be included in the prompt.
   * @return A string representing the generated prompt.
   */
  public static String getPromptForPhase(
    Integer phase,
    AugmentedContentListBase content
  ) {
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
          " task is Phase [%d] of a 5-phase legal review. Each phase focuses on a different compliance dimension.\n\n",
          phase
        )
      )
      .append(getPolicyPrompt());
    var sendDate = content.getActiveDocument().getDocumentSendDate();
    var phaseUniquePrompt = PHASE_PROMPTS.get(phase);
    if (phaseUniquePrompt != null) {
      promptBuilder
        .append(phaseUniquePrompt)
        .append(
          String.format(
            stateTitleNineInEffect(),
            sendDate.format(DateTimeFormatter.ofPattern("MM/dd/yyyy"))
          )
        );
    } else {
      LoggerFactory.getLogger(Prompts.class).warn(
        "No unique prompt found for phase {}. Using default prompt.",
        phase
      );
    }
    promptBuilder.append(getRecordStructure());
    promptBuilder.append(
      "\n*** Processed Content ***\n" +
      "The following is relevant data to the current message:\n\n"
    );
    return promptBuilder.toString();
  }

  protected static String getPolicyPrompt() {
    return getPolicyPrompt(null);
  }

  protected static String getPolicyPrompt(Map<String, String> tools) {
    var builder = new StringBuilder();
    builder.append(
      "\n*** Available Resources ***\n" +
      "  - Tools\n " +
      "    - `lookupPolicySummary()` : Vector-enabled search against relevant district policies and up-to-date state and federal laws.\n" +
      "         Provides access to the following relevant information:\n" +
      "           *SCOPE: School*\n" +
      "           + Policy 103: Complaints-Students, Employees, Parents, Other Persons (Scope: School)\n" + //
      "           + Policy 1920: PLHSStudent Handbook (Scope: School)\n" + //
      "           + Policy 211: Criminal or Civil Action Against School District, School Board Member, Employee or Student (Scope: School)\n" + //
      "           + Policy 301: School District Administration (Scope: School)\n" + //
      "           + Policy 304: Superintendent Contract, Duties and Evaluation (Scope: School)\n" + //
      "           + Policy 306: Administrator Code of Ethics (Scope: School)\n" + //
      "           + Policy 403: Discipline, Suspension and Dismissal of School District Employees\n" + //
      "           + Policy 406: Public and Private Personnel Data\n" + //
      "           + Policy 407: Safety\n" + //
      "           + Policy 414: Mandated Reporting\n" + //
      "           + Policy 501: Weapons\n" + //
      "           + Policy 504: Procedural Safeguards\n" + //
      "           + Policy 506: Student Discipline\n" + //
      "           + Policy 506.1: Bullying Prohibition\n" + //
      "           + Policy 515: Protection and Privacy of Student Records\n" + //
      "           + Policy 521: Grievance Procedure\n" + //
      "           + Policy 522: Title IX Sex Nondiscrimination Policy, Grievance Procedure and Process\n" + //
      "           + Policy 524: Electronic Technologies Acceptable Use Policy\n" + //
      "           + Policy 526: Harrassment Violence Report Form\n" + //
      "           + Policy 722: Public Data Requests\n" +
      "           + MN Statute 13: Data Practices\n" + //
      "           *SCOPE: State Law*\n" +
      "           + MN Statute 121.A: Student Rights Responsibilities and Behaviors\n" + //
      "           + MN Statute 122.A: Teachers and Educators\n" + //
      "           + MN Statute 123.B: School District Powers and Duties\n" + //
      "           + MN Statute 125.B: Education and Technology\n" + //
      "           + MN Statute 127.A: Admin of Education\n" + //
      "           + MN Statute 363.A: Human Rights\n" + //
      "           + MN Statute 626.556: MN Statute 626.556\n" +
      "           *SCOPE: Federal Law*\n" +
      "           + FERPA: Family Educational Rights and Privacy Act\n" +
      "           + Title IX: Title IX of the Education Amendments of 1972\n" +
      "         If additional legal policy information is needed, you may call this tool to retrieve it. \n" +
      "         When analyzing a situation for legal compliance, you should give preference to information contained \n" +
      "         within this index when it is available.\n" +
      "    - `addProcessingNote()`: Used to add additional processing, for example identify information that " +
      "         is missing or incomplete, or to add a note to the database for future reference.\n" +
      "    - `getCtaDetails`: Loads detailed information regarding a call to action, including responsive actions to date.  " +
      "         This tool should be used while assesing action compliance and completion percentages." +
      "         to retrieve the details of a specific call to action.\n" +
      "    - `lookupDocumentSummary`: Vector-enabled search that supports searching for and retrieving information " +
      "        found in other communication between the parent and the district.\n" +
      "\n"
    );
    return builder.toString();
  }

  /**
   * Retrieves the structure of a record as a formatted string.
   *
   * @return A string representing the record structure.
   */
  protected static String getRecordStructure() {
    var sampleMetadata = new HashMap<String, Object>();
    sampleMetadata.put("Sender", "Parent");
    sampleMetadata.put("Send Date", "2023-10-01 12:00:00");
    sampleMetadata.put("Record Type", "Email");

    var promptBuilder = new StringBuilder();
    promptBuilder
      .append("*** Record Structure ***\n")
      .append(
        "Messages and records will be provided using the following format:\n\n_#_ [Record Type] [Optional Metadata] _#_\n<message or JSON>\n_#_ END _#_\n\nFor example:\n"
      );
    promptBuilder
      .append(
        Strings.getRecordOutput(
          "Sample JSON Record",
          "{ \"field_name\": \"value\" }"
        )
      )
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
