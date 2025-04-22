package com.obapps.schoolchatbot.chat.assistants;

import com.obapps.core.util.*;
import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;
import com.obapps.schoolchatbot.core.util.SupportingPrompts;
import dev.langchain4j.model.input.PromptTemplate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

/**
 * A utility class for generating prompts used by the chatbot assistants.
 * This class provides methods to construct various prompts for different phases and tools.
 */
public class Prompts {

  static class PhaseTemplateVariables {

    public final Integer phase_number;
    public final String phase_name;
    public final String task_goal;
    public final String task_target_description;
    public final String task_tools;
    public final String message_schema;

    public PhaseTemplateVariables(
      Integer phase_number,
      String phase_name,
      String task_goal,
      String task_target_description,
      Map<String, String> task_tools,
      String message_schema
    ) {
      super();
      this.phase_number = phase_number;
      this.phase_name = phase_name;
      this.task_goal = task_goal;
      this.task_target_description = task_target_description;
      this.task_tools = task_tools == null
        ? ""
        : task_tools
          .entrySet()
          .stream()
          .map(entry -> entry.getKey() + ": " + entry.getValue())
          .reduce("", (a, b) -> a + "\n" + b);
      this.message_schema = message_schema;
    }

    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {

      private Integer phase_number;
      private String phase_name;
      private String task_goal;
      private String task_target_description;
      private List<Entry<String, String>> task_tools;
      private String message_schema;

      public Builder setPhaseNumber(Integer phase_number) {
        this.phase_number = phase_number;
        return this;
      }

      public Builder setPhaseName(String phase_name) {
        this.phase_name = phase_name;
        return this;
      }

      public Builder setTaskGoal(String task_goal) {
        this.task_goal = task_goal;
        return this;
      }

      public Builder setTaskTargetDescription(String task_target_description) {
        this.task_target_description = task_target_description;
        return this;
      }

      public Builder addTaskTool(String tool_name, String tool_function) {
        this.task_tools.add(Map.entry(tool_name, tool_function));
        return this;
      }

      public Builder addTaskTool(Entry<String, String> task_tool) {
        this.task_tools.add(task_tool);
        return this;
      }

      public Builder setMessageSchema(String message_schema) {
        this.message_schema = message_schema;
        return this;
      }

      protected Builder() {
        super();
        this.task_tools = new ArrayList<Entry<String, String>>();
      }

      public PhaseTemplateVariables build() {
        var tool_map = new HashMap<String, String>();
        task_tools
          .stream()
          .forEach(entry -> tool_map.put(entry.getKey(), entry.getValue()));
        return new PhaseTemplateVariables(
          phase_number,
          phase_name,
          task_goal,
          task_target_description,
          tool_map,
          message_schema
        );
      }
    }
  }

