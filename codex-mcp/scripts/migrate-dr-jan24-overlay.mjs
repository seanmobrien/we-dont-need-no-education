#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const workspaceRoot = "D:/repos/no-ed.codex/agency_complaints_work/record-correction/dr_jan24_drthomasresponse";
const workspaceKey = "dr_jan24_drthomasresponse";
const migrationSource = "dr_jan24_drthomasresponse_workspace_migration";
const activeCorrectionIds = [
  "DRT-001-A",
  "DRT-002-A",
  "DRT-003-A",
  "DRT-004-A",
  "DRT-005-A",
  "DRT-006-A",
  "DRT-006-B",
  "DRT-007-A",
];
const assertionStatus = {
  "DRT-001-A": "correction_ready_with_caveat",
  "DRT-002-A": "correction_ready_with_caveat",
  "DRT-003-A": "correction_ready_with_caveat",
  "DRT-004-A": "correction_ready_with_caveat",
  "DRT-005-A": "research_required",
  "DRT-006-A": "research_required",
  "DRT-006-B": "research_required",
  "DRT-007-A": "draft",
};
const issueToCorrection = {
  "DRT-001": "DRT-001-A",
  "DRT-002": "DRT-002-A",
  "DRT-003": "DRT-003-A",
  "DRT-004": "DRT-004-A",
  "DRT-005": "DRT-005-A",
  "DRT-006": "DRT-006-A",
  "DRT-007": "DRT-007-A",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((candidate) => candidate.some((cell) => cell !== ""));
  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""])));
}

function splitMarkdownTableLine(line) {
  const trimmed = line.trim();
  const body = trimmed.startsWith("|") ? trimmed.slice(1, -1) : trimmed;
  return body.split("|").map((cell) => cell.trim().replace(/^`|`$/g, ""));
}

function parseMarkdownTable(text, expectedFirstHeader) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("|") && splitMarkdownTableLine(line)[0] === expectedFirstHeader);
  if (headerIndex < 0) {
    return [];
  }
  const headers = splitMarkdownTableLine(lines[headerIndex]);
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.trim().startsWith("|")) {
      break;
    }
    const cells = splitMarkdownTableLine(line);
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
  }
  return rows;
}

async function readText(relativePath) {
  return readFile(join(workspaceRoot, relativePath), "utf8");
}

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function numberOrNull(value) {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function workspacePath(relativePath) {
  return `agency_complaints_work/record-correction/dr_jan24_drthomasresponse/${relativePath.replaceAll("\\", "/")}`;
}

function createMcpClient() {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const child = spawn(process.execPath, ["./dist/scripts/entrypoint.js"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      MCP_COMPLIANCE_THEATER_RESOURCE_TOOLSET: "search",
      MCP_COMPLIANCE_THEATER_RESOURCE_LOG_FILE: join(workspaceRoot, "neo4j_workspace_overlay_mcp.log"),
    },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const pending = new Map();
  let nextId = 1;
  let buffer = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let lineEnd;
    while ((lineEnd = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line) {
        continue;
      }
      const message = JSON.parse(line);
      const request = pending.get(message.id);
      if (!request) {
        continue;
      }
      pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(message.error.message || JSON.stringify(message.error)));
      } else {
        request.resolve(message.result ?? {});
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code, signal) => {
    const error = new Error(`Compliance Theater search MCP exited (code ${code ?? "unknown"}, signal ${signal ?? "none"}).`);
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  });

  function request(method, params = {}, timeoutMs = 360000) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for MCP ${method}.`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async function initialize() {
    await request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "dr_jan24_overlay_migrator", version: "0.1.0" },
    }, 30000);
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`);
  }

  async function callTool(name, args = {}) {
    return request("tools/call", { name, arguments: args });
  }

  return {
    initialize,
    listTools: () => request("tools/list", {}, 30000),
    graphRead: (query, params = {}) => callTool("compliance_theater_search_graph_read", { query, params }),
    graphWrite: (query, params = {}) => callTool("compliance_theater_search_graph_write", { query, params }),
    close: () => {
      child.stdin.end();
      child.kill();
    },
  };
}

let mcp;

async function graphWrite(query, params = {}) {
  return mcp.graphWrite(query, params);
}

