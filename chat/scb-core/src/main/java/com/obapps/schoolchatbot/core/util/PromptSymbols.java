package com.obapps.schoolchatbot.core.util;

import java.util.regex.Pattern;

/**
 * The `PromptSymbols` class provides a collection of Unicode symbols
 * that can be used as visual cues or markers in LLM prompts. Each
 * symbol is associated with a specific meaning or context, such as
 * checklist statuses, warnings, insights, or instructions.
 *
 * Symbols included:
 * - CHECKLIST_CONFIRMED: Represents an affirmative match or rule satisfied (✅).
 * - CHECKLIST_UNCHECKED: Represents a rule or condition that must be evaluated (☐).
 * - CHECKLIST_SOFT_COMPLETE: Represents a less assertive version of confirmed (☑️).
 * - EXCLUSION: Represents an invalid or prohibited condition (❌).
 * - WARNING: Represents a warning or exception (⚠️).
 * - INSIGHT: Represents reasoning, insight, or an explanation cue (🧠).
 * - ANALYZE: Represents analysis or search focus (🔍).
 * - INSTRUCTION: Represents an instruction step (📝).
 * - REFERENCE: Represents a reference or citation marker (📎).
 * - POLICY: Represents a legal or policy context (🧾).
 * - QUOTE: Represents a quoted message or user voice (💬).
 * - CONTINUE: Represents a repeat or continue instruction (🔁).
 * - INVESTIGATE: Represents investigator or detection logic (🕵️).
 * - SECTION_DIVIDER: Represents a document section or grouping divider (🗂️).
 * - PINNED: Represents a pinned fact or phase constraint (📌).
 */
public class PromptSymbols {

  /**
   * Checklist - Confirmed Condition: An affirmative match or rule satisfied
   */
  public static final String CHECKLIST_CONFIRMED = "\u2705"; // ✅

  /**
   * Checklist - Unchecked Condition: A rule or condition that must be evaluated
   */
  public static final String CHECKLIST_UNCHECKED = "\u2610"; // ☐

  public static final String SCHOOL = "\u1F3EB"; // 🏫

  /**
   * Checklist - Completed (soft): A less assertive version of confirmed
   */
  public static final String CHECKLIST_SOFT_COMPLETE = "\u2611"; // ☑️

  /**
   * Exclusion - Invalid or Prohibited
   */
  public static final String EXCLUSION = "\u274C"; // ❌

  /**
   * Warning or Exception
   */
  public static final String WARNING = "\u26A0"; // ⚠️

  /**
   * Reasoning, Insight, or Explanation Cue
   */
  public static final String INSIGHT = "\uD83E\uDDE0"; // 🧠

  /**
   * Analysis / Search Focus
   */
  public static final String ANALYZE = "\uD83D\uDD0D"; // 🔍

  /**
   * Instruction Step
   */
  public static final String INSTRUCTION = "\uD83D\uDCDD"; // 📝

  /**
   * Reference or Citation Marker
   */
  public static final String REFERENCE = "\uD83D\uDCCE"; // 📎

  /**
   * Legal or Policy Context
   */
  public static final String POLICY = "\uD83E\uDDFE"; // 🧾

  /**
   * Quoted Message or User Voice
   */
  public static final String QUOTE = "\uD83D\uDCAC"; // 💬

  /**
   * Repeat / Continue Instruction
   */
  public static final String CONTINUE = "\uD83D\uDD01"; // 🔁

  /**
   * Investigator, Detection Logic
   */
  public static final String INVESTIGATE = "\uD83D\uDD75"; // 🕵️

  /**
   * Document Section or Grouping Divider
   */
  public static final String SECTION_DIVIDER = "\uD83D\uDCC2"; // 🗂️

  /**
   * Pinned Fact or Phase Constraint
   */
  public static final String PINNED = "\uD83D\uDCCC"; // 📌

  /**
   * Unicode symbol representing a checklist (📋).
   * This constant can be used to display a checklist icon in user interfaces
   * or messages where a visual representation of a checklist is needed.
   */
  public static final String CHECKLIST = "\uD83D\uDCCB"; // 📋

  /**
   * Represents a Unicode symbol for a package box (📦).
   * This constant can be used as a visual indicator or prompt symbol
   * in the application.
   */
  public static final String NEW_SYMBOL = "\uD83D\uDCE6"; //📦

  public static final String TOOLS = "\uD83D\uDDA0\uFE0F"; // 🛠️
  public static final String POLICY_LOOKUP = "\uD83D\uDCDA"; // 📚
  public static final String DOCUMENT_SEARCH = "\uD83D\uDCC4"; // 📄