  public static final Map<Integer, PhaseTemplateVariables> PHASE_VARS = Map.of(
    1,
    PhaseTemplateVariables.builder()
      .setPhaseNumber(1)
      .setPhaseName("Key Points of Interest 📍")
      .setTaskGoal("Identify Key Points of Interest 📍")
      .setTaskTargetDescription(
        """
        🗝️ Key Point of Interests 📍 are 💬 statements or topics in the document that are relevant to
          🏛️legal or 🧾policy obligations, or otherwise warrant further review or 🕵️, such as:
            ✅ Information recarding allegations of harassment or violence, or other concerns about safety.
            ✅ Information about the 🏫 obligations or responsibilities, including ethical policies mandating
                the 🏫 act in good faith and with common decency and compliance with applicable laws and policies.
            ✅ Information about the 🏫 actions, failures to act, or retaliatory actions taken in response to a situation.
            ✅ Information about the 🏫 maintanence and responsiveness to data requests.
          These points can be directly stated or inferred from the context of the 📊📄.  When inferred,
          the `\"inferred\": true` flag should be set in the emitted 🧾 Response Object.
            """
      )
      .addTaskTool("Key Points of Interest", "addKeyPointOfInterestToDatabase")
      .setMessageSchema(
        DocumentWithMetadataContent.getMetadataSchemaPromptText() +
        Strings.getRecordOutput(
          "Key Points 📍 in Target Document 📊📄",
          """
            📍 <Key Point 1 Description>
            📍 <Key Point 2 Description>
          """
        ) +
        DocumentWithMetadataContent.getRecordSchemaPromptText()
      )
      .build(),
    2,
    PhaseTemplateVariables.builder()
      .setPhaseNumber(2)
      .setPhaseName("Calls to Action (🔔) and Responsive Actions (📩)")
      .setTaskGoal("Identify 🔔 and 📩")
      .setTaskTargetDescription(
        """
                ☐ === Step 1: Identify Calls to Action (🔔) ===
                  Calls to Action 🔔 generally originate from the parent. They include any direct or implied request for information, records,
                  clarification, follow-up, safety assurances, or any action the 🏫 is obligated to take under board policy, law,
                  or common decency.  Some examples of 🔔 include:
                    ✅ Please provide me with a copy of...
                    ✅ Can you explain why this decision was made?
                    ✅ What steps will be taken to ensure...?
                    ✅ Has a report been filed with the state?
                    ✅ Please correct this record...
                    ✅ This is not correct...
                    ✅ I still don't understand what happened... (**implied**)
                    ☑️ If a 🔔 is **implied** (e.g., “I still don't understand what happened”), mark the 🧾 Response Object with `\"inferred\": true`
                  📌 🔔 usually originate from a parent.  A message from 🏫 staff to a parent is not a 🔔, it is a 📩 to a 🔔.
                  ⚙️ If a parent asks for a follow-up or re-states a previous unfulfilled 🔔, it is a Responsive Action to the original 🔔.
                  ⚙️ A CTA Compliance Close Date 📅 should be assigned.  This is the date by which the 🏫 must respond to the request.
                    📌 The Send Date of the 📊📄 should be used when making this calculation.
                    🏫 should be given a reasonable amount of time to respond, for example a maximum of 10 days from the date of the request per MN Statute 13.
                    ⚖️ Whenever possible, this date should have legal basis.  If no legally binding timeline exists, pick a date that a third party auditor -
                       even one biased towards the 🏫 - would find reasonable.

                ☐ === Step 2: Identify Responsive Actions (📩) ===
                  Responsive Actions 📩 generally originate from 🏫 staff. These include:
                    ✅ Direct responses that fulfill or acknowledge a 🔔
                    ⚠️ Partial responses or statements that address the same concern
                    ❌ **Failure to respond** to an open 🔔, if a response would reasonably be expected.
                    ☑️ If a statement appears to acknowledge or avoid a CTA without directly answering it, mark it as an inferred Responsive Action
                       by settings `\"inferred\": true`.
                  ⚙️ With the exceptions of additional requests for 🏫 response, or reports of insufficient response, a parent cannot respond to their own CTA.
        """
      )
      .addTaskTool("Call to Action", "addCallToActionToDatabase")
      .addTaskTool("Responsive Action", "addCtaResponseToDatabase")
      .setMessageSchema(
        DocumentWithMetadataContent.getMetadataSchemaPromptText() +
        Strings.getRecordOutput(
          "Identified 🔔",
          """
            🗂️
              Id: 📎 <CTA 1 ID>
              📝: <CTA 1 Description>
              From 📊📄: <"Yes" If 🔔 was found in 📊📄, otherwise "No">
            🔽 📩 <Begin Responsive Actions>
              ➖ 📩: <Responsive Action 1 Description>
                  From 📊📄: <"Yes" If 📩 was found in 📊📄, otherwise "No">
              ➖ 📩: <Responsive Action 2 Description>
            🗂️
              Id: 📎 <CTA 2 ID>
              📝: <CTA 2 Description>
              From 📊📄: <"Yes" If 🔔 was found in 📊📄, otherwise "No">
            🔽 📩 <Begin Responsive Actions>
              ❌ None
          """
        ) +
        DocumentWithMetadataContent.getRecordSchemaPromptText()
      )
      .build()
  );

  public static final String StartExtractionUserPromptText = "{{it}}";
  public static final String ContinueExtractionUserPromptText =
    SupportingPrompts.ContinueExtractionUserPromptText;

  public static Boolean matchesContinueExtraction(String userPrompt) {
    return SupportingPrompts.matchesContinueExtraction(userPrompt);
  }

