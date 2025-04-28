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
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A utility class for generating prompts used by the chatbot assistants.
 * This class provides methods to construct various prompts for different phases and tools.
 */
public class Prompts {

  static final Logger log = LoggerFactory.getLogger(Prompts.class);

  static class PhaseTemplateVariables {

    public final Integer phase_number;
    public final String phase_name;
    public final String task_goal;
    public final String task_target_description;
    public final String task_tools;
    public final String message_schema;
    public final String override_completion_prompt;

    public PhaseTemplateVariables(
      Integer phase_number,
      String phase_name,
      String task_goal,
      String task_target_description,
      Map<String, String> task_tools,
      String message_schema,
      String override_completion_prompt
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
          .map(entry -> "    🛠️ `" + entry.getValue() + "` : " + entry.getKey())
          .reduce("", (a, b) -> a + "\n" + b);
      this.message_schema = message_schema;
      this.override_completion_prompt = override_completion_prompt;
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
      private String override_completion_prompt = null;

      public Builder setPhaseNumber(Integer phase_number) {
        this.phase_number = phase_number;
        return this;
      }

      public Builder setOverrideCompletionPrompt(
        String override_completion_prompt
      ) {
        this.override_completion_prompt = override_completion_prompt;
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
          message_schema,
          override_completion_prompt
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
      .addTaskTool(
        "Search for Key Points of Interest",
        "searchForRelatedKeyPoints"
      )
      .setMessageSchema(
        DocumentWithMetadataContent.getMetadataSchemaPromptText() +
        Schemas.KeyPoint +
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
        🧭 There are 5 steps in Phase 2; You are responsible for ➡️ 1 and ➡️ 2.  These focus specificallly on 🔔 and 📩 identification.
            The remaining steps are handled by another 🧑‍⚖️ and are not your responsibility.  Your task is to identify 🔔 and 📩 within
            the 📊📄 and extract them for subsequent analysis.  The 🔔 and 📩 should be extracted as separate 🧾 Response Objects.
            The 🔔 and 📩 should be extracted in the order they appear in the document.

          ☑️ === Step 1: Identify Calls to Action (🔔) ===
            Calls to Action 🔔 generally originate from the parent. They include any direct or implied request for information, records,
            clarification, follow-up, safety assurances, or any other action the 🏫 is obligated to take under board policy, law, or common
            decency ethical standards.  It is important that all 🔔 are identified.  Examples of 🔔 include, but are not limited to:
              ✅ Please provide me with a copy of...
              ✅ Can you explain why this decision was made?
              ✅ What steps will be taken to ensure...?
              ✅ Has a report been filed with the state?
              ✅ Consider this a formal request...
              ✅ Please correct this record...
              ✅ This is not correct...
              ✅ I still don't understand what happened... (**implied**)
              ☑️ If a 🔔 is **implied** (e.g., “I still don't understand what happened”), mark the 🧾 Response Object with `\"inferred\": true`
            ⚙️ 🔔 usually originate from a parent.  A message from 🏫 staff to a parent is not a 🔔, it is a 📩.
            ⚙️ A CTA Compliance Close Date 📅 should be assigned to each 🔔.  This is the date by which the 🏫 must respond to the request.
              📌 The Send Date of the 📊📄 should be used as the current date when making this calculation.
              📌 🏫 should be given a reasonable amount of time to respond, for example a maximum of 10 days from the date of the request
                per MN Statute 13.
              📌 Whenever possible, this date should have legal basis ⚖️.  If no legally binding timeline exists, pick a date that a third party auditor -
                  even one biased towards the 🏫 - would find reasonable.
            ⚙️ The Opened Date should be set to the Send Date of 📊📄.
            ⚙️ Where applicable, the previous document in the thread has been included.  This should be used for context, not extraction.  All
                extraction should be done from 📊📄.

          ☐ === Step 2: Identify Responsive Actions (📩) ===
            Responsive Actions 📩 generally originate from 🏫 staff. These include:
              ✅ Direct responses that fulfill or acknowledge a 🔔.
              ✅ Production of records or data persuant to a data request.
              ✅ Acknowledgement of a request for information or records.
              ✅ Acknowledgement of a request for clarification or follow-up.
              ✅ Statements that clarify policy or the District's position on a matter.
              ✅ Output from or information about a Distrcit investigation.
              ☑️ Partial responses or statements that address the same concern as a 🔔, but do not fully address it.
              ☑️ If a statement appears to acknowledge or avoid a CTA without directly answering it, mark it as an inferred Responsive Action
                  by settings `\"inferred\": true`.
            ⚙️ There is no need to associate a 📩 with a specific 🔔 at this time - this will be done in subsequent stages.  If a 🏫 response
                can reasonably be interpretted as action and likely responsive, a 📩 should be created.
            ⚙️ The Opened Date should be set to the Send Date of 📊📄.
            ⚙️ Where applicable, the previous document in the thread has been included.  This should be used for context, not extraction.  All
                extraction should be done from 📊📄.

          ⛔ === Step 3: 🔔 Reconciliation ===
          ⛔ === Step 4: 📩 Reconciliation ===
          ⛔ === Step 5: 🔔 Status Assesment ===
        """
      )
      .setMessageSchema(
        DocumentWithMetadataContent.getMetadataSchemaPromptText() +
        DocumentWithMetadataContent.getRecordSchemaPromptText() +
        DocumentWithMetadataContent.getAbbreviatedMetadataSchemaPromptText(
          "Reply-To Metadata (NOTE: If available)"
        ) +
        DocumentWithMetadataContent.getRecordSchemaPromptText(
          "Reply-To Document (NOTE: If available)"
        )
      )
      .setOverrideCompletionPrompt(
        SupportingPrompts.Extraction_CompletionPrompt_NoCount
      )
      .build(),
    2010,
    PhaseTemplateVariables.builder()
      .setPhaseNumber(2010)
      .setPhaseName("🔔: Categorization and Relationship Analysis")
      .addTaskTool(
        "Search for Key Points of Interest",
        "searchForRelatedKeyPoints"
      )
      .setTaskGoal("Identify 🔔 and 📩")
      .setTaskTargetDescription(
        """
        🧭 There are 5 steps in Phase 2; You are responsible for ➡️ 3 (🔔 Relationship Analysis)
          ✅ === Step 1: Identify Calls to Action (🔔) ===
          ✅ === Step 2: Identify Responsive Actions (📩) ===
          ☐ === Step 3: 🔔 Relationship Analysis ===
          You will be provided with a list of 🔔 in this case, as well as a of the 🏷️ that have been identified already. ⚠️ The provided list of 🏷️ are intended to
          to avoid duplication  of existing 🏷️.  New 🏷️ can be added, but the provided list should be used as a starting point.  The provided list should
          not be used to limit or focus your analysis.  Your goal in this phase is to categorize 🔔 into related asks (🏷️).  The 🏷️ should be used to group 🔔 that
          are related to each other, and will assist in associating them with the appropriate 📩.  📌 Every 🔔 provided in the input message must be processed and
          assigned to at lease one 🏷️.  Your task for this phase is to:
            ☐: Categorize 🔔 into related asks (🏷️).  🔔 should be placed into the same 🏷️ when the 📩 required to fulfill the 🔔 have overlap.  For example, the
               following 🔔 are related:
                  🏷️ Category A
                    ✅ What actions will the school take to address the sexual abuse and harassment Caty has reported, including unwanted touching and homophobic slurs?
                    ✅ What measures will the school implement to address systemic issues related to supervision and student safety highlighted by these incidents?
                    ✅ What steps will be taken to address the homophobic slurs and verbal abuse Caty has experienced?
                  🏷️ Category B
                    ✅ The parent is requesting confirmation of receipt of the email they sent on the prior Friday afternoon.
                    ✅ Provide a confirmation of receipt of the original email sent on or around November 1st.
                  🏷️ Category C
                    ✅ The parents requested confirmation regarding whether it was Michael Thomas or one of his designees who made the decision to deviate from school policy,
                       when the decision was made, and if a designee, when Michael Thomas was notified.
                    ✅ The parent asks for confirmation as to whether school policy was followed in the violent attack involving their daughter.
                       They also request the date the policy was complied with.
                  ⚠️ If two CTA's are about a similar topic, but have substantially different closure actions, they should not be categorized together.
                      For example, the following 🔔 are not related:
                        🏷️ Category A
                            ❌ This is a formal request for the email that was allegedly sent to my email address on 12/13 and blocked.
                          ❌ The parent formally requests full email system logs relating to all messages sent between specific addresses.
              📌 It is possible for a 🔔 to belong to more than 1 🏷️.
              📌 ***Do not de-duplicate***.  Every 🔔 that was provided as input must be associated with a minimum of **One** 🏷️.  If a batch complete and there
                 are any 🔔 Id values that cannot be located in a Response Object 🧾 callToActionIds field, the analyis will be considered invalida and need to be re-ran.
            ☐: Return all 🔔 listed under the 🏷️ they relate to.  🔔 should be placed into the same 🏷️ when the 📩 required to fulfill the 🔔 have overlap."
              📌 A 🔔 can be associated with more than one 🏷️.
              📌 Processing is not completed until all 🔔 have been associatd with at least one 🏷️, and all 🏷️ have been returned.
            """ +/*
    
    
            ⛔: For each identified 🔔, consider the parent's has assertion that all of the data or records they have requested are 🗝️ to the Title IX investigation;  they either speak directly towards in-scope matters, demonstrate incompliance with accessible communication standards, speak to the hostile school environment that was created, or when taken together are evidence supporting systemic bias or discrimination they faced.  Using all of the information available to you, including the case summary, related 📊📄, and available tools, rate from 1-10 the degree to which the data being requested meets criteria to be a key fact in the active investigation.
            ⛔: For each identified 🏷️, Use `lookupDocumentSummary` and related tools to identify all related 📊📄.
              📌 It is critical that you identify all 📊📄 that are related to the 🔔.  This includes any documents that are related to the 🏷️, even if they do not directly mention it.  Use multiple tool calls if necessary.
              📌 Communications related to but not specifically metioning a 🔔 should be marked as `inferred`.
              📌 The 🔔-related 📊📄 are those that are related to the 🔔 in a way that they are likely to be relevant to the response or analysis thereof.
               */
        """
          ⛔ === Step 4: 📩 Reconciliation ===
          ⛔ === Step 5: 🔔 Status Assessment ===
        """
      )
      .setMessageSchema(
        Strings.getRecordOutput(
          "🏷️ (Categories currently in database.  Use these when appropriate, but OK to add add new 🏷️ to match current input)",
          """
            🗂️ (Record Divider)
              🏷️ Id: <Category 1 ID>
              🏷️ Name: <Category 1 Name>
              🏷️ Description: <Category 1 Name>
            🗂️(Record Divider)
              🏷️ Id: <Category 1 ID>
              🏷️ Name: <Category 1 Name>
              🏷️ Description: <Category 1 Name>
          """
        ) +
        "\n\n" +
        Strings.getRecordOutput(
          "🔔 (Identified Calls to Action to be categorized)",
          """
            🗂️
            🔔 Id: <CTA 1 ID - This value should be returned when categorizing this record>
            Description: <CTA 1 Description>
            🏷️:
            <Assigned Category 1 ID>
            <Assigned Category 2 ID>
            ...
            📅 (Opened Date): yyyy-MM-dd <CTA 1 Opened Date>
            📊📄(Related Document): <CTA 1 Related Document ID>
            📩 (Closure Actions):
            <CTA 1 Closure Action 1>
            <CTA 1 Closure Action 2>
            📜(Policy Basis):
            <CTA 1 Policy Basis 1>
            <CTA 1 Policy Basis 2>
            🗂️
            🔔 Id: <CTA 2 ID>
            Description: <CTA 2 Descriptions>
            🏷️:
            <Assigned Category 1 ID>
            <Assigned Category 2 ID>
            ...
            📅: yyyy-MM-dd <CTA 2 Opened Date>
            📊📄: <CTA 2 Related Document ID>
            📩:
            <CTA 2 Closure Action 1>
            <CTA 2 Closure Action 2>
            ...
            📜(Policy Basis):
            <CTA 2 Policy Basis 1>
            <CTA 2 Policy Basis 2>
            ...
          """
        )
      )
      .setOverrideCompletionPrompt(
        SupportingPrompts.Extraction_CompletionPrompt_NoCount
      )
      .build(),
    2020,
    PhaseTemplateVariables.builder()
      .setPhaseNumber(2020)
      .setPhaseName("🔔: Title IX Assessment, Record Persistence")
      .addTaskTool(
        "Search for Key Points of Interest",
        "searchForRelatedKeyPoints"
      )
      .setTaskGoal("Asses Title IX Relevance: 🔔")
      .setOverrideCompletionPrompt(
        SupportingPrompts.Extraction_CompletionPrompt_NoCount
      )
      .setTaskTargetDescription(
        """
        🧭 There are 5 steps in Phase 2; You are responsible for ➡️ 4 (🔔 Asses Title IX Relevance)
          ✅ === Step 1: Identify Calls to Action (🔔) ===
          ✅ === Step 2: Identify Responsive Actions (📩) ===
          ✅ === Step 3: 🔔 Relationship Analysis ===
          ☐  === Step 4: 🔔 Asses Title IX Relevance  ===
            You will be provided with a list of 🔔 that have been identified in this case.  Your task is to assess the degree to which each CTA can be considered relavent to the active Title IX investigation.  For any 🔔 requesting acces to records, information, or other data, you are specifically assessing whether that data meets the criteria to be considered a 🗝️ fact in the investigation and governed under the rules of equal access Title IX mandates.
              📌 When making your assessment, use all of the tools and information available to you.  This includes, but is not limited to -
                ✨ The case summary provided in the input message.
                ✨ The list of 🔔 and related documents provided in the input message.
                ✨ Detailed document records, including attachments, as returned by the `getDocumentDetails` tool.
                  💡 The list of related documents returned by this tool if additional information is needed to make your assesment.
                ✨ Information returned by the `lookupDocumentSummary` tool.
                  💡 This tool can be used to search for specific information in the case documents.
                  🧠 Using a scope of `all` allows you to search all documents, including attachments, which contain vital data.
               📌 The parents have asserted all of the records they have requested are 🗝️ data as they either speak directly towards in-scope matters, demonstrate incompliance with accessible communication standards, speak to the hostile school environment that was created, or when taken together are evidence supporting systemic bias or discrimination their child faced.  Your job is to provide an unbiased and legally grounded opinion of that assesment.
            ☐  Evaluate each 🔔 and assign a rating from 0-10 regarding the degree to which the request or data are relevant to the Title IX claim.  A rating of 0 means the request is in no way relevant and no special access to data necessary, a rating of 10 means the request is so obviously relevant that no assesor or auditor - including a biased one - could reasonably argue otherwise.  A rating of 5 indicates an unbiased auditor or assessor applying best practices would likely find it relevant, but be open to explanations otherwise.
            ☐  While going about your analysis, if you come accross documents that you are related to a 🔔 that would be helpful to review during later phases of analyis - such as compliance and violations detection - note the ID of the related document and reason of relation and include it in the output.
            ☐  The CTA database will be sourced from your response, so it is imperitive that you analyze and return information about every 🔔 in the request message.
          ⛔ === Step 5: 📩 Reconciliation ===
          ⛔ === Step 6: 🔔 Status Assessment ===
        """
      )
      .setMessageSchema(
        Strings.getRecordOutput(
          "🏷️ (Categories currently in database.  Use these when appropriate, but OK to add add new 🏷️ to match current input)",
          """
            🗂️ (Record Divider)
              🏷️ Id: <Category 1 ID>
              🏷️ Name: <Category 1 Name>
              🏷️ Description: <Category 1 Name>
            🗂️(Record Divider)
              🏷️ Id: <Category 1 ID>
              🏷️ Name: <Category 1 Name>
              🏷️ Description: <Category 1 Name>
          """
        ) +
        "\n\n" +
        Strings.getRecordOutput(
          "🔔 (Identified Calls to Action to be categorized)",
          """
            🗂️
            🔔 Id: <CTA 1 ID - This value should be returned when categorizing this record>
            Description: <CTA 1 Description>
            🏷️:
            <Assigned Category 1 ID>
            <Assigned Category 2 ID>
            ...
            📅 (Opened Date): yyyy-MM-dd <CTA 1 Opened Date>
            📊📄(Related Document): <CTA 1 Related Document ID>
            📩 (Closure Actions):
            <CTA 1 Closure Action 1>
            <CTA 1 Closure Action 2>
            📜(Policy Basis):
            <CTA 1 Policy Basis 1>
            <CTA 1 Policy Basis 2>
            🗂️
            🔔 Id: <CTA 2 ID>
            Description: <CTA 2 Descriptions>
            🏷️:
            <Assigned Category 1 ID>
            <Assigned Category 2 ID>
            ...
            📅: yyyy-MM-dd <CTA 2 Opened Date>
            📊📄: <CTA 2 Related Document ID>
            📩:
            <CTA 2 Closure Action 1>
            <CTA 2 Closure Action 2>
            ...
            📜(Policy Basis):
            <CTA 2 Policy Basis 1>
            <CTA 2 Policy Basis 2>
            ...
          """
        )
      )
      .build()
  );

  private static class Schemas {

    @SuppressWarnings("unused") // it will be eventually
    public static final String CTA = Strings.getRecordOutput(
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
    );

    public static final String KeyPoint = Strings.getRecordOutput(
      "Key Points 📍 in Target Document 📊📄",
      """
        📍 <Key Point 1 Description>
        📍 <Key Point 2 Description>
      """
    );
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
          📎 (👤⚠️ B) was involved in the regular bullying, which 🚨 escalated, culminating with (👤⚠️ B) striking 🎯 over the head with metal portion of a chair
            3 times (💥 3), and then 5 minutes later picking the chair back up and striking 🎯 twice more, also in the head (💥 4).
            ⚠️ This occurred in the classroom while under direct teacher supervision (🧑‍🏫 B).
              🚨 This resulted in a severe concussion for 🎯.
          📎 As a result of these events, 🚔's mental health deteriorated 💔.  After a 🚑🚨 suicide attempt, 🎯 was placed into a
          partial psychiatric 🏥💔 program.
            🧠 While at that program, 🎯 **temporarily** enrolled in 🏫 at the hospital.
          ⚠️ (👤⚠️ A) hit 🎯 in the head (💥 5) the day following the assault with a chair.  (👤⚠️ A) was aware that 🎯 had been severly injured at the time.
            The 🏫 has knowledge this occurred
          🕵️ (🧑‍🏫 A) claims they never saw any of the occurrences of (💥 1).  (🧑‍🏫 B) claims they never saw (💥 3) or (💥 4).
            🤔 Both items occurred in class while under direct 🧑‍🏫 supervision.
            🤔 (💥 3) would be incredibly hard to miss, especially with (💥 4) occurring 5 minutes later.
            ❌ No maltreatment reporting to external agencies occurred.
            ⚠️ The 🏫 has received both verbal and written reports of the incidents.
          🕵️ No discipline actions of note has occurred.
            📎 The 🏫 has no record of any disciplinary action or training / education being provided to (🧑‍🏫 A or B).
            📎 (👤⚠️ B) parents were notified of involvement in (💥 3)/(💥 4).
            🕵️ No suspension, classroom removal, or other noticeable remedial action was taken.
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
              🗝️ This made accessible reporting mechanisms 📧 - specifically electronic - critically important.
       📌 The parent maintains information surrounding all of the events discussed are 🗝️ facts in the ⚖️ Title IX investigation
          📦When taken together they are evidence of the systemic discrimination 🎯 experienced from 🧑‍🏫,🏫, and 🧑‍🎓.
      📝 When evaluating 🏫 responses relating to data or records, apply Title IX provisions regarding equal access to key records
              and the exceptions both FERPA and MN statute 13 provide for access to Title IX key documents.
        🗝️ The parent maintains that the 🏫 has a legal obligation to provide them with access to all data and records related to the investigation.
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
           ❌ Each finding must have basis within the 📊📄 to be eligible for counting towards the task goal.
    📅: For any date-related analysis, use the Send Date (📨📅) of the 📊📄 as the current date.
    ⚙️: When evaluating reasonableness or compliance to data privacy obligations, consider the following:
        - 📌 The extent to which the data or record meets criteria to be considered 🗝️ to Title IX.
            - ⚠️ If the data or record is not considered 🗝️ to Title IX, include a description of the reason why in the response.
            - ✅ If the data or record is considered 🗝️ to Title IX, evaluate compliance with the expanded access rights under that statute in mind.
        - 📌 The extent to which the data or record meets criteria to be considered 🗝️ to FERPA.
        - 📌 The extent to which the data or record meets criteria to be considered 🗝️ to MN Statute 13.
        - 📌 The extent to which the data or record meets criteria to be considered 🗝️ to child protection statutes.

    🗂️ **Record Structure**
    {{message_schema}}
    🗂️ ***IMPORTANT: Control Flow***
    {{completion_prompt}}
    """;

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
    map.put(
      "completion_prompt",
      Objects.requireNonNullElse(
        phaseVars.override_completion_prompt,
        SupportingPrompts.Extraction_CompletionPrompt
      )
    );

    var template = new PromptTemplate(SystemPromptTemplateText).apply(map);
    var ret = template.text();
    log.trace("System prompt generated for phase {}:\n{}", phase, ret);
    return ret;
  }

  public static final String StartExtractionUserPromptText = "{{it}}";
  public static final String ContinueExtractionUserPromptText =
    SupportingPrompts.ContinueExtractionUserPromptText;
  public static final String ContinueExtractionWithLastResultUserPromptText =
    SupportingPrompts.ContinueExtractionUserPromptText;
  public static final String StartExtractionForCtaCategories =
    "{{categories}}\n\n{{ctas}}";
  public static final String ContinueExtractionForCtaCategories =
    "{{categories}}\n\n" + SupportingPrompts.ContinueExtractionUserPromptText;

  public static Boolean matchesContinueExtraction(String userPrompt) {
    return SupportingPrompts.matchesContinueExtraction(userPrompt);
  }
}