async function graphRead(query, params = {}) {
  return mcp.graphRead(query, params);
}

function resultRows(result) {
  const text = result?.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return [];
  }
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function correctionFolderFor(id, indexByIssue) {
  const issueId = id.replace(/-[A-Z]$/, "");
  return indexByIssue.get(issueId)?.folder ?? "";
}

async function main() {
  mcp = createMcpClient();
  await mcp.initialize();
  const tools = await mcp.listTools();
  const toolNames = tools.tools?.map((tool) => tool.name) ?? [];
  if (!toolNames.includes("compliance_theater_search_graph_write")) {
    throw new Error(`Compliance Theater search MCP did not expose graph_write. Tools: ${toolNames.join(", ")}`);
  }

  const [
    indexRows,
    statusRows,
    vulnerableStatementsText,
    followupActionsText,
    exhibitManifestText,
  ] = await Promise.all([
    readText("index.csv").then(parseCsv),
    readText("correction_evidence_enrichment_status.csv").then(parseCsv),
    readText("vulnerable_statements.md"),
    readText("followup_actions.md"),
    readText("exhibit_manifest.md"),
  ]);

  const indexByIssue = new Map(indexRows.map((row) => [row.issue_id, row]));
  const statusByCorrection = new Map(statusRows.map((row) => [row.correction_id, row]));
  const vulnerableById = new Map(parseMarkdownTable(vulnerableStatementsText, "ID").map((row) => [row.ID, row]));
  const followupRows = parseMarkdownTable(followupActionsText, "action_id");
  const exhibitRows = parseMarkdownTable(exhibitManifestText, "Exhibit ID");

  await graphWrite(`
MERGE (w:CorrectionWorkspace {workspace_key: $workspace_key})
SET w.title = $title,
    w.status = 'active_draft_overlay',
    w.source_path = $source_path,
    w.created_from = 'local_workspace_migration',
    w.assertion_status = 'draft_overlay',
    w.updated_at = datetime()
RETURN w.workspace_key AS workspace_key
`, {
    workspace_key: workspaceKey,
    title: workspaceKey,
    source_path: "agency_complaints_work/record-correction/dr_jan24_drthomasresponse",
  });

  const correctionPoints = activeCorrectionIds.map((correctionId) => {
    const issueId = correctionId.replace(/-[A-Z]$/, "");
    const indexRow = indexByIssue.get(issueId) ?? {};
    const statusRow = statusByCorrection.get(correctionId) ?? {};
    const vulnerable = vulnerableById.get(correctionId) ?? {};
    const folder = indexRow.folder ?? statusRow.folder ?? "";
    return {
      correction_id: correctionId,
      folder,
      target_area: clean(indexRow.target_area),
      short_description: clean(indexRow.short_description),
      status: clean(statusRow.status || indexRow.status),
      priority: clean(indexRow.priority),
      correction_warrant_score: numberOrNull(statusRow.correction_warrant_score || indexRow.correction_warrant_score),
      evidence_posture: clean(vulnerable["Evidence posture"]),
      proposed_correction_theory: clean(vulnerable["Proposed correction theory"]),
      target_statement: clean(vulnerable["Target statement / premise"]),
      why_vulnerable: clean(vulnerable["Why vulnerable"]),
      primary_sources: clean(indexRow.primary_sources),
      related_theory_refs: clean(indexRow.related_theory_refs),
      next_step: clean(statusRow.next_step || indexRow.next_step),
      source_path: workspacePath(folder ? `${folder}/CORRECTION.md` : "vulnerable_statements.md"),
      workspace_key: workspaceKey,
      assertion_status: assertionStatus[correctionId],
      created_from: migrationSource,
    };
  });

  await graphWrite(`
MATCH (w:CorrectionWorkspace {workspace_key: $workspace_key})
UNWIND $points AS point
MERGE (p:CorrectionPointDraft {workspace_key: $workspace_key, correction_id: point.correction_id})
SET p += point,
    p.updated_at = datetime()
MERGE (w)-[:HAS_CORRECTION_POINT_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'draft'
}]->(p)
WITH p, point
MERGE (s:TargetStatementDraft {workspace_key: $workspace_key, target_statement_id: point.correction_id + ':target'})
SET s.correction_id = point.correction_id,
    s.statement_text = point.target_statement,
    s.why_vulnerable = point.why_vulnerable,
    s.source_path = 'agency_complaints_work/record-correction/dr_jan24_drthomasresponse/vulnerable_statements.md',
    s.workspace_key = $workspace_key,
    s.assertion_status = point.assertion_status,
    s.created_from = $created_from,
    s.updated_at = datetime()
MERGE (p)-[:TARGETS_STATEMENT_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'draft'
}]->(s)
WITH p, point
MERGE (cure:ProposedCureDraft {workspace_key: $workspace_key, proposed_cure_id: point.correction_id + ':cure'})
SET cure.correction_id = point.correction_id,
    cure.proposed_correction_theory = point.proposed_correction_theory,
    cure.next_step = point.next_step,
    cure.source_path = 'agency_complaints_work/record-correction/dr_jan24_drthomasresponse/vulnerable_statements.md',
    cure.workspace_key = $workspace_key,
    cure.assertion_status = point.assertion_status,
    cure.created_from = $created_from,
    cure.updated_at = datetime()
MERGE (p)-[:HAS_PROPOSED_CURE_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'draft'
}]->(cure)
`, { workspace_key: workspaceKey, created_from: migrationSource, points: correctionPoints });

  const evidenceRows = [];
  for (const correctionId of activeCorrectionIds) {
    const folder = correctionFolderFor(correctionId, indexByIssue);
    if (!folder) {
      continue;
    }
    try {
      const sourceRows = parseCsv(await readText(`${folder}/source_evidence.csv`));
      sourceRows.forEach((row, index) => {
        evidenceRows.push({
          evidence_use_id: `${correctionId}:row:${String(index + 1).padStart(3, "0")}`,
          correction_id: correctionId,
          evidence_rank: clean(row.evidence_rank),
          discovery_method: clean(row.discovery_method),
          neo4j_case_file_id: clean(row.neo4j_case_file_id),
          neo4j_node_labels: clean(row.neo4j_node_labels),
          neo4j_score: numberOrNull(row.neo4j_score),
          email_id: clean(row.email_id),
          thread_id: clean(row.thread_id),
          sender: clean(row.sender),
          date: clean(row.date),
          subject: clean(row.subject),
          source_file: clean(row.source_file),
          source_line_or_locator: clean(row.source_line_or_locator),
          quoted_or_paraphrased_statement: clean(row.quoted_or_paraphrased_statement),
          evidence_description: clean(row.evidence_description),
          why_it_supports_correction: clean(row.why_it_supports_correction),
          followup_needed: clean(row.followup_needed),
          source_path: workspacePath(`${folder}/source_evidence.csv`),
          source_resolution_status: clean(row.neo4j_case_file_id) ? "pending_graph_link" : "local_only_pending_graph_link",
          workspace_key: workspaceKey,
          assertion_status: "draft_evidence_use",
          created_from: migrationSource,
        });
      });
    } catch {
      // Some research-required points have no source evidence yet.
    }
  }

  if (evidenceRows.length) {
    await graphWrite(`
UNWIND $rows AS row
MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key, correction_id: row.correction_id})
MERGE (eu:EvidenceUseDraft {workspace_key: $workspace_key, evidence_use_id: row.evidence_use_id})
SET eu += row,
    eu.updated_at = datetime()
MERGE (p)-[:USES_EVIDENCE_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'draft'
}]->(eu)
WITH eu, row
OPTIONAL MATCH (src:case_file_document)
WHERE toString(src.case_file) = row.neo4j_case_file_id
FOREACH (_ IN CASE WHEN src IS NULL THEN [] ELSE [1] END |
  MERGE (eu)-[:REFERENCES_SOURCE {
    workspace_key: $workspace_key,
    assertion_status: 'draft_reference'
  }]->(src)
  SET eu.source_resolution_status = 'linked_to_case_file'
)
FOREACH (_ IN CASE WHEN src IS NULL AND row.neo4j_case_file_id <> '' THEN [1] ELSE [] END |
  SET eu.source_resolution_status = 'graph_case_file_not_found'
)
`, { workspace_key: workspaceKey, rows: evidenceRows });
  }

  const caveats = [
    ["DRT-004-A", "lawful_redaction_possible", "Lawful redaction may cover names, identifiers, other-student discipline, personnel data, privileged material, or mixed records."],
    ["DRT-003-A", "dec6_not_perfect_label", "DRT-003 Dec. 6 was not perfectly labeled as a statutory correction request."],
    ["DRT-003-A", "file4_ocr_redaction_limited", "File 4 source-note page is OCR/redaction limited and says six times, not a clean five-times source."],
    ["DRT-004-A", "redaction_metrics_limited", "DRT-004 PST index metrics are 18.31 and 10.71; do not describe those two PDF-level rows as more than 80 percent redacted."],
    ["DRT-003-A", "notice_audit_scope", "Incident-correction appeal/hearing notice audit is limited to the Jan. 8/Jan. 24 Dr. Thomas incident-correction cluster."],
    ["DRT-004-A", "counsel_notice_conditional", "Counsel notice theory remains conditional until records show specific counsel review/access."],
  ].map(([correction_id, key, text]) => ({
    caveat_id: `${correction_id}:${key}`,
    correction_id,
    caveat_key: key,
    caveat_text: text,
    source_path: "agency_complaints_work/record-correction/dr_jan24_drthomasresponse/neo4j_workspace_overlay_handoff.md",
    workspace_key: workspaceKey,
    assertion_status: "draft",
    created_from: migrationSource,
  }));

  await graphWrite(`
UNWIND $caveats AS row
MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key, correction_id: row.correction_id})
MERGE (c:CaveatDraft {workspace_key: $workspace_key, caveat_id: row.caveat_id})
SET c += row,
    c.updated_at = datetime()
MERGE (p)-[:HAS_CAVEAT_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'draft'
}]->(c)
`, { workspace_key: workspaceKey, caveats });

  const tasks = followupRows.map((row) => ({
    action_id: clean(row.action_id),
    source_correction: clean(row.source_correction),
    action_type: clean(row.action_type),
    priority: clean(row.priority),
    status: clean(row.status),
    requested_or_staged_records: clean(row.requested_or_staged_records),
    why_it_matters: clean(row.why_it_matters),
    source_hook: clean(row.source_hook),
    source_path: "agency_complaints_work/record-correction/dr_jan24_drthomasresponse/followup_actions.md",
    workspace_key: workspaceKey,
    assertion_status: "research_required",
    created_from: migrationSource,
  })).filter((row) => row.action_id);

  await graphWrite(`
UNWIND $tasks AS row
MERGE (task:ResearchTaskDraft {workspace_key: $workspace_key, action_id: row.action_id})
SET task += row,
    task.updated_at = datetime()
WITH task, row
MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key})
WHERE row.source_correction CONTAINS p.correction_id
   OR row.source_correction CONTAINS replace(p.correction_id, '-A', '')
   OR row.source_correction CONTAINS replace(p.correction_id, '-B', '')
MERGE (p)-[:NEEDS_RESEARCH_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'research_required'
}]->(task)
`, { workspace_key: workspaceKey, tasks });

  const exhibits = exhibitRows.map((row, index) => ({
    exhibit_candidate_id: clean(row.exhibit_id || row["Exhibit ID"] || row.id || `exhibit:${String(index + 1).padStart(3, "0")}`),
    title: clean(row.title || row.Source || row.exhibit || row.description),
    source_correction: clean(row.source_correction || row.correction_id || row.correction),
    status: clean(row.status),
    source_file: clean(row.source_file || row["Staged copy / source path"] || row.path || row.source),
    purpose: clean(row.Purpose),
    notes: clean(row.notes || row.why_it_matters || row.description || row.Purpose),
    source_path: "agency_complaints_work/record-correction/dr_jan24_drthomasresponse/exhibit_manifest.md",
    workspace_key: workspaceKey,
    assertion_status: "candidate",
    created_from: migrationSource,
  })).filter((row) => row.exhibit_candidate_id);

  if (exhibits.length) {
    await graphWrite(`
UNWIND $exhibits AS row
MERGE (exhibit:ExhibitCandidateDraft {workspace_key: $workspace_key, exhibit_candidate_id: row.exhibit_candidate_id})
SET exhibit += row,
    exhibit.updated_at = datetime()
WITH exhibit, row
OPTIONAL MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key})
WHERE row.source_correction CONTAINS p.correction_id
   OR row.source_correction CONTAINS replace(p.correction_id, '-A', '')
   OR row.source_correction CONTAINS replace(p.correction_id, '-B', '')
FOREACH (_ IN CASE WHEN p IS NULL THEN [] ELSE [1] END |
  MERGE (p)-[:HAS_EXHIBIT_CANDIDATE_DRAFT {
    workspace_key: $workspace_key,
    assertion_status: 'candidate'
  }]->(exhibit)
)
`, { workspace_key: workspaceKey, exhibits });
  }

  const theoryRefs = correctionPoints.flatMap((point) => clean(point.related_theory_refs).split(";").map((ref) => clean(ref)).filter(Boolean).map((ref) => ({
    case_theory_draft_id: ref,
    correction_id: point.correction_id,
    source_path: ref,
    workspace_key: workspaceKey,
    assertion_status: "candidate",
    created_from: migrationSource,
  })));

  if (theoryRefs.length) {
    await graphWrite(`
UNWIND $refs AS row
MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key, correction_id: row.correction_id})
MERGE (theory:CaseTheoryDraft {workspace_key: $workspace_key, case_theory_draft_id: row.case_theory_draft_id})
SET theory += row,
    theory.updated_at = datetime()
MERGE (p)-[:CROSS_LINKS_CORRECTION_DRAFT {
  workspace_key: $workspace_key,
  assertion_status: 'candidate'
}]->(theory)
`, { workspace_key: workspaceKey, refs: theoryRefs });
  }

  const validation = {
    correctionCount: resultRows(await graphRead(`
MATCH (p:CorrectionPointDraft {workspace_key: $workspace_key})
RETURN count(p) AS correction_points
`, { workspace_key: workspaceKey })),
    accidentalEstablishedLabels: resultRows(await graphRead(`
MATCH (n {workspace_key: $workspace_key})
WHERE n:Violation OR n:EstablishedFinding
RETURN labels(n) AS labels, n
`, { workspace_key: workspaceKey })),
    evidenceCoverage: resultRows(await graphRead(`
MATCH (eu:EvidenceUseDraft {workspace_key: $workspace_key})
RETURN
  count(eu) AS evidence_uses,
  sum(CASE WHEN EXISTS { (eu)-[:REFERENCES_SOURCE]->(:case_file_document) } THEN 1 ELSE 0 END) AS linked_to_case_file,
  sum(CASE WHEN eu.source_resolution_status = 'local_only_pending_graph_link' THEN 1 ELSE 0 END) AS local_only,
  sum(CASE WHEN eu.source_resolution_status = 'graph_case_file_not_found' THEN 1 ELSE 0 END) AS graph_case_file_not_found
`, { workspace_key: workspaceKey })),
    draftInventory: resultRows(await graphRead(`
MATCH (n {workspace_key: $workspace_key})
RETURN labels(n) AS labels, n.assertion_status AS assertion_status, count(*) AS count
ORDER BY labels, assertion_status
`, { workspace_key: workspaceKey })),
  };

  const log = {
    migrated_at: new Date().toISOString(),
    workspace_key: workspaceKey,
    counts: {
      correction_points: correctionPoints.length,
      evidence_uses_input_rows: evidenceRows.length,
      caveats: caveats.length,
      research_tasks: tasks.length,
      exhibit_candidates: exhibits.length,
      case_theory_refs: theoryRefs.length,
    },
    validation,
    skipped: {
      missing_source_evidence_csv: activeCorrectionIds.filter((id) => {
        const folder = correctionFolderFor(id, indexByIssue);
        return folder && !["DRT-001-A", "DRT-002-A", "DRT-003-A", "DRT-004-A"].includes(id);
      }),
    },
  };

  const logPath = join(workspaceRoot, `neo4j_workspace_overlay_migration_log_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ logPath, ...log }, null, 2));
  mcp.close();
  process.exit(0);
}

main().catch((error) => {
  if (mcp) {
    mcp.close();
  }
  console.error(error.stack || error.message);
  process.exit(1);
});
