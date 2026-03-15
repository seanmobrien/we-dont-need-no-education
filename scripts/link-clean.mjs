import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Intentional design decisions:
// - The effective working directory is always the parent of this script's folder.
// - On Windows, prefer PowerShell when either pwsh or powershell is installed; otherwise fall back to bash.
// - Forwarded arguments are preserved for future script options even though the platform scripts do not currently consume them.

const forwardedArgs = process.argv.slice(2);
const isWindows = process.platform === "win32";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const powerShellProbeArgs = [
  "-NoProfile",
  "-Command",
  "$PSVersionTable.PSVersion.ToString()",
];

const getWindowsShellCommand = () => {
  if (!isWindows) {
    return null;
  }

  for (const candidate of ["pwsh", "powershell"]) {
    const probeResult = spawnSync(candidate, powerShellProbeArgs, {
      cwd: repoRoot,
      stdio: "ignore",
      shell: false,
    });

    if (probeResult.status === 0) {
      return candidate;
    }
  }

  return null;
};

const windowsShellCommand = getWindowsShellCommand();
const shellCommand = windowsShellCommand ?? "bash";
const shellArgs = windowsShellCommand
  ? [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve(scriptDir, "clean-link.ps1"),
      ...forwardedArgs,
    ]
  : [resolve(scriptDir, "clean-link.sh"), ...forwardedArgs];

const result = spawnSync(shellCommand, shellArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);