#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(packageRoot, "dist");
const marketplaceRoot = join(packageRoot, "dist-marketplace");
const marketplaceName = "compliance-theater-marketplace";
const pluginName = "compliance-theater-2000";

const requiredPaths = [
  "src/.codex-plugin",
  "src/.mcp.json",
  "src/skills",
  "src/scripts/oauth-mcp-wrapper.ts",
  "src/scripts/runtime-utils.ts",
];

const run = (command, args) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

const assertRequiredInputs = async () => {
  for (const relativePath of requiredPaths) {
    try {
      await stat(join(packageRoot, relativePath));
    } catch (error) {
      throw new Error(`Missing required plugin package input: ${relativePath}`);
    }
  }
};

const writeMarketplace = async () => {
  const marketplace = {
    name: marketplaceName,
    interface: {
      displayName: "Compliance Theater Marketplace",
    },
    plugins: [
      {
        name: pluginName,
        source: {
          source: "local",
          path: `./plugins/${pluginName}`,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };

  const marketplaceFile = join(
    marketplaceRoot,
    ".agents", "plugins", "marketplace.json",
  );
  await mkdir(dirname(marketplaceFile), { recursive: true });
  await writeFile(
    marketplaceFile,
    `${JSON.stringify(marketplace, null, 2)}\n`,
  );
};

const main = async () => {
  await assertRequiredInputs();
  await rm(distRoot, { recursive: true, force: true });
  await rm(marketplaceRoot, { recursive: true, force: true });
  await rm(join(packageRoot, "codex-plugin-workspace.json"), { force: true });
  await rm(join(packageRoot, "tsconfig.tsbuildinfo"), { force: true });
  await run(process.execPath, [
    join(packageRoot, "node_modules", "typescript", "bin", "tsc"),
    "--project",
    "tsconfig.json",
  ]);
  await cp(join(packageRoot, "src", ".codex-plugin"), join(distRoot, ".codex-plugin"), {
    recursive: true,
  });
  await cp(join(packageRoot, "src", ".mcp.json"), join(distRoot, ".mcp.json"));
  await cp(join(packageRoot, "src", "skills"), join(distRoot, "skills"), {
    recursive: true,
  });
  await mkdir(join(marketplaceRoot, "plugins"), { recursive: true });
  await cp(distRoot, join(marketplaceRoot, "plugins", pluginName), {
    recursive: true,
  });
  await writeMarketplace();
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
