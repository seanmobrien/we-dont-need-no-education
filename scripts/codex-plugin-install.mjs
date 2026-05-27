#!/usr/bin/env node

import { access, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const codexPackageName = '@compliance-theater/codex-mcp';
const codexPackageRoot = resolve(repoRoot, 'codex-mcp');
const pluginManifestPath = resolve(codexPackageRoot, 'src', '.codex-plugin', 'plugin.json');
const sourceMarketplaceDir = resolve(codexPackageRoot, 'dist-marketplace');
const sourceCachedPluginDir = resolve(sourceMarketplaceDir, 'plugins', 'compliance_theater_2000');
const targetMarketplaceDir = resolve(homedir(), '.codex', 'plugins', 'compliance-theater-marketplace');
const cachedPluginRootDir = resolve(
  homedir(),
  '.codex',
  'plugins',
  'cache',
  'compliance-theater-marketplace',
  'compliance_theater_2000',
);

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));

  for (const arg of args) {
    if (arg !== '--copy' && arg !== '--help' && arg !== '-h') {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    copy: args.has('--copy'),
    help: args.has('--help') || args.has('-h'),
  };
};

const printHelp = () => {
  console.log('Usage: yarn run codex:deploy [--copy]');
  console.log('');
  console.log('Builds the codex-mcp package and deploys dist-marketplace into ~/.codex/plugins/compliance-theater-marketplace.');
  console.log('--copy    Also repopulate ~/.codex/plugins/cache/compliance-theater-marketplace/compliance-theater-2000 from the compiled plugin output.');
};

const run = (command, args, cwd) =>
  new Promise((resolvePromise, reject) => {
    const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : command;
    const spawnArgs = process.platform === 'win32'
      ? ['/d', '/s', '/c', command, ...args]
      : args;

    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const ensureReadable = async (path) => {
  await access(path, fsConstants.R_OK);
};

const readPluginVersion = async () => {
  const manifestText = await readFile(pluginManifestPath, 'utf8');
  const manifest = JSON.parse(manifestText);
  const version = manifest?.version;

  if (!version || typeof version !== 'string') {
    throw new Error(`Plugin manifest at ${pluginManifestPath} is missing a valid version string`);
  }

  return version;
};

const main = async () => {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  console.log(`Building ${codexPackageName}...`);
  await run('yarn', ['workspace', codexPackageName, 'build'], repoRoot);

  console.log(`Verifying build output at ${sourceMarketplaceDir}...`);
  await ensureReadable(sourceMarketplaceDir);

  const pluginVersion = await readPluginVersion();
  const cachedPluginVersionDir = resolve(cachedPluginRootDir, pluginVersion);

  console.log(`Removing deployed marketplace at ${targetMarketplaceDir}...`);
  await rm(targetMarketplaceDir, { recursive: true, force: true });

  console.log(`Copying ${sourceMarketplaceDir} to ${targetMarketplaceDir}...`);
  await mkdir(dirname(targetMarketplaceDir), { recursive: true });
  await cp(sourceMarketplaceDir, targetMarketplaceDir, { recursive: true });

  console.log(`Removing cached plugin versions at ${cachedPluginRootDir}...`);
  await rm(cachedPluginRootDir, { recursive: true, force: true });

  if (options.copy) {
    console.log(`Verifying compiled plugin output at ${sourceCachedPluginDir}...`);
    await ensureReadable(sourceCachedPluginDir);

    console.log(`Copying ${sourceCachedPluginDir} to ${cachedPluginVersionDir}...`);
    await mkdir(dirname(cachedPluginVersionDir), { recursive: true });
    await cp(sourceCachedPluginDir, cachedPluginVersionDir, { recursive: true });
  }

  console.log('Codex plugin deploy complete.');
};

main().catch((error) => {
  console.error(`codex-plugin-install failed: ${error?.message || String(error)}`);
  process.exit(1);
});