  // 🔄 Status / Flow

  // 🔍 Search
  public static final String SEARCH = "\uD83D\uDD0D"; // 🔍 Search / Query

  // 📊 Data
  public static final String ANALYSIS = "\uD83D\uDCCA"; // 📊 Analysis / Data Summary

  // 🔒 Privacy / Access
  public static final String PRIVATE = "\uD83D\uDD10"; // 🔐 Private / Protected
  public static final String OPEN = "\uD83D\uDD13"; // 🔓 Open / Public
  public static final String KEY = "\uD83D\uDD11"; // 🗝️ Authorization / Key

  // 🧭 Navigation / Control Flow
  public static final String DIRECTION = "\uD83E\uDDFD"; // 🧭 Direction / Scope
  public static final String ADD = "\u2795"; // ➕ Add / Expand
  public static final String REMOVE = "\u2796"; // ➖ Remove / Collapse
  public static final String BACK = "\u23EE\uFE0F"; // ⏮️ Back / Previous

  // ⚖️ Legal / Compliance
  public static final String LAW = "\u2696\uFE0F"; // ⚖️ Law Reference
  public static final String COURT = "\uD83C\uDFFB"; // 🏛️ Court / Legal Authority
  public static final String STATUTE = "\uD83D\uDCDC"; // 📜 Statute / Regulation
  public static final String RECEIPT = "\uD83E\uDDFE"; // 🧾 Receipt / Evidence / Audit

  // 🧭 Control Flow & Navigation
  public static final String NEXT = "\u23ED\uFE0F"; // ⏭️ Next / Continue
  public static final String UP = "\uD83D\uDD3C"; // 🔼 Up / Promote
  public static final String DOWN = "\uD83D\uDD3D"; // 🔽 Down / Demote
  public static final String LOOP = "\uD83D\uDD01"; // 🔁 Repeat / Retry

  // ⏳ Progress / Status
  public static final String IN_PROGRESS = "\u23F3"; // ⏳ In Progress / Pending
  public static final String BETA = "\uD83E\uDDEA"; // 🧪 Experimental / Beta
  public static final String QUESTIONABLE = "\u2753"; // ❓ Uncertain / Needs Clarification
  public static final String SUSPICIOUS = "\uD83E\uDD14"; // 🤔 Doubt / Questionable Behavior

  // 📍 Location & Reference
  public static final String LOCATION = "\uD83D\uDCCD"; // 📍 Location / Context
  public static final String FAVORITE = "\u2B50"; // ⭐ Favorite / Highlight

  // 📬 Messaging & Communication
  public static final String MESSAGE_RECEIVED = "\uD83D\uDCEC"; // 📬 Message Received

  public static final String SETTINGS = "\u2699\uFE0F"; // ⚙️ Config/Settings
  public static final String AI_AUTOMATE = "\uD83E\uDD16"; // 🤖 AI / Bot
  public static final String ALERT = "\uD83D\uDCE2"; // 📢 Alert
  public static final String MESSAGE_SENT = "\uD83D\uDCE8"; // 📨 Sent
  public static final String ACTOR = "\uD83D\uDC64"; // 👤 Neutral Person / Actor
  public static final String PARTICIPANT = "\uD83E\uDDD1"; // 🧑 Generic Human / Participant
  public static final String LEGAL_ACTOR = "\uD83E\uDDD1\u200D\u2696\uFE0F"; // 🧑‍⚖️ Judge / Legal Role
  public static final String STUDENT = "\uD83E\uDDD1\u200D\uD83C\uDF93"; // 🧑‍🎓 Student
  public static final String TEACHER = "\uD83E\uDDD1\u200D\uD83C\uDFEB"; // 🧑‍🏫 Teacher / Staff
  public static final String ORGANIZATION = "\uD83C\uDFE2"; // 🏢 Organization / Institution

  public static final String processTokens(String token) {
    var regex = Pattern.compile(
      "\\[\\s*([A-Za-z]+)\\.([A-Za-z_]+)\\s*\\]",
      Pattern.CASE_INSENSITIVE | Pattern.MULTILINE
    );
    var clazz = PromptSymbols.class;

    return regex
      .matcher(token)
      .replaceAll(s -> {
        try {
          var fieldValue = clazz.getField(s.group(2)).get(null);
          if (fieldValue != null) {
            return fieldValue.toString();
          }
        } catch (NoSuchFieldException | IllegalAccessException e) {}
        return s.group(0); // Return the original token if no match is found
      });
  }
}
