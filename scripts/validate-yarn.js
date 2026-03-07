const path = require("path");

const expected = path.join(".yarn", "releases", "yarn-4.12.0.cjs");
const execPath = process.env.npm_execpath || "";
const userAgent = process.env.npm_config_user_agent || "";
const expectedVersion = "4.12.0";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

// 1️⃣ Ensure we're using Yarn
if (!userAgent.includes("yarn/")) {
  fail("This repository requires Yarn. Do not use npm or pnpm.");
}

// 2️⃣ Ensure we're using the pinned Yarn version.
// Yarn 4 may execute through a temporary shim path, so npm_execpath cannot be relied on.
const versionMatch = userAgent.match(/yarn\/(\d+\.\d+\.\d+)/);
const actualVersion = versionMatch?.[1] || "unknown";

if (actualVersion !== expectedVersion) {
  fail(
    `Incorrect Yarn version detected.\n` +
    `Expected: ${expectedVersion}\n` +
    `Actual:   ${actualVersion}\n` +
    `ExecPath: ${execPath || "(empty)"}\n` +
    `Expected binary path in repo: ${expected}\n\n` +
    `Run: yarn set version ${expectedVersion}`
  );
}

// Hand off to the third-party preinstall script
// require(path.resolve(__dirname, "../preinstall.js"));