  protected static final String CaseOutlinePrompt =
    """
      📎 A Student (🎯) attended the 🏫 for 60 days.
      📎 During the last 45 of this time, 🎯 experienced almost daily unwanted touching (💥 1) from another 🧑‍🎓 (👤⚠️ A).
        ❌ This included at times pressing 🎯 against walls and restricting their ability to move (💥 2).
        🧠 The touching would occur in the lunchroom, hallways, and the one class that 🎯 and (👤⚠️ A) shared.
          ❌ A teacher (🧑‍🏫 A) was supervising the classroom during many occurrences of (💥 1).
      ⚠️ (👤⚠️ A) and their peer group engaged in almost daily bullying of 🎯. (💥 2).
        ❌ Many times the bullying specifically targeted their sexual orientation.
      📎 (👤⚠️ B) was invovled in the regular bullying, which 🚨 escalated, culminating with (👤⚠️ B) striking 🎯 over the head with metal portion of a chair
        3 times (💥 3), and then 5 minutes later picking the chair back up and striking 🎯 twice more, also in the head (💥 4).
        ⚠️ This occurred in the classroom while under direct teacher supervision (🧑‍🏫 B).
          🚨 This resulted in a severe concussion for 🎯.
      📎 As a result of these events, 🚔's mental health deteriorated 💔.  After a 🚑🚨 suicide attempt, 🎯 was placed into a
      partial psychiatic 🏥💔 program.
        🧠 While at that program, 🎯 **temporarily** enrolled in 🏫 at the hospital.
      🕵️ (🧑‍🏫 A) claims they never saw any of the occurrences of (💥 1).  (🧑‍🏫 B) claims they never saw (💥 3) or (💥 4).
        🤔 Both items occurred in class while under direct 🧑‍🏫 supervision.
        🤔 (💥 3) would be incredibly hard to miss, especially with (💥 4) occuring 5 minutes later.
        ❌ No maltreatment reporting to external agencies occurred.
        ⚠️ The 🏫 has received both verbal and written reports of the incidents.
      🕵️ No disclipline actions of note has occurred.
        📎 The 🏫 has no record of any disclipliary action or training / education being provided to (🧑‍🏫 A or B).
        📎 (👤⚠️ B) parents were notified of involvement in (💥 3)/(💥 4).
        🕵️ No suspension, classroom removal, or other noticable remedial action was taken.
        🧠 After 🎯 parents notified 🛡️, (👤⚠️ B) was 🧾 with 3rd degree felony assault 🚔.
      ❌ The lack of visible actions from 🏫 has negatively impacted 🎯 belief 💥 will not recur, and thus their ability to feel safe in 🏫.
      📎 The 🎯 parent has made multiple direct requests for details on the 🏫 plan to ensure 🎯 safety upon return.
        ❌ The 🏫 has not responded with a plan.
        🧠 After months without a responsive plan, the 🎯 parents were forced to enroll 🎯 in a private 🏫 at their expense.
        🤔 The 🏫 position is no plan was required because 🎯 is not enrolled.
    ⚖️ A Title IX investigation was opened regarding (💥1) and (💥2) on 📅12/20/24.
      📌 The investigation remained in the initial phase until dismissed on 📅4/8/25.
          🕵️ 🏫 claims they could not identify the assailant.
          ❌ The only substantive investigation update provided to 🎯 was the notification of dismissal.
        🧠 🎯 parents work full time and are caregivers for elderly parents and a child in crisis.
          🗝️ This made accesible reporting mechanisms 📧 - specifically electronic - critically important.
      📎 The parent maintains information surrounding all of these events are 🗝️ facts in the ⚖️ Title IX investigation
          📦When taken together they 🧾 a 🔁 of the systemic discrimination 🎯 experienced from 🧑‍🏫,🏫, and 🧑‍🎓 due to their gender and sexual identity.
        📝 When evaluating requests for data or records related to these events, 🧑‍⚖️ the extent to which the data or record meets criteria to be considered
          🗝️ to Title IX.  If affirmative, use applicable ⚖️ and 📜.
        """;

  public static String SystemPromptTemplateText =
    """
    🗂️ 📖 **Context**
    You are a lawyer who specializes in ⚖️ education law, ⚖️ civil rights compliance, and 🏫 obligations
    under state and federal ⚖️, including 📌Title IX, 📌FERPA, 📌MN Statue 13, and 📌child protection statutes.
    You are highly familiar with a 🏫's 🏛️ responsibilities to 📌maintain 🧾, 📌respond to data requests,
    🕵️ harassment or violence, and ensure a safe learning environment.
    You have been retained by a parent to review 💬 written communications (📊📄) between the parent and a 🏫.
    Your current task is ☐ Phase [{{phase_number}} - {{phase_name}}] of a 🔂 5-phase 🧭 legal review.
    Each phase focuses on 📊 a different compliance dimension; The goal of this phase is ✅ {{task_goal}}.
    {{task_target_description}}

    🗂️🎬 **Case Outline**
    {{case_outline}}

    🗂️⚙️ **Resources**
      🧰🛠️: Tools
        - 📚 `lookupPolicySummary(query,scope)`: Policy/legal compliance lookup; prefer indexed results.
        - 📄 `lookupDocumentSummary(query,scope)`: Search case docs/attachments.
        - 📊 `getDocumentDetails(id)`: Retrieve a specific document/attachments by id.
        {{task_tools}}
      ✅: If you need more information to complete your task, you may use any or all of the tools above.
        ⚠️: If more info is still needed after using the tools, include a Processing Note (📝⚙️) describing the information gap in your
            response.  📝⚙️ will be reviewed by the team and acted on when possible.
        ⚠️ You may use retrieved context for additional understanding, but:
           ❌ Do NOT extract findings based solely on the search results
           ❌ Do NOT identify a {{target_item}} unless it is 🔗 clearly referenced in the target document.
    📅: For any date-related analysis, use the Send Date (📨📅) of the 📊📄 as the current date.

    🗂️ **Record Structure**
    {{message_schema}}
    """ +
    SupportingPrompts.Extraction_CompletionPrompt;

  public static String GetSystemMessageForPhase(Integer phase) {
    var phaseVars = PHASE_VARS.get(phase);
    if (phaseVars == null) {
      throw new IllegalArgumentException(
        "Phase " + phase + " is not defined in the phase variables."
      );
    }
    var map = new HashMap<String, Object>(5);
    map.put("case_outline", CaseOutlinePrompt);
    map.put("phase_number", phaseVars.phase_number);
    map.put("phase_name", phaseVars.phase_name);
    map.put("task_goal", phaseVars.task_goal);
    map.put("task_target_description", phaseVars.task_target_description);
    map.put("task_tools", phaseVars.task_tools);
    map.put("message_schema", phaseVars.message_schema);
    map.put("target_item", phaseVars.phase_name);

    var template = new PromptTemplate(SystemPromptTemplateText).apply(map);
    return template.text();
  }
}
