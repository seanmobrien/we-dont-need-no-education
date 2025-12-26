#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function usage() {
  console.log(
    `Usage: node index.cjs --dirs=dir1,dir2 [--dry-run] [--apply] [--create-dts] [--conservative|--no-conservative]\n\nOptions:\n  --dirs        Comma-separated list of directories to operate on (required)\n  --dry-run     Print proposed changes but don't write files (default: true)\n  --apply       Apply changes (clears dry-run)\n  --create-dts  If set, create a sibling .d.ts when none exists (default: false)\n  --conservative If set, only remove JSDoc when sibling .d.ts exists (default: true)\n  --no-conservative Allow creating .d.ts if missing when --create-dts is set\n`,
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dirs: [], dryRun: true, createDts: false, conservative: true };
  for (const a of args) {
    if (a.startsWith('--dirs='))
      out.dirs = a
        .split('=')[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (a === '--dry-run') out.dryRun = true;
    if (a === '--apply') out.dryRun = false;
    if (a === '--create-dts') out.createDts = true;
    if (a === '--no-conservative') out.conservative = false;
    if (a === '--conservative') out.conservative = true;
  }
  if (out.dirs.length === 0) {
    usage();
    process.exit(1);
  }
  return out;
}

function findFilesUnder(dir, exts = ['.ts', '.tsx']) {
  const results = [];
  function walk(cur) {
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        walk(p);
      } else if (e.isFile()) {
        if (exts.includes(path.extname(e.name))) results.push(p);
      }
    }
  }
  walk(dir);
  return results;
}

function getLeadingJSDocForStatement(sourceText, stmt) {
  const comments = ts.getLeadingCommentRanges(sourceText, stmt.pos) || [];
  const blocks = [];
  for (const c of comments) {
    const txt = sourceText.slice(c.pos, c.end);
    if (txt.startsWith('/**')) {
      blocks.push({ pos: c.pos, end: c.end, text: txt });
    }
  }
  return blocks;
}

function isExported(node) {
  return !!(
    node.modifiers &&
    node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function getExportedNamesFromStatement(stmt) {
  const names = [];
  if (ts.isFunctionDeclaration(stmt) && stmt.name) names.push(stmt.name.text);
  else if (ts.isClassDeclaration(stmt) && stmt.name) names.push(stmt.name.text);
  else if (ts.isVariableStatement(stmt)) {
    for (const d of stmt.declarationList.declarations) {
      if (ts.isIdentifier(d.name)) names.push(d.name.text);
    }
  }
  return names;
}

function updateDtsWithJSDoc(dtsPath, exportsWithDocs, options) {
  let dtsText = fs.existsSync(dtsPath)
    ? fs.readFileSync(dtsPath, 'utf8')
    : null;
  const edits = [];
  if (!dtsText) {
    if (!options.createDts) return { created: false, edits: [] };
    dtsText = '';
  }

  for (const item of exportsWithDocs) {
    const name = item.name;
    const jsdoc = item.jsdoc.trim();
    // Properly escape backslashes in the pattern string so the RegExp is valid
    const regex = new RegExp(
      `(^|\\n)(\\s*)(/\\\\*\\\\*[\\s\\S]*?\\\\*\\\\/\\s*)?(export\\s+(declare\\s+)?(function|const|class|interface|type|enum)\\s+${name}\\b)`,
      'm',
    );
    const m = dtsText.match(regex);
    if (m) {
      const existingJsdoc = m[3];
      if (existingJsdoc && existingJsdoc.trim().startsWith('/**')) {
        continue;
      }
      const insertPos =
        m.index + (m[1] ? m[1].length : 0) + (m[2] ? m[2].length : 0);
      const before = dtsText.slice(0, insertPos);
      const after = dtsText.slice(insertPos);
      dtsText = before + jsdoc + '\n' + after;
      edits.push({ action: 'insert-jsdoc', name, path: dtsPath });
    } else {
      if (options.createDts) {
        const declaration = `\n${jsdoc}\nexport const ${name}: any;\n`;
        dtsText += declaration;
        edits.push({ action: 'append-placeholder', name, path: dtsPath });
      }
    }
  }

  if (!options.dryRun && dtsText != null) {
    fs.mkdirSync(path.dirname(dtsPath), { recursive: true });
    fs.writeFileSync(dtsPath, dtsText, 'utf8');
  }
  return { created: dtsText != null, edits };
}

function removeRangesFromText(text, ranges) {
  const sorted = ranges.slice().sort((a, b) => b.pos - a.pos);
  let out = text;
  for (const r of sorted) {
    out = out.slice(0, r.pos) + out.slice(r.end);
  }
  return out;
}

function processFile(filePath, options) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const candidateDocs = [];

  for (const stmt of sourceFile.statements) {
    if (!isExported(stmt)) continue;
    const jsdocs = getLeadingJSDocForStatement(text, stmt);
    if (!jsdocs || jsdocs.length === 0) continue;
    const names = getExportedNamesFromStatement(stmt);
    if (names.length === 0) continue;
    for (const j of jsdocs) {
      candidateDocs.push({
        stmt,
        ranges: { pos: j.pos, end: j.end },
        text: j.text,
        names,
      });
    }
  }

  if (candidateDocs.length === 0) return null;

  const siblingDts = filePath.replace(/\.(ts|tsx)$/, '.d.ts');
  const exportsWithDocs = [];
  for (const c of candidateDocs) {
    const js = c.text + '\n';
    for (const n of c.names) exportsWithDocs.push({ name: n, jsdoc: js });
  }

  const dtsExists = fs.existsSync(siblingDts);
  if (!dtsExists && options.conservative && !options.createDts) {
    return {
      file: filePath,
      dts: siblingDts,
      skipped: true,
      reason: 'no-dts-conservative',
    };
  }

  const updateResult = updateDtsWithJSDoc(siblingDts, exportsWithDocs, options);

  const removedRanges = [];
  if (!options.dryRun) {
    for (const c of candidateDocs)
      removedRanges.push({ pos: c.ranges.pos, end: c.ranges.end });
  }

  if (!options.dryRun && removedRanges.length > 0) {
    const newText = removeRangesFromText(text, removedRanges);
    fs.writeFileSync(filePath, newText, 'utf8');
  }

  return {
    file: filePath,
    dts: siblingDts,
    dtsExists,
    edits: updateResult.edits,
    removed: !options.dryRun ? removedRanges.length : 0,
  };
}

function run(options) {
  const summary = { filesScanned: 0, filesWithJSDoc: 0, plannedChanges: [] };
  for (const d of options.dirs) {
    const abs = path.resolve(d);
    if (!fs.existsSync(abs)) {
      console.warn('Directory not found:', abs);
      continue;
    }
    const files = findFilesUnder(abs, ['.ts', '.tsx']);
    for (const f of files) {
      summary.filesScanned++;
      const res = processFile(f, options);
      if (res) {
        summary.filesWithJSDoc++;
        summary.plannedChanges.push(res);
      }
    }
  }
  return summary;
}

function main() {
  const opts = parseArgs();
  const options = {
    dirs: opts.dirs,
    dryRun: opts.dryRun,
    createDts: opts.createDts,
    conservative: opts.conservative,
  };
  console.log('Options:', options);
  const result = run(options);
  console.log('\nSummary:');
  console.log('Files scanned:', result.filesScanned);
  console.log('Files with leading exported JSDoc:', result.filesWithJSDoc);
  for (const p of result.plannedChanges) {
    console.log('\n- File:', p.file);
    if (p.skipped)
      console.log('  Skipped (no sibling .d.ts and conservative mode).');
    else {
      console.log('  Sibling .d.ts:', p.dts, 'exists=', !!p.dtsExists);
      console.log('  Edits:', p.edits || []);
      console.log(
        '  JSDoc blocks to remove (count):',
        p.removed || (p.edits ? p.edits.length : 0),
      );
    }
  }
  if (options.dryRun)
    console.log('\nDry run: no files modified. Use --apply to write changes.');
}

if (require.main === module) main();